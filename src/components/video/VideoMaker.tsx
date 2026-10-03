import React, { useState, useRef, useEffect } from 'react';
import {
  StudioImage,
  AudioTrackData,
  TimelineClip,
  VideoProject,
  VideoEffectType,
  TransitionType,
  AppSettings,
} from '../../types';
import { AudioAnalysisService } from '../../services/audioAnalysisService';
import { TimelineDirectorService } from '../../services/timelineDirectorService';
import { VideoRenderer } from '../../services/videoRenderer';
import { ImageProcessingService } from '../../services/imageProcessingService';
import { SampleDataService } from '../../services/sampleDataService';
import {
  Upload,
  Music,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Sliders,
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  VolumeX,
  Layers,
  Wand2,
  Move,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Undo2,
  Redo2,
  Magnet,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';

interface VideoMakerProps {
  initialImages: StudioImage[];
  onSaveProject: (project: VideoProject) => void;
  onNavigateToGenerator: () => void;
  settings: AppSettings;
}

export const VideoMaker: React.FC<VideoMakerProps> = ({
  initialImages,
  onSaveProject,
  onNavigateToGenerator,
  settings,
}) => {
  // State
  const [images, setImages] = useState<StudioImage[]>(initialImages);
  const [audioTrack, setAudioTrack] = useState<AudioTrackData | null>(null);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = fit, >1 = zoomed
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [projectTitle, setProjectTitle] = useState<string>('Niksa Cinematic Video');

  // Manual Editing States
  const [history, setHistory] = useState<TimelineClip[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [snapIndicator, setSnapIndicator] = useState<{ time: number; x: number; label: string } | null>(null);
  const [isReplacingImageForClipId, setIsReplacingImageForClipId] = useState<string | null>(null);

  // Dragging & Interaction Refs
  const dragOperationRef = useRef<{
    type: 'move' | 'resize-left' | 'resize-right';
    clipId: string;
    startPointerX: number;
    initialStartTime: number;
    initialEndTime: number;
    initialDuration: number;
    initialScrollLeft: number;
  } | null>(null);
  const isScrubbingPlayheadRef = useRef<boolean>(false);

  // DOM Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imageElementsMap = useRef<Map<string, HTMLImageElement>>(new Map());

  // Total duration of timeline is governed by audio duration if available, or clips sum
  const maxClipEnd = clips.reduce((max, c) => Math.max(max, c.endTime), 0);
  const totalDuration = Math.max(audioTrack?.duration || 0, maxClipEnd, 10);

  // Timeline Scale & Width (Continuous horizontal scrolling for any project duration, e.g. 5 minutes)
  const pixelsPerSecond = Math.max(20, 50 * zoomLevel);
  const timelineTrackWidth = Math.max(1000, totalDuration * pixelsPerSecond + 200);

  // Time formatter: MM:SS.mmm (High precision)
  const formatTimeDetailed = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const millis = Math.floor((s - Math.floor(s)) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  // Push to Undo/Redo History Stack
  const pushHistory = (newClips: TimelineClip[]) => {
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(JSON.parse(JSON.stringify(newClips)));
      if (nextHistory.length > 40) nextHistory.shift();
      return nextHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 39));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setClips(JSON.parse(JSON.stringify(targetState)));
      setStatusMessage('Undo performed');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setClips(JSON.parse(JSON.stringify(targetState)));
      setStatusMessage('Redo performed');
    }
  };

  // Snapping Calculator
  const findSnapPoint = (
    targetTime: number,
    currentClipId: string,
    thresholdSec: number = 0.25
  ): { time: number; label: string } | null => {
    if (!isSnapEnabled) return null;

    const snapCandidates: { time: number; label: string }[] = [];
    snapCandidates.push({ time: 0, label: '00:00' });
    snapCandidates.push({ time: totalDuration, label: 'End' });
    snapCandidates.push({ time: currentTime, label: 'Playhead' });

    clips.forEach((c) => {
      if (c.id !== currentClipId) {
        snapCandidates.push({ time: c.startTime, label: 'Clip Start' });
        snapCandidates.push({ time: c.endTime, label: 'Clip End' });
      }
    });

    if (audioTrack?.sections) {
      audioTrack.sections.forEach((sec) => {
        snapCandidates.push({ time: sec.startTime, label: sec.sectionName });
        snapCandidates.push({ time: sec.endTime, label: sec.sectionName });
      });
    }

    let closest: { time: number; label: string; diff: number } | null = null;
    for (const cand of snapCandidates) {
      const diff = Math.abs(cand.time - targetTime);
      if (diff <= thresholdSec) {
        if (!closest || diff < closest.diff) {
          closest = { ...cand, diff };
        }
      }
    }

    return closest ? { time: closest.time, label: closest.label } : null;
  };

  // Keyboard Shortcuts: Space (Play/Pause), Delete/Backspace (Delete clip), Ctrl+Z (Undo), Ctrl+Shift+Z/Ctrl+Y (Redo), S (Split), ArrowLeft/Right (Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitClipAtPlayhead();
      } else if (e.code === 'ArrowLeft' && selectedClipId) {
        e.preventDefault();
        handleNudgeClip('left', e.shiftKey ? 0.5 : 0.1);
      } else if (e.code === 'ArrowRight' && selectedClipId) {
        e.preventDefault();
        handleNudgeClip('right', e.shiftKey ? 0.5 : 0.1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, historyIndex, history, clips, currentTime, isPlaying]);

  // Sync initial images if provided
  useEffect(() => {
    if (initialImages.length > 0 && images.length === 0) {
      setImages(initialImages);
    }
  }, [initialImages]);

  // Preload Image elements for fast real-time preview and export
  useEffect(() => {
    images.forEach((img) => {
      if (!imageElementsMap.current.has(img.id)) {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.referrerPolicy = 'no-referrer';
        el.src = img.url;
        el.onload = () => {
          // Re-render preview when image loads
          renderPreviewFrame(currentTime);
        };
        imageElementsMap.current.set(img.id, el);
      }
    });
  }, [images]);

  // Audio Playback Sync
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.currentTime = currentTime;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Playhead Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastTime = now;
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Continuous Wheel & Shift+Wheel Horizontal Scrolling (Requirement 7 & 8)
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      const delta = e.shiftKey
        ? (e.deltaY !== 0 ? e.deltaY : e.deltaX)
        : (e.deltaX !== 0 ? e.deltaX : e.deltaY);

      if (delta !== 0) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 0) {
          const prev = container.scrollLeft;
          container.scrollLeft += delta;
          if (container.scrollLeft !== prev || e.shiftKey) {
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Playhead Auto-Scroll during playback (Requirement 11)
  useEffect(() => {
    if (!isPlaying) return;
    const container = timelineContainerRef.current;
    if (!container) return;

    const playheadPx = currentTime * pixelsPerSecond;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;

    // Follow smoothly when playhead approaches the visible right boundary
    if (playheadPx > scrollLeft + clientWidth - 100) {
      container.scrollLeft = playheadPx - clientWidth + 160;
    } else if (playheadPx < scrollLeft) {
      container.scrollLeft = Math.max(0, playheadPx - 60);
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);

  // Render preview canvas whenever currentTime, clips, or settings change
  useEffect(() => {
    renderPreviewFrame(currentTime);
  }, [currentTime, clips, aspectRatio, settings.watermark]);

  const renderPreviewFrame = (time: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    VideoRenderer.drawFrameAtTime(
      ctx,
      canvas.width,
      canvas.height,
      time,
      clips,
      imageElementsMap.current,
      settings.watermark,
      settings.watermarkText
    );
  };

  /**
   * 1. Multi-Image Upload Handler
   */
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setStatusMessage(`Loading ${files.length} images...`);
    const newStudioImages: StudioImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imgEl = await ImageProcessingService.loadImage(dataUrl);
      const analysis = await TimelineDirectorService.analyzeImageClientSide(imgEl, file.name);

      newStudioImages.push({
        id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: dataUrl,
        width: imgEl.naturalWidth,
        height: imgEl.naturalHeight,
        mood: analysis.mood,
        visualEnergy: analysis.visualEnergy,
        createdAt: Date.now(),
        originalDataUrl: dataUrl,
      });
    }

    const updated = [...images, ...newStudioImages];
    setImages(updated);
    setStatusMessage(`Loaded ${newStudioImages.length} images successfully.`);

    // If audio is already loaded, automatically regenerate the timeline!
    if (audioTrack) {
      await autoGenerateTimeline(updated, audioTrack);
    }
  };

  /**
   * 2. Audio Upload Handler (reads duration, builds waveform, keeps audio buffer)
   */
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setStatusMessage('Decoding audio track and analyzing acoustic peaks...');

      const analyzedTrack = await AudioAnalysisService.analyzeAudioFile(file, (msg) => {
        setStatusMessage(msg);
      });

      setAudioTrack(analyzedTrack);
      setStatusMessage(`Audio "${file.name}" analyzed (${analyzedTrack.duration.toFixed(1)}s, ${analyzedTrack.bpm} BPM).`);

      // Automatically pair with images and build timeline!
      if (images.length > 0) {
        await autoGenerateTimeline(images, analyzedTrack);
      }
    } catch (err: any) {
      console.error('Audio upload failed:', err);
      setStatusMessage(`Failed to process audio: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 3. AI Automated Director: generateTimeline(images, audioTrack)
   * Matches images to music sections, ensures 100% coverage, applies effects.
   */
  const autoGenerateTimeline = async (
    targetImages: StudioImage[],
    targetAudio: AudioTrackData
  ) => {
    if (targetImages.length === 0 || !targetAudio) return;
    try {
      setIsAnalyzing(true);
      setStatusMessage(`AI Director matching ${targetImages.length} images to ${targetAudio.sections.length} music sections...`);

      const generatedClips = await TimelineDirectorService.generateTimeline(
        targetImages,
        targetAudio,
        (msg) => setStatusMessage(msg)
      );

      setClips(generatedClips);
      if (generatedClips.length > 0) {
        setSelectedClipId(generatedClips[0].id);
      }
      // Initialize Undo history with auto-generated arrangement
      setHistory([JSON.parse(JSON.stringify(generatedClips))]);
      setHistoryIndex(0);
      setCurrentTime(0);
      setStatusMessage(`AI Timeline created! ${generatedClips.length} clips synchronized with complete soundtrack.`);
    } catch (err: any) {
      console.error('Timeline generation error:', err);
      setStatusMessage(`Timeline generation notice: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Fast Demo Project Loader: Loads 20 curated images + synthesized soundtrack (e.g. 5-minute or 60s)
   * and runs the full automated director pipeline for immediate testing.
   */
  const handleLoadDemoProject = async (targetDurationSeconds?: number | React.MouseEvent) => {
    const sec = typeof targetDurationSeconds === 'number' ? targetDurationSeconds : 300;
    try {
      setIsAnalyzing(true);
      setStatusMessage(`Loading 20 curated cinematic images and synthesizing ${sec >= 60 ? Math.round(sec / 60) + ' min' : sec + 's'} soundtrack...`);
      const sampleImages = SampleDataService.generate20SampleImages();
      setImages(sampleImages);

      const sampleAudio = await SampleDataService.synthesizeSampleSoundtrack(sec);
      setAudioTrack(sampleAudio);

      await autoGenerateTimeline(sampleImages, sampleAudio);
      setStatusMessage(`Master project loaded! 20 images synchronized across full ${sec}s (${Math.round(sec / 60)} min) soundtrack.`);
    } catch (err: any) {
      console.error('Failed to load demo:', err);
      setStatusMessage(`Error loading demo: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Manual Clip Editing: Modify Selected Clip Properties
   */
  const updateSelectedClip = (updates: Partial<TimelineClip>) => {
    if (!selectedClipId) return;
    setClips((prev) => {
      const updated = prev.map((c) => (c.id === selectedClipId ? { ...c, ...updates } : c));
      pushHistory(updated);
      return updated;
    });
  };

  /**
   * Delete Clip from Timeline (does NOT delete from images gallery)
   */
  const handleDeleteClip = (clipId: string) => {
    setClips((prev) => {
      const filtered = prev.filter((c) => c.id !== clipId);
      pushHistory(filtered);
      return filtered;
    });
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
    setStatusMessage('Clip removed from timeline.');
  };

  /**
   * Duplicate Clip
   */
  const handleDuplicateClip = (clipId: string) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx === -1) return;
    const target = clips[idx];
    const newClip: TimelineClip = {
      ...target,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: target.endTime,
      endTime: Math.min(totalDuration, target.endTime + target.duration),
      duration: target.duration,
    };
    const updated = [...clips.slice(0, idx + 1), newClip, ...clips.slice(idx + 1)];
    setClips(updated);
    setSelectedClipId(newClip.id);
    pushHistory(updated);
    setStatusMessage('Clip duplicated.');
  };

  /**
   * Split Clip at Current Playhead Time
   */
  const handleSplitClipAtPlayhead = () => {
    let activeIndex = -1;
    if (selectedClipId) {
      activeIndex = clips.findIndex(
        (c) => c.id === selectedClipId && currentTime > c.startTime + 0.2 && currentTime < c.endTime - 0.2
      );
    }
    if (activeIndex === -1) {
      activeIndex = clips.findIndex(
        (c) => currentTime > c.startTime + 0.2 && currentTime < c.endTime - 0.2
      );
    }
    if (activeIndex === -1) {
      setStatusMessage('Position playhead inside an image clip (at least 0.2s from edges) to split it.');
      return;
    }

    const target = clips[activeIndex];
    const firstDur = Math.round((currentTime - target.startTime) * 1000) / 1000;
    const secondDur = Math.round((target.endTime - currentTime) * 1000) / 1000;

    const clipA: TimelineClip = {
      ...target,
      id: `clip_${Date.now()}_a`,
      endTime: currentTime,
      duration: firstDur,
    };
    const clipB: TimelineClip = {
      ...target,
      id: `clip_${Date.now()}_b`,
      startTime: currentTime,
      duration: secondDur,
    };

    const newClips = [
      ...clips.slice(0, activeIndex),
      clipA,
      clipB,
      ...clips.slice(activeIndex + 1),
    ];
    setClips(newClips);
    setSelectedClipId(clipB.id);
    pushHistory(newClips);
    setStatusMessage(`Clip split into two independent clips (${firstDur.toFixed(2)}s & ${secondDur.toFixed(2)}s).`);
  };

  /**
   * Nudge Selected Clip horizontally by seconds
   */
  const handleNudgeClip = (direction: 'left' | 'right', amount: number) => {
    if (!selectedClipId) return;
    setClips((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== selectedClipId) return c;
        const delta = direction === 'left' ? -amount : amount;
        const newStart = Math.max(0, Math.min(totalDuration - c.duration, c.startTime + delta));
        return {
          ...c,
          startTime: Math.round(newStart * 1000) / 1000,
          endTime: Math.round((newStart + c.duration) * 1000) / 1000,
        };
      });
      pushHistory(updated);
      return updated;
    });
  };

  /**
   * Ripple Close Gaps: Aligns all timeline clips contiguously
   */
  const handleRippleCloseGaps = () => {
    if (clips.length === 0) return;
    let t = 0;
    const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);
    const contiguous = sorted.map((c) => {
      const dur = c.duration;
      const res = { ...c, startTime: t, endTime: t + dur };
      t += dur;
      return res;
    });
    setClips(contiguous);
    pushHistory(contiguous);
    setStatusMessage('All gaps closed contiguously.');
  };

  /**
   * Replace Clip Image while preserving exact timing and effects
   */
  const handleReplaceClipImage = (clipId: string, newImageId: string) => {
    const updated = clips.map((c) => (c.id === clipId ? { ...c, imageId: newImageId } : c));
    setClips(updated);
    pushHistory(updated);
    setIsReplacingImageForClipId(null);
    setStatusMessage('Clip image replaced.');
  };

  /**
   * Pointer Events: Real Mouse Dragging, Trimming, and Snapping
   */
  const handleClipPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setSelectedClipId(clip.id);
    dragOperationRef.current = {
      type,
      clipId: clip.id,
      startPointerX: e.clientX,
      initialStartTime: clip.startTime,
      initialEndTime: clip.endTime,
      initialDuration: clip.duration,
      initialScrollLeft: timelineContainerRef.current?.scrollLeft || 0,
    };
  };

  const handleClipPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip
  ) => {
    const op = dragOperationRef.current;
    if (!op || op.clipId !== clip.id) return;

    const container = timelineContainerRef.current;
    const currentScroll = container?.scrollLeft || 0;
    const scrollDelta = currentScroll - op.initialScrollLeft;
    const deltaX = (e.clientX - op.startPointerX) + scrollDelta;
    const deltaTime = deltaX / pixelsPerSecond;

    // Edge auto-scroll while dragging clips
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      if (relativeX < 50 && container.scrollLeft > 0) {
        container.scrollLeft -= 8;
      } else if (relativeX > containerRect.width - 50 && container.scrollLeft < container.scrollWidth - containerRect.width) {
        container.scrollLeft += 8;
      }
    }

    if (op.type === 'move') {
      let candidateStart = Math.max(0, op.initialStartTime + deltaTime);
      if (candidateStart + op.initialDuration > totalDuration + 20) {
        candidateStart = totalDuration + 20 - op.initialDuration;
      }

      let snappedStart = candidateStart;
      let snapInfo: { time: number; label: string } | null = null;

      if (isSnapEnabled) {
        const leftSnap = findSnapPoint(candidateStart, clip.id, 0.2);
        if (leftSnap) {
          snappedStart = leftSnap.time;
          snapInfo = leftSnap;
        } else {
          const rightSnap = findSnapPoint(candidateStart + op.initialDuration, clip.id, 0.2);
          if (rightSnap) {
            snappedStart = Math.max(0, rightSnap.time - op.initialDuration);
            snapInfo = rightSnap;
          }
        }
      }

      if (snapInfo) {
        setSnapIndicator({
          time: snapInfo.time,
          x: snapInfo.time * pixelsPerSecond,
          label: snapInfo.label,
        });
      } else {
        setSnapIndicator(null);
      }

      const roundedStart = Math.round(snappedStart * 1000) / 1000;
      const roundedEnd = Math.round((roundedStart + op.initialDuration) * 1000) / 1000;

      setClips((prev) =>
        prev.map((c) =>
          c.id === clip.id
            ? { ...c, startTime: roundedStart, endTime: roundedEnd }
            : c
        )
      );

      setCurrentTime(roundedStart);
      if (audioRef.current) audioRef.current.currentTime = roundedStart;
    } else if (op.type === 'resize-left') {
      const minDur = 0.5;
      let candidateStart = Math.max(0, Math.min(op.initialEndTime - minDur, op.initialStartTime + deltaTime));

      let snapInfo: { time: number; label: string } | null = null;
      if (isSnapEnabled) {
        const snap = findSnapPoint(candidateStart, clip.id, 0.2);
        if (snap && snap.time < op.initialEndTime - minDur) {
          candidateStart = Math.max(0, snap.time);
          snapInfo = snap;
        }
      }

      if (snapInfo) {
        setSnapIndicator({
          time: snapInfo.time,
          x: snapInfo.time * pixelsPerSecond,
          label: snapInfo.label,
        });
      } else {
        setSnapIndicator(null);
      }

      const roundedStart = Math.round(candidateStart * 1000) / 1000;
      const newDur = Math.round((op.initialEndTime - roundedStart) * 1000) / 1000;

      setClips((prev) =>
        prev.map((c) =>
          c.id === clip.id
            ? { ...c, startTime: roundedStart, duration: newDur }
            : c
        )
      );
      setCurrentTime(roundedStart);
      if (audioRef.current) audioRef.current.currentTime = roundedStart;
    } else if (op.type === 'resize-right') {
      const minDur = 0.5;
      let candidateEnd = Math.max(op.initialStartTime + minDur, op.initialEndTime + deltaTime);

      let snapInfo: { time: number; label: string } | null = null;
      if (isSnapEnabled) {
        const snap = findSnapPoint(candidateEnd, clip.id, 0.2);
        if (snap && snap.time > op.initialStartTime + minDur) {
          candidateEnd = snap.time;
          snapInfo = snap;
        }
      }

      if (snapInfo) {
        setSnapIndicator({
          time: snapInfo.time,
          x: snapInfo.time * pixelsPerSecond,
          label: snapInfo.label,
        });
      } else {
        setSnapIndicator(null);
      }

      const roundedEnd = Math.round(candidateEnd * 1000) / 1000;
      const newDur = Math.round((roundedEnd - op.initialStartTime) * 1000) / 1000;

      setClips((prev) =>
        prev.map((c) =>
          c.id === clip.id
            ? { ...c, endTime: roundedEnd, duration: newDur }
            : c
        )
      );
      setCurrentTime(roundedEnd);
      if (audioRef.current) audioRef.current.currentTime = roundedEnd;
    }
  };

  const handleClipPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip
  ) => {
    if (dragOperationRef.current?.clipId === clip.id) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      dragOperationRef.current = null;
      setSnapIndicator(null);

      // Chronological sort to reorder clips properly after drag drop
      setClips((prev) => {
        const sorted = [...prev].sort((a, b) => a.startTime - b.startTime);
        pushHistory(sorted);
        return sorted;
      });
    }
  };

  /**
   * Ruler & Playhead Pointer Scrubbing
   */
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekSec = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
    setCurrentTime(seekSec);
    if (audioRef.current) audioRef.current.currentTime = seekSec;

    isScrubbingPlayheadRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingPlayheadRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekSec = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
    setCurrentTime(seekSec);
    if (audioRef.current) audioRef.current.currentTime = seekSec;

    // Edge auto-scroll while scrubbing playhead
    const container = timelineContainerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      if (relativeX < 50 && container.scrollLeft > 0) {
        container.scrollLeft -= 10;
      } else if (relativeX > containerRect.width - 50 && container.scrollLeft < container.scrollWidth - containerRect.width) {
        container.scrollLeft += 10;
      }
    }
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbingPlayheadRef.current) {
      isScrubbingPlayheadRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /**
   * Export Real MP4/WebM Video with Audio
   */
  const handleExportVideo = async () => {
    if (clips.length === 0) {
      setStatusMessage('Add images to the timeline first.');
      return;
    }

    try {
      setIsExporting(true);
      setIsPlaying(false);
      setExportProgress(0.01);
      setExportStatusText('Preparing multi-track canvas and audio mixer...');

      const videoBlob = await VideoRenderer.renderVideo({
        clips,
        images: imageElementsMap.current,
        audioTrack,
        totalDuration,
        resolution: settings.defaultResolution || '1080p',
        aspectRatio,
        watermark: settings.watermark,
        watermarkText: settings.watermarkText,
        creatorCredit: settings.creatorCredit,
        onProgress: (p, text) => {
          setExportProgress(p);
          setExportStatusText(text);
        },
      });

      // Trigger instant download of real video file
      const downloadUrl = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const isMp4 = videoBlob.type.includes('mp4');
      link.download = `niksa_studio_${projectTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save project metadata
      onSaveProject({
        id: `proj_${Date.now()}`,
        title: projectTitle,
        clips,
        audioTrack,
        resolution: settings.defaultResolution || '1080p',
        aspectRatio,
        fps: 30,
        totalDuration,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setStatusMessage('Video exported and downloaded successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      setStatusMessage(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const selectedImage = selectedClip ? images.find((i) => i.id === selectedClip.imageId) : null;

  // Format seconds to mm:ss.ms
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Hidden Audio Element for Timeline Sync */}
      {audioTrack?.audioUrl && (
        <audio
          ref={audioRef}
          src={audioTrack.audioUrl}
          muted={isMuted}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top Video Maker Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400" />
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-1 py-0.5"
            />
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 text-xs text-slate-400 border border-slate-700/60">
            <span>Duration:</span>
            <span className="font-mono text-cyan-300 font-semibold">{formatTime(totalDuration)}</span>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/70 text-xs">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  aspectRatio === ratio
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Loader */}
          <div className="hidden sm:flex items-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 overflow-hidden">
            <button
              onClick={() => handleLoadDemoProject(60)}
              disabled={isAnalyzing || isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Load 20 images + 60s soundtrack to test automated video matching"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demo (60s)</span>
            </button>
            <div className="w-px h-4 bg-cyan-500/30" />
            <button
              onClick={() => handleLoadDemoProject(300)}
              disabled={isAnalyzing || isExporting}
              className="px-2.5 py-1.5 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Load 20 images + 5-Minute (300s) soundtrack to test long timeline horizontal scroll"
            >
              <span>5-Min Long Demo</span>
            </button>
          </div>

          {/* Upload Images */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Images</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesUpload}
              className="sr-only"
            />
          </label>

          {/* Upload Audio */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition-colors">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>{audioTrack ? 'Replace Audio' : 'Upload Music'}</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="sr-only"
            />
          </label>

          {/* AI Auto-Match Button */}
          {images.length > 0 && audioTrack && (
            <button
              onClick={() => autoGenerateTimeline(images, audioTrack)}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer transition-all"
              title="Automatically match all images to audio energy and sections"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Sync Timeline</span>
            </button>
          )}

          {/* Export Video Button */}
          <button
            onClick={handleExportVideo}
            disabled={isExporting || clips.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export MP4</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Middle Area: Preview Monitor + Side Controls */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Preview Player */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 relative bg-slate-950/60 overflow-hidden">
          {/* Status Toast */}
          {statusMessage && (
            <div className="absolute top-3 left-4 z-20 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] text-cyan-300 shadow-lg flex items-center gap-2 backdrop-blur-md animate-fadeIn">
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Video Preview Canvas */}
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex items-center justify-center max-h-[52vh] ${
              aspectRatio === '16:9'
                ? 'aspect-video w-full max-w-3xl'
                : aspectRatio === '9:16'
                ? 'aspect-[9/16] h-full max-h-[50vh]'
                : 'aspect-square max-h-[50vh]'
            }`}
          >
            <canvas
              ref={previewCanvasRef}
              width={aspectRatio === '9:16' ? 720 : 1280}
              height={aspectRatio === '9:16' ? 1280 : aspectRatio === '1:1' ? 1080 : 720}
              className="w-full h-full object-contain"
            />

            {clips.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80">
                <Film className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Video Maker Ready</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Upload multiple photos and music. Niksa AI will automatically detect beats, match images to song sections, and create the video.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleLoadDemoProject(60)}
                    disabled={isAnalyzing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load 60s Demo</span>
                  </button>
                  <button
                    onClick={() => handleLoadDemoProject(300)}
                    disabled={isAnalyzing}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-500/30 cursor-pointer flex items-center gap-1.5"
                    title="Load 20 images across 5 minutes to test long timeline horizontal scroll"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>5-Min Long Demo</span>
                  </button>
                  <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 cursor-pointer">
                    Upload Photos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImagesUpload}
                      className="sr-only"
                    />
                  </label>
                  <button
                    onClick={onNavigateToGenerator}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
                  >
                    Generate AI Images
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Playback Transport Controls */}
          <div className="flex items-center gap-4 mt-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs">
            <button
              onClick={() => {
                setCurrentTime(0);
                if (audioRef.current) audioRef.current.currentTime = 0;
              }}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Return to start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md font-bold transition-transform active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={handleSplitClipAtPlayhead}
              className="p-1.5 text-slate-400 hover:text-cyan-400 flex items-center gap-1"
              title="Split clip at playhead"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="text-[10px]">Split</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="font-mono text-xs flex items-center gap-1">
              <span className="text-cyan-400 font-semibold">{formatTime(currentTime)}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{formatTime(totalDuration)}</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-slate-400 hover:text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Side: Selected Clip Transformations & Inspector */}
        <div className="w-80 border-l border-slate-800/80 bg-slate-900/40 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Clip Inspector
            </span>
            {selectedClip && (
              <span className="text-[10px] text-cyan-400 font-mono">
                {selectedClip.duration.toFixed(1)}s
              </span>
            )}
          </div>

          {selectedClip ? (
            <div className="space-y-4">
              {/* Timing Breakdown Card (Requirement 2) */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Clock className="w-3.5 h-3.5" />
                    Clip Timing & Position
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {selectedClip.duration.toFixed(2)}s
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Start</div>
                    <div className="font-mono text-cyan-300 font-bold text-[11px]">{formatTimeDetailed(selectedClip.startTime)}</div>
                    <div className="text-[8px] text-slate-500 font-mono mt-0.5">{selectedClip.startTime.toFixed(2)}s</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">End</div>
                    <div className="font-mono text-cyan-300 font-bold text-[11px]">{formatTimeDetailed(selectedClip.endTime)}</div>
                    <div className="text-[8px] text-slate-500 font-mono mt-0.5">{selectedClip.endTime.toFixed(2)}s</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Duration</div>
                    <div className="font-mono text-purple-300 font-bold text-[11px]">{selectedClip.duration.toFixed(1)}s</div>
                    <div className="text-[8px] text-slate-500 font-mono mt-0.5">{formatTimeDetailed(selectedClip.duration)}</div>
                  </div>
                </div>

                {/* Fine Timing Stepper Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Start Sec:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={selectedClip.endTime - 0.5}
                      value={selectedClip.startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val < selectedClip.endTime) {
                          updateSelectedClip({
                            startTime: val,
                            duration: Math.round((selectedClip.endTime - val) * 1000) / 1000,
                          });
                        }
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Duration Sec:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max={totalDuration}
                      value={selectedClip.duration}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0.5) {
                          updateSelectedClip({
                            duration: val,
                            endTime: Math.round((selectedClip.startTime + val) * 1000) / 1000,
                          });
                        }
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Clip Operations */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={handleSplitClipAtPlayhead}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/80 transition-colors"
                    title="Split clip at playhead position [S]"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>Split [S]</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateClip(selectedClip.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/80 transition-colors"
                    title="Duplicate clip"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClip(selectedClip.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30 transition-colors"
                    title="Delete clip [Del]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Selected Image Thumbnail & Replace (Requirement 11) */}
              {selectedImage && (
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.name}
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate text-xs">
                        {selectedImage.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mood: <span className="text-cyan-300 capitalize">{selectedImage.mood || 'vibrant'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Energy: <span className="text-purple-300 capitalize">{selectedImage.visualEnergy || 'medium'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReplacingImageForClipId(selectedClip.id)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Replace Image...</span>
                  </button>
                </div>
              )}

              {/* Cinematic Motion Effect */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Visual Movement & Effect
                </label>
                <select
                  value={selectedClip.effect}
                  onChange={(e) => updateSelectedClip({ effect: e.target.value as VideoEffectType })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="ken-burns-in">Ken Burns (Slow Zoom In)</option>
                  <option value="ken-burns-out">Ken Burns (Slow Zoom Out)</option>
                  <option value="pan-right">Cinematic Pan Right</option>
                  <option value="pan-left">Cinematic Pan Left</option>
                  <option value="cinematic-drift">Cinematic Drift</option>
                  <option value="subtle-pulse">Subtle Audio Pulse</option>
                  <option value="none">Static (No Motion)</option>
                  <option value="shake">Dynamic Action Shake</option>
                </select>
              </div>

              {/* Transition to Next Clip */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Transition Effect
                </label>
                <select
                  value={selectedClip.transition}
                  onChange={(e) => updateSelectedClip({ transition: e.target.value as TransitionType })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="cross-dissolve">Cross Dissolve (Smooth)</option>
                  <option value="slide-left">Slide Left</option>
                  <option value="slide-right">Slide Right</option>
                  <option value="zoom-in">Zoom In Transition</option>
                  <option value="fade-black">Dip to Black</option>
                </select>
              </div>

              {/* Color Grading Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Color Grade / Atmosphere
                </label>
                <select
                  value={selectedClip.filter || 'none'}
                  onChange={(e) => updateSelectedClip({ filter: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="none">Natural / Original</option>
                  <option value="warm-cinematic">Warm 35mm Film</option>
                  <option value="noir">Noir High-Contrast B&W</option>
                  <option value="glow">Vibrant Glow</option>
                  <option value="vhs-retro">90s Retro VHS</option>
                </select>
              </div>

              {/* Scale & Scale Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Frame Scale</span>
                  <span className="font-mono text-cyan-300">{(selectedClip.scale || 1).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={selectedClip.scale || 1}
                  onChange={(e) => updateSelectedClip({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Rotation Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Rotation</span>
                  <span className="font-mono text-cyan-300">{selectedClip.rotation || 0}&deg;</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={selectedClip.rotation || 0}
                  onChange={(e) => updateSelectedClip({ rotation: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Clip Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleDuplicateClip(selectedClip.id)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => handleDeleteClip(selectedClip.id)}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                  title="Delete clip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <span>Select any clip on the timeline to customize motion, transitions, and framing.</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM DUAL-TRACK TIMELINE (IMAGE TRACK + AUDIO TRACK)
          ========================================================================= */}
      <div className="h-72 border-t border-slate-800 bg-slate-900/95 flex flex-col select-none">
        {/* Timeline Control Header */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-800/80 bg-slate-950/70 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Timeline Engine
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              {clips.length} Clips &bull; {images.length} Images Loaded
            </span>
          </div>

          {/* Timeline Action Tools: Undo, Redo, Split, Snap, Close Gaps, Zoom */}
          <div className="flex items-center gap-2">
            {/* Undo Button (Requirement 17) */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
              title="Undo [Ctrl+Z]"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo Button (Requirement 17) */}
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
              title="Redo [Ctrl+Shift+Z]"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            {/* Split Clip Button (Requirement 8) */}
            <button
              onClick={handleSplitClipAtPlayhead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700/80 transition-colors cursor-pointer"
              title="Split clip at playhead position [S]"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Split [S]</span>
            </button>

            {/* Snap Toggle (Requirement 7) */}
            <button
              onClick={() => setIsSnapEnabled(!isSnapEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isSnapEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={isSnapEnabled ? 'Snapping enabled: snaps to clips, markers, start & end' : 'Snapping disabled'}
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>Snap</span>
            </button>

            {/* Ripple Close Gaps */}
            <button
              onClick={handleRippleCloseGaps}
              disabled={clips.length === 0}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700/80 transition-colors disabled:opacity-50 cursor-pointer"
              title="Close all gaps between clips contiguously"
            >
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Close Gaps</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            {/* Quick Timeline Scroll Jumps */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-900/80 px-1.5 py-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
              <button
                onClick={() => {
                  if (timelineContainerRef.current) timelineContainerRef.current.scrollLeft = 0;
                  setCurrentTime(0);
                  if (audioRef.current) audioRef.current.currentTime = 0;
                }}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                title="Scroll to start (00:00)"
              >
                00:00
              </button>
              <button
                onClick={() => {
                  if (timelineContainerRef.current) {
                    timelineContainerRef.current.scrollLeft = Math.max(
                      0,
                      currentTime * pixelsPerSecond - timelineContainerRef.current.clientWidth / 2
                    );
                  }
                }}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                title="Center view on playhead"
              >
                Playhead
              </button>
              <button
                onClick={() => {
                  if (timelineContainerRef.current) {
                    timelineContainerRef.current.scrollLeft = timelineContainerRef.current.scrollWidth;
                  }
                  setCurrentTime(totalDuration);
                  if (audioRef.current) audioRef.current.currentTime = totalDuration;
                }}
                className="px-1.5 py-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                title="Scroll to end of project"
              >
                End
              </button>
            </div>

            {/* Zoom Controls (Requirement 14) */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setZoomLevel(Math.max(0.25, Math.round((zoomLevel - 0.25) * 100) / 100))}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-cyan-400 w-9 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(3, Math.round((zoomLevel + 0.25) * 100) / 100))}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (timelineContainerRef.current) {
                    const clientW = timelineContainerRef.current.clientWidth - 150;
                    const fitZoom = Math.max(0.25, Math.min(3, Math.round((clientW / (totalDuration * 50)) * 100) / 100));
                    setZoomLevel(fitZoom || 0.5);
                    timelineContainerRef.current.scrollLeft = 0;
                  }
                }}
                className="text-[9px] font-semibold text-slate-400 hover:text-cyan-300 px-1 py-0.5 rounded hover:bg-slate-800"
                title="Fit entire timeline into view"
              >
                Fit
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Synchronized Tracks Container (Requirement 15: horizontal scroll to end) */}
        <div
          ref={timelineContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative p-3 space-y-2 select-none timeline-scrollbar"
        >
          {/* Virtual Timeline Width Wrapper */}
          <div
            className="relative h-full flex flex-col justify-between"
            style={{ width: `${timelineTrackWidth}px`, minWidth: '100%' }}
          >
            {/* 1. TOP TIME RULER & PLAYHEAD SCRUBBER (Requirement 13) */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="h-6 bg-slate-950/90 rounded-md border border-slate-800 relative cursor-pointer select-none overflow-hidden"
            >
              {/* Ruler second tick marks */}
              {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
                const isMajor = sec % 5 === 0;
                const xPos = sec * pixelsPerSecond;
                if (xPos > timelineTrackWidth) return null;

                return (
                  <div
                    key={sec}
                    style={{ left: `${xPos}px` }}
                    className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                  >
                    <div
                      className={`w-px ${
                        isMajor ? 'h-3.5 bg-slate-400' : 'h-1.5 bg-slate-700'
                      }`}
                    />
                    {isMajor && (
                      <span className="text-[8px] font-mono text-slate-400 ml-1 mb-0.5 leading-none">
                        {formatTimeDetailed(sec).substring(0, 5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. PLAYHEAD VERTICAL LINE & SCRUBBER HEAD (Requirement 13) */}
            <div
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              className="absolute top-0 bottom-0 z-40 pointer-events-none transition-none"
            >
              <div className="w-0.5 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] relative">
                {/* Playhead Draggable Head Handle */}
                <div
                  onPointerDown={handleRulerPointerDown}
                  onPointerMove={handleRulerPointerMove}
                  onPointerUp={handleRulerPointerUp}
                  className="pointer-events-auto absolute -top-1 -left-3 w-6 h-6 bg-cyan-400 hover:bg-cyan-300 rounded cursor-ew-resize flex flex-col items-center justify-center shadow-lg shadow-cyan-500/50"
                  title={`Playhead: ${formatTimeDetailed(currentTime)}`}
                >
                  <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                </div>
              </div>
            </div>

            {/* 3. SNAP GUIDELINE & BADGE (Requirement 7) */}
            {snapIndicator && (
              <div
                style={{ left: `${snapIndicator.x}px` }}
                className="absolute top-0 bottom-0 z-35 pointer-events-none border-l-2 border-dotted border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
              >
                <div className="absolute top-6 left-1 px-2 py-0.5 bg-cyan-500 text-slate-950 font-bold text-[9px] rounded-md shadow-lg font-mono whitespace-nowrap">
                  Snap: {snapIndicator.label} ({formatTimeDetailed(snapIndicator.time)})
                </div>
              </div>
            )}

            {/* 4. TRACK 1: IMAGE TRACK (Requirement 1, 3, 4, 5, 6: Draggable & Trim Handles) */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const seekSec = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
                setCurrentTime(seekSec);
                if (audioRef.current) audioRef.current.currentTime = seekSec;
              }}
              className="h-28 bg-slate-950/80 rounded-xl border border-slate-800/80 relative overflow-hidden cursor-pointer"
            >
              <span className="absolute left-2 top-1.5 z-20 text-[9px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                Image Track ({clips.length} Clips • Drag center to move, edges to trim)
              </span>

              {clips.length > 0 ? (
                clips.map((clip, index) => {
                  const img = images.find((i) => i.id === clip.imageId);
                  const isSelected = selectedClipId === clip.id;
                  const leftPx = clip.startTime * pixelsPerSecond;
                  const widthPx = Math.max(34, clip.duration * pixelsPerSecond);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setCurrentTime(clip.startTime);
                        if (audioRef.current) audioRef.current.currentTime = clip.startTime;
                      }}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                      className={`absolute top-2 bottom-2 rounded-xl overflow-hidden select-none border-2 transition-shadow group ${
                        isSelected
                          ? 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.7)] ring-1 ring-cyan-300 z-30'
                          : 'border-slate-700/90 hover:border-slate-500 z-10'
                      }`}
                    >
                      {/* LEFT TRIM HANDLE (|←) (Requirement 4) */}
                      <div
                        onPointerDown={(e) => handleClipPointerDown(e, clip, 'resize-left')}
                        onPointerMove={(e) => handleClipPointerMove(e, clip)}
                        onPointerUp={(e) => handleClipPointerUp(e, clip)}
                        className="absolute left-0 top-0 bottom-0 w-3.5 z-40 cursor-ew-resize bg-slate-900/60 hover:bg-cyan-500/80 active:bg-cyan-400 flex items-center justify-center transition-colors group-hover:bg-slate-800/80"
                        title="Drag left edge to trim start time"
                      >
                        <div className="w-1 h-5 rounded-full bg-cyan-400/90" />
                      </div>

                      {/* CENTER DRAG BODY (Move horizontally) (Requirement 1 & 3) */}
                      <div
                        onPointerDown={(e) => handleClipPointerDown(e, clip, 'move')}
                        onPointerMove={(e) => handleClipPointerMove(e, clip)}
                        onPointerUp={(e) => handleClipPointerUp(e, clip)}
                        className="absolute inset-x-3.5 inset-y-0 cursor-grab active:cursor-grabbing relative overflow-hidden"
                      >
                        {img ? (
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover select-none pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                            Empty
                          </div>
                        )}

                        {/* Gradient Overlay with Timing & Name Badges */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/70 pointer-events-none p-1.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-white bg-slate-950/80 px-1.5 py-0.5 rounded shadow">
                              #{index + 1}
                            </span>
                            <span className="text-[9px] font-mono text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded shadow">
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-200">
                            <span className="truncate max-w-[110px] font-medium drop-shadow">{img?.name || 'Clip'}</span>
                            <span className="text-[8px] text-purple-300 uppercase font-semibold bg-purple-950/70 px-1 rounded">
                              {clip.effect.replace('ken-burns-', 'KB ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT TRIM HANDLE (→|) (Requirement 4) */}
                      <div
                        onPointerDown={(e) => handleClipPointerDown(e, clip, 'resize-right')}
                        onPointerMove={(e) => handleClipPointerMove(e, clip)}
                        onPointerUp={(e) => handleClipPointerUp(e, clip)}
                        className="absolute right-0 top-0 bottom-0 w-3.5 z-40 cursor-ew-resize bg-slate-900/60 hover:bg-cyan-500/80 active:bg-cyan-400 flex items-center justify-center transition-colors group-hover:bg-slate-800/80"
                        title="Drag right edge to trim end time"
                      >
                        <div className="w-1 h-5 rounded-full bg-cyan-400/90" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  No images on timeline. Click "Load Demo" or upload images above.
                </div>
              )}
            </div>

            {/* 5. TRACK 2: AUDIO TRACK (Requirement 12: locked reference track with waveform & sections) */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const seekSec = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
                setCurrentTime(seekSec);
                if (audioRef.current) audioRef.current.currentTime = seekSec;
              }}
              className="h-16 bg-slate-950/80 rounded-xl border border-slate-800/80 p-1 relative overflow-hidden flex flex-col justify-center cursor-pointer"
            >
              <span className="absolute left-2 top-1 z-10 text-[9px] font-bold text-purple-400 uppercase tracking-widest pointer-events-none bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                Audio Track {audioTrack ? `(${audioTrack.fileName})` : '(No Audio Loaded)'}
              </span>

              {audioTrack ? (
                <>
                  {/* Waveform Visualization */}
                  <div className="w-full h-full flex items-center gap-[1px] px-2 pt-2 pointer-events-none">
                    {audioTrack.waveform.map((peak, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(12, peak * 90)}%` }}
                        className="flex-1 bg-gradient-to-t from-purple-600 via-sky-500 to-cyan-400 rounded-sm opacity-80"
                      />
                    ))}
                  </div>

                  {/* Section Markers */}
                  <div className="absolute bottom-0.5 left-0 right-0 flex items-center px-1 pointer-events-none">
                    {audioTrack.sections.map((sec) => {
                      const secLeft = sec.startTime * pixelsPerSecond;
                      const secWidth = (sec.endTime - sec.startTime) * pixelsPerSecond;
                      return (
                        <div
                          key={sec.id}
                          style={{ left: `${secLeft}px`, width: `${secWidth}px` }}
                          className="absolute border-l border-cyan-400/50 px-1 overflow-hidden truncate"
                        >
                          <span className="text-[8px] font-bold text-cyan-300/90 uppercase">
                            [{sec.sectionName}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Music className="w-4 h-4 text-slate-600" />
                  <span>Upload audio track to view waveform & auto-align clips with music</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replace Image Modal (Requirement 11) */}
      {isReplacingImageForClipId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm">Replace Clip Image</h3>
                <p className="text-xs text-slate-400">Select an image to swap onto this timeline clip without changing timing.</p>
              </div>
              <button
                onClick={() => setIsReplacingImageForClipId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => handleReplaceClipImage(isReplacingImageForClipId, img.id)}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-400 transition-all text-left cursor-pointer"
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                  <span className="absolute bottom-1 left-1 right-1 text-[8px] text-white truncate px-1 bg-black/75 rounded font-mono">
                    {img.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsReplacingImageForClipId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md select-none p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <Film className="w-7 h-7 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Rendering Niksa Studio Video</h3>
            <p className="text-xs text-slate-400 mb-6">{exportStatusText}</p>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 transition-all duration-200"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Encoding MP4...</span>
              <span className="text-cyan-300 font-bold">{Math.round(exportProgress * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
