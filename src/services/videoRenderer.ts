import { TimelineClip, StudioImage, AudioTrackData, VideoEffectType, TransitionType } from '../types';

export interface RenderOptions {
  clips: TimelineClip[];
  images: Map<string, HTMLImageElement>;
  audioTrack?: AudioTrackData | null;
  totalDuration: number;
  resolution: '720p' | '1080p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1';
  watermark: boolean;
  watermarkText?: string;
  creatorCredit?: string;
  onProgress?: (progress: number, statusText: string) => void;
}

export class VideoRenderer {
  /**
   * Render real video file with synchronized audio and return download Blob
   */
  public static async renderVideo(options: RenderOptions): Promise<Blob> {
    const {
      clips,
      images,
      audioTrack,
      totalDuration,
      resolution,
      aspectRatio,
      watermark,
      watermarkText = 'Niksa AI Studio • Ahmad Samim Rahmani',
      onProgress,
    } = options;

    if (clips.length === 0) {
      throw new Error('No clips to render');
    }

    // Determine target canvas pixel dimensions
    let width = 1280;
    let height = 720;
    if (resolution === '1080p') {
      width = 1920;
      height = 1080;
    } else if (resolution === '4k') {
      width = 2560;
      height = 1440;
    }

    if (aspectRatio === '9:16') {
      const temp = width;
      width = height;
      height = temp;
    } else if (aspectRatio === '1:1') {
      const min = Math.min(width, height);
      width = min;
      height = min;
    }

    // Create offscreen rendering canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get canvas context for video export');

    onProgress?.(0.05, 'Configuring media encoder & audio destination...');

    // Setup Audio Stream
    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

    if (audioTrack?.audioBuffer) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtxClass();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      mediaStreamDestination = audioContext.createMediaStreamDestination();
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioTrack.audioBuffer;
      audioSource.connect(mediaStreamDestination);
    }

    // Capture Video Stream from Canvas
    const fps = 30;
    const canvasStream = canvas.captureStream(fps);

    // Combine Video and Audio tracks
    const combinedTracks: MediaStreamTrack[] = [
      ...canvasStream.getVideoTracks(),
    ];
    if (mediaStreamDestination) {
      combinedTracks.push(...mediaStreamDestination.stream.getAudioTracks());
    }
    const combinedStream = new MediaStream(combinedTracks);

    // Determine supported mime type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: resolution === '4k' ? 12000000 : resolution === '1080p' ? 8000000 : 4000000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    return new Promise<Blob>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        try {
          if (audioSource) {
            try { audioSource.stop(); } catch {}
          }
          if (audioContext) {
            audioContext.close();
          }
          const finalBlob = new Blob(recordedChunks, {
            type: mimeType.includes('mp4') ? 'video/mp4' : 'video/webm',
          });
          onProgress?.(1, 'Export complete!');
          resolve(finalBlob);
        } catch (e) {
          reject(e);
        }
      };

      mediaRecorder.onerror = (e) => reject(e);

      // Start recording
      mediaRecorder.start(250);
      if (audioSource) {
        audioSource.start(0);
      }

      const startTime = performance.now();
      const durationMs = totalDuration * 1000;

      // Render loop frame by frame
      const frameInterval = 1000 / fps;
      let currentTime = 0;

      const renderIntervalId = setInterval(() => {
        try {
          currentTime = (performance.now() - startTime) / 1000;
          const progress = Math.min(currentTime / totalDuration, 1);
          onProgress?.(
            progress * 0.9,
            `Encoding frame at ${currentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s (${Math.round(progress * 100)}%)`
          );

          // Draw current frame to canvas
          this.drawFrameAtTime(ctx, width, height, currentTime, clips, images, watermark, watermarkText);

          if (currentTime >= totalDuration) {
            clearInterval(renderIntervalId);
            setTimeout(() => {
              if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              }
            }, 300);
          }
        } catch (renderErr) {
          clearInterval(renderIntervalId);
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
          reject(renderErr);
        }
      }, frameInterval);
    });
  }

  /**
   * Draw a single video frame at the exact playhead timestamp
   */
  public static drawFrameAtTime(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    clips: TimelineClip[],
    images: Map<string, HTMLImageElement>,
    watermark: boolean = true,
    watermarkText: string = 'Niksa AI Studio • Ahmad Samim Rahmani'
  ) {
    // Clear canvas
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Find current clip
    const currentClipIndex = clips.findIndex(
      (c) => time >= c.startTime && time <= c.endTime
    );

    if (currentClipIndex === -1 && clips.length > 0) {
      // Fallback to first or last clip if slightly out of bounds
      const fallbackClip = time < clips[0].startTime ? clips[0] : clips[clips.length - 1];
      this.drawClip(ctx, width, height, fallbackClip, images, 0);
    } else if (currentClipIndex !== -1) {
      const currentClip = clips[currentClipIndex];
      const clipElapsed = time - currentClip.startTime;
      const clipProgress = Math.max(0, Math.min(1, clipElapsed / currentClip.duration));

      // Check if transitioning to next clip
      const transitionWindow = currentClip.transitionDuration || 0.8;
      const isTransitioning =
        currentClipIndex < clips.length - 1 &&
        time >= currentClip.endTime - transitionWindow;

      if (isTransitioning) {
        const nextClip = clips[currentClipIndex + 1];
        const transProgress = (time - (currentClip.endTime - transitionWindow)) / transitionWindow;

        // Draw background base (next clip)
        ctx.save();
        this.drawClip(ctx, width, height, nextClip, images, 0);
        ctx.restore();

        // Draw foreground clip with transition alpha or transform
        ctx.save();
        if (currentClip.transition === 'slide-left') {
          ctx.translate(-transProgress * width, 0);
          this.drawClip(ctx, width, height, currentClip, images, clipProgress);
        } else if (currentClip.transition === 'slide-right') {
          ctx.translate(transProgress * width, 0);
          this.drawClip(ctx, width, height, currentClip, images, clipProgress);
        } else if (currentClip.transition === 'zoom-in') {
          const scale = 1 + transProgress * 0.4;
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-width / 2, -height / 2);
          ctx.globalAlpha = 1 - transProgress;
          this.drawClip(ctx, width, height, currentClip, images, clipProgress);
        } else if (currentClip.transition === 'fade-black') {
          this.drawClip(ctx, width, height, currentClip, images, clipProgress);
          ctx.fillStyle = '#000000';
          ctx.globalAlpha = Math.sin(transProgress * Math.PI);
          ctx.fillRect(0, 0, width, height);
        } else {
          // Standard cross-dissolve
          ctx.globalAlpha = 1 - transProgress;
          this.drawClip(ctx, width, height, currentClip, images, clipProgress);
        }
        ctx.restore();
      } else {
        // Normal single clip rendering
        this.drawClip(ctx, width, height, currentClip, images, clipProgress);
      }
    }

    // Optional Studio Watermark
    if (watermark) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(width - 340, height - 44, 320, 32);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 340, height - 44, 320, 32);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('NIKSA AI STUDIO', width - 325, height - 24);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('• Ahmad Samim Rahmani', width - 210, height - 24);
      ctx.restore();
    }
  }

  /**
   * Draw a single clip with Ken Burns motion, scale, rotation, and center crop
   */
  private static drawClip(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    clip: TimelineClip,
    images: Map<string, HTMLImageElement>,
    progress: number
  ) {
    const img = images.get(clip.imageId);
    if (!img) {
      // Placeholder styled gradient box
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading image asset...', canvasW / 2, canvasH / 2);
      return;
    }

    ctx.save();
    ctx.globalAlpha = clip.opacity ?? 1;

    // Calculate Cover Aspect Ratio
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = canvasW / canvasH;
    let drawW = canvasW;
    let drawH = canvasH;

    if (imgAspect > canvasAspect) {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
    } else {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
    }

    // Apply Ken Burns and Dynamic Effects
    let motionScale = clip.scale ?? 1;
    let motionX = clip.x ?? 0;
    let motionY = clip.y ?? 0;
    let rotation = clip.rotation ?? 0;

    switch (clip.effect) {
      case 'ken-burns-in':
        motionScale *= 1 + progress * 0.14;
        motionX += progress * 15;
        motionY += progress * 10;
        break;
      case 'ken-burns-out':
        motionScale *= 1.14 - progress * 0.14;
        motionX -= progress * 15;
        motionY -= progress * 10;
        break;
      case 'pan-right':
        motionScale *= 1.08;
        motionX += (progress - 0.5) * 60;
        break;
      case 'pan-left':
        motionScale *= 1.08;
        motionX -= (progress - 0.5) * 60;
        break;
      case 'cinematic-drift':
        motionScale *= 1 + Math.sin(progress * Math.PI) * 0.08;
        motionX += Math.cos(progress * Math.PI) * 20;
        break;
      case 'subtle-pulse':
        motionScale *= 1 + Math.sin(progress * Math.PI * 4) * 0.025;
        break;
      case 'shake':
        motionX += (Math.random() - 0.5) * 6;
        motionY += (Math.random() - 0.5) * 6;
        break;
    }

    // Apply translation to center
    ctx.translate(canvasW / 2 + motionX, canvasH / 2 + motionY);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.scale(motionScale, motionScale);

    // Apply filters
    if (clip.filter === 'warm-cinematic') {
      ctx.filter = 'contrast(1.15) saturate(1.25) sepia(0.2)';
    } else if (clip.filter === 'noir') {
      ctx.filter = 'grayscale(1) contrast(1.35)';
    } else if (clip.filter === 'glow') {
      ctx.filter = 'brightness(1.1) saturate(1.4)';
    } else if (clip.filter === 'vhs-retro') {
      ctx.filter = 'contrast(1.2) hue-rotate(15deg) saturate(1.3)';
    } else {
      ctx.filter = 'none';
    }

    // Draw centered image
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
