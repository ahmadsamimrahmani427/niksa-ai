import { StudioImage, AudioTrackData, AudioSection } from '../types';

/**
 * Service to generate high-fidelity sample visual assets and synthesize
 * a real audio soundtrack for instant end-to-end testing of the Video Maker engine.
 */
export class SampleDataService {
  /**
   * Generates 20 distinct cinematic image assets as data URLs
   */
  public static generate20SampleImages(): StudioImage[] {
    const images: StudioImage[] = [];

    const themes = [
      { name: 'Aurora Borealis Over Arctic Fjord', bg1: '#022c22', bg2: '#064e3b', accent: '#10b981', mood: 'calm' as const, energy: 'low' as const },
      { name: 'Cyberpunk Metropolis Neon Rain', bg1: '#090d16', bg2: '#1e1b4b', accent: '#38bdf8', mood: 'epic' as const, energy: 'high' as const },
      { name: 'Golden Hour Mountain Silhouette', bg1: '#451a03', bg2: '#78350f', accent: '#f59e0b', mood: 'joyful' as const, energy: 'medium' as const },
      { name: 'Deep Space Nebula Cluster', bg1: '#030712', bg2: '#581c87', accent: '#a855f7', mood: 'dramatic' as const, energy: 'medium' as const },
      { name: 'Futuristic Hypercar in Wind Tunnel', bg1: '#0f172a', bg2: '#1e293b', accent: '#06b6d4', mood: 'epic' as const, energy: 'explosive' as const },
      { name: 'Ancient Temple in Bamboo Forest', bg1: '#064e3b', bg2: '#047857', accent: '#34d399', mood: 'calm' as const, energy: 'low' as const },
      { name: 'Volcanic Eruption Lava Flows', bg1: '#450a0a', bg2: '#7f1d1d', accent: '#ef4444', mood: 'dramatic' as const, energy: 'explosive' as const },
      { name: 'Minimalist Architectural Glass Tower', bg1: '#111827', bg2: '#1f2937', accent: '#94a3b8', mood: 'calm' as const, energy: 'low' as const },
      { name: 'Tokyo Shinjuku Midnight Crosswalk', bg1: '#172554', bg2: '#1e3a8a', accent: '#60a5fa', mood: 'vibrant' as const, energy: 'high' as const },
      { name: 'Sunset Desert Dunes Wind Pattern', bg1: '#7c2d12', bg2: '#9a3412', accent: '#fb923c', mood: 'joyful' as const, energy: 'medium' as const },
      { name: 'Cybernetic Android Portrait', bg1: '#18181b', bg2: '#27272a', accent: '#22d3ee', mood: 'epic' as const, energy: 'high' as const },
      { name: 'Lush Emerald Rainforest Canopy', bg1: '#052e16', bg2: '#14532d', accent: '#22c55e', mood: 'calm' as const, energy: 'low' as const },
      { name: 'Bioluminescent Coral Reef Twilight', bg1: '#083344', bg2: '#155e75', accent: '#06b6d4', mood: 'vibrant' as const, energy: 'medium' as const },
      { name: 'Speeding Maglev Train Particle Trails', bg1: '#030712', bg2: '#1e1b4b', accent: '#818cf8', mood: 'epic' as const, energy: 'explosive' as const },
      { name: 'Luxury Diamond Prism Refraction', bg1: '#09090b', bg2: '#18181b', accent: '#f8fafc', mood: 'calm' as const, energy: 'low' as const },
      { name: 'Electric Thunderstorm Ocean Surge', bg1: '#020617', bg2: '#0f172a', accent: '#38bdf8', mood: 'dramatic' as const, energy: 'explosive' as const },
      { name: 'Warm Autumn Forest Sunbeams', bg1: '#431407', bg2: '#7c2d12', accent: '#ea580c', mood: 'joyful' as const, energy: 'medium' as const },
      { name: 'Quantum Computer Processor Core', bg1: '#050505', bg2: '#172554', accent: '#3b82f6', mood: 'epic' as const, energy: 'high' as const },
      { name: 'Ethereal Cloud Palace at Dusk', bg1: '#3b0764', bg2: '#581c87', accent: '#c084fc', mood: 'vibrant' as const, energy: 'medium' as const },
      { name: 'Grand Finale Horizon Starlight', bg1: '#020617', bg2: '#030712', accent: '#e0e7ff', mood: 'epic' as const, energy: 'explosive' as const },
    ];

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    themes.forEach((theme, idx) => {
      // Draw gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, theme.bg1);
      grad.addColorStop(1, theme.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stylized geometric artwork
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      ctx.fillStyle = theme.accent + '22';

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 180 + (idx % 5) * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();

      // Atmospheric lines
      for (let l = 0; l < 8; l++) {
        ctx.beginPath();
        ctx.moveTo(100, 100 + l * 70);
        ctx.lineTo(canvas.width - 100, 150 + l * 60);
        ctx.strokeStyle = theme.accent + '33';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Title badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(theme.name, canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = theme.accent;
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(`SCENE ${(idx + 1).toString().padStart(2, '0')} • ${theme.mood.toUpperCase()} • ${theme.energy.toUpperCase()} ENERGY`, canvas.width / 2, canvas.height / 2 + 30);

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Niksa AI Studio • Ahmad Samim Rahmani', canvas.width / 2, canvas.height - 35);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      images.push({
        id: `demo_img_${idx + 1}`,
        name: theme.name,
        url: dataUrl,
        width: 1280,
        height: 720,
        mood: theme.mood,
        visualEnergy: theme.energy,
        createdAt: Date.now() - (20 - idx) * 1000,
        originalDataUrl: dataUrl,
      });
    });

    return images;
  }

  /**
   * Synthesizes a real, playable multi-section audio soundtrack with beats, chords, and rhythmic changes
   * using the Web Audio API. Returns complete AudioTrackData with waveform and sections.
   */
  public static async synthesizeSampleSoundtrack(durationSeconds: number = 60): Promise<AudioTrackData> {
    const sampleRate = 44100;
    const totalSamples = sampleRate * durationSeconds;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const audioBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);

    const bpm = 120;
    const beatInterval = 60 / bpm; // 0.5s per beat

    // Percussion beat (kick drum pulse on beats in chorus sections)
    const chorus1Start = durationSeconds * 0.25;
    const chorus1End = durationSeconds * 0.5;
    const chorus2Start = durationSeconds * 0.7;
    const chorus2End = durationSeconds * 0.9;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let val = 0;

      // Base chord progression (C minor - Ab - Eb - Bb)
      const chordIndex = Math.floor(t / 8) % 4;
      const baseFreqs = [
        [130.81, 155.56, 196.0], // Cm
        [103.83, 130.81, 164.81], // Ab
        [155.56, 196.0, 233.08], // Eb
        [116.54, 146.83, 174.61], // Bb
      ][chordIndex];

      // Soft pads
      baseFreqs.forEach((freq) => {
        val += Math.sin(2 * Math.PI * freq * t) * 0.08;
        val += Math.sin(2 * Math.PI * (freq * 2) * t) * 0.04;
      });

      // Percussion beat
      const isChorus = (t >= chorus1Start && t <= chorus1End) || (t >= chorus2Start && t <= chorus2End);
      if (isChorus) {
        const beatTime = t % beatInterval;
        if (beatTime < 0.1) {
          const kickFreq = 120 * Math.exp(-beatTime * 30);
          val += Math.sin(2 * Math.PI * kickFreq * beatTime) * 0.35 * Math.exp(-beatTime * 20);
        }
      }

      // Fade in at start and fade out at end
      const envelope = Math.min(1, t / 2) * Math.min(1, (durationSeconds - t) / 2);
      val *= envelope;

      left[i] = Math.max(-0.95, Math.min(0.95, val));
      right[i] = Math.max(-0.95, Math.min(0.95, val * 0.98));
    }

    // Convert AudioBuffer to WAV Blob
    const wavBlob = this.audioBufferToWav(audioBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);

    // Extract real waveform peaks
    const waveform: number[] = [];
    const step = Math.floor(totalSamples / 300);
    for (let i = 0; i < 300; i++) {
      let max = 0;
      for (let j = 0; j < step; j += 4) {
        const amp = Math.abs(left[i * step + j] || 0);
        if (amp > max) max = amp;
      }
      waveform.push(Math.min(1, Math.max(0.05, max)));
    }

    const t1 = Math.round(durationSeconds * 0.15);
    const t2 = Math.round(durationSeconds * 0.45);
    const t3 = Math.round(durationSeconds * 0.65);
    const t4 = Math.round(durationSeconds * 0.88);

    const sections: AudioSection[] = [
      {
        id: 'sec_intro',
        sectionName: 'Intro & Atmosphere',
        startTime: 0,
        endTime: t1,
        energyLevel: 'low',
        mood: 'atmospheric',
        recommendedVisualPace: 'slow-pan',
        visualDescription: 'Wide establishing landscapes & tranquil beginnings',
      },
      {
        id: 'sec_chorus1',
        sectionName: 'Peak Chorus 1',
        startTime: t1,
        endTime: t2,
        energyLevel: 'high',
        mood: 'triumphant',
        recommendedVisualPace: 'dynamic-cut',
        visualDescription: 'High-energy emotional centerpiece imagery',
      },
      {
        id: 'sec_bridge',
        sectionName: 'Reflective Bridge',
        startTime: t2,
        endTime: t3,
        energyLevel: 'medium',
        mood: 'dramatic',
        recommendedVisualPace: 'cinematic-drift',
        visualDescription: 'Moody character detail & subtle narrative shift',
      },
      {
        id: 'sec_chorus2',
        sectionName: 'Climactic Finale',
        startTime: t3,
        endTime: t4,
        energyLevel: 'explosive',
        mood: 'epic',
        recommendedVisualPace: 'dynamic-cut',
        visualDescription: 'Peak crescendo energetic visuals',
      },
      {
        id: 'sec_outro',
        sectionName: 'Outro',
        startTime: t4,
        endTime: durationSeconds,
        energyLevel: 'low',
        mood: 'peaceful',
        recommendedVisualPace: 'slow-pan',
        visualDescription: 'Quiet resolving final frame',
      },
    ];

    const fileName = durationSeconds >= 300 ? 'Niksa_Cinematic_5Min_Soundtrack.wav' : 'Niksa_Cinematic_Theme_60s.wav';

    return {
      id: `audio_demo_${Date.now()}`,
      fileName,
      duration: durationSeconds,
      bpm,
      sampleRate,
      audioBuffer,
      audioBlob: wavBlob,
      audioUrl,
      waveform,
      sections,
    };
  }

  /**
   * Encodes Float32 PCM channels to WAV Blob
   */
  private static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // RIFF chunk
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
