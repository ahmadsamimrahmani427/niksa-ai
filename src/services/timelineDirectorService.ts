import { StudioImage, AudioTrackData, AudioSection, TimelineClip, VideoEffectType, TransitionType } from '../types';

export class TimelineDirectorService {
  /**
   * Fast client-side image visual feature analysis
   */
  public static async analyzeImageClientSide(imgEl: HTMLImageElement, name: string): Promise<{
    mood: StudioImage['mood'];
    visualEnergy: StudioImage['visualEnergy'];
    brightness: number;
    warmth: number;
  }> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { mood: 'vibrant', visualEnergy: 'medium', brightness: 0.5, warmth: 0.5 };
      }

      ctx.drawImage(imgEl, 0, 0, 64, 64);
      const imgData = ctx.getImageData(0, 0, 64, 64).data;

      let totalBrightness = 0;
      let totalRed = 0;
      let totalBlue = 0;
      let totalSaturation = 0;
      const pixelCount = 64 * 64;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i] / 255;
        const g = imgData[i + 1] / 255;
        const b = imgData[i + 2] / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (max + min) / 2;
        const sat = max === min ? 0 : lum > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);

        totalBrightness += lum;
        totalRed += r;
        totalBlue += b;
        totalSaturation += sat;
      }

      const avgBrightness = totalBrightness / pixelCount;
      const avgSaturation = totalSaturation / pixelCount;
      const avgWarmth = (totalRed - totalBlue) / pixelCount;

      let visualEnergy: StudioImage['visualEnergy'] = 'medium';
      if (avgSaturation > 0.45 && avgBrightness > 0.5) visualEnergy = 'high';
      else if (avgSaturation > 0.6) visualEnergy = 'explosive';
      else if (avgBrightness < 0.35 || avgSaturation < 0.25) visualEnergy = 'low';

      let mood: StudioImage['mood'] = 'vibrant';
      if (avgBrightness < 0.3) mood = 'dramatic';
      else if (avgBrightness > 0.7 && avgWarmth > 0) mood = 'joyful';
      else if (avgSaturation < 0.2) mood = 'calm';
      else if (avgWarmth > 0.15) mood = 'epic';
      else mood = 'vibrant';

      return {
        mood,
        visualEnergy,
        brightness: avgBrightness,
        warmth: avgWarmth,
      };
    } catch {
      return { mood: 'vibrant', visualEnergy: 'medium', brightness: 0.5, warmth: 0.5 };
    }
  }

  /**
   * The Core Automatic Director: generateTimeline(images, audioAnalysis)
   * Guarantees 100% audio coverage, matches visual energy to audio sections,
   * utilizes ALL uploaded images, and applies cinematic transitions and effects.
   */
  public static async generateTimeline(
    images: StudioImage[],
    audioTrack: AudioTrackData,
    onProgress?: (msg: string) => void
  ): Promise<TimelineClip[]> {
    if (!images || images.length === 0) {
      throw new Error('At least one image is required to generate a timeline');
    }

    const totalDuration = audioTrack.duration || 60;
    const count = images.length;

    onProgress?.(`AI Director analyzing ${count} images & song sections...`);

    // Try server-side director AI if available
    try {
      const summaries = images.map((img) => ({
        id: img.id,
        name: img.name,
        mood: img.mood || 'vibrant',
        visualEnergy: img.visualEnergy || 'medium',
      }));

      const res = await fetch('/api/timeline/generate-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageSummaries: summaries,
          audioSections: audioTrack.sections,
          totalDuration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.clips && Array.isArray(data.clips) && data.clips.length === count) {
          // Normalize AI returned clips to guarantee exact precision
          let curTime = 0;
          const normalized: TimelineClip[] = data.clips.map((clip: any, idx: number) => {
            const rawDur = Math.max(1.5, Number(clip.duration) || totalDuration / count);
            const start = curTime;
            const end = idx === count - 1 ? totalDuration : curTime + rawDur;
            curTime = end;
            return {
              id: `clip_${idx}_${Date.now()}`,
              imageId: clip.imageId || images[idx].id,
              startTime: Math.round(start * 100) / 100,
              endTime: Math.round(end * 100) / 100,
              duration: Math.round((end - start) * 100) / 100,
              transition: (clip.transition as TransitionType) || 'cross-dissolve',
              transitionDuration: 0.8,
              effect: (clip.effect as VideoEffectType) || 'ken-burns-in',
              scale: 1,
              x: 0,
              y: 0,
              rotation: 0,
              opacity: 1,
              rationale: clip.rationale || 'AI section alignment',
            };
          });

          // Ensure last clip ends at totalDuration
          if (normalized.length > 0) {
            normalized[0].startTime = 0;
            normalized[normalized.length - 1].endTime = totalDuration;
            normalized[normalized.length - 1].duration = Math.max(
              1,
              totalDuration - normalized[normalized.length - 1].startTime
            );
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn('Server AI director endpoint deferred to algorithmic director:', e);
    }

    // High-Precision Algorithmic Musical Director
    return this.generateAlgorithmicTimeline(images, audioTrack);
  }

  /**
   * Deterministic High-Precision Musical Director:
   * Sorts & pairs images to audio sections according to energy curves,
   * calculates dynamic pacing, and allocates time seamlessly.
   */
  private static generateAlgorithmicTimeline(
    images: StudioImage[],
    audioTrack: AudioTrackData
  ): TimelineClip[] {
    const totalDuration = audioTrack.duration || 60;
    const count = images.length;
    const sections = audioTrack.sections || [];

    // Separate images by visual energy
    const lowEnergyImages = images.filter((img) => img.visualEnergy === 'low' || img.mood === 'calm');
    const highEnergyImages = images.filter((img) => img.visualEnergy === 'high' || img.visualEnergy === 'explosive' || img.mood === 'epic');
    const midEnergyImages = images.filter((img) => !lowEnergyImages.includes(img) && !highEnergyImages.includes(img));

    // Create an intelligent ordered list of images matching the musical arc
    const orderedImages: StudioImage[] = [];
    const usedIds = new Set<string>();

    const pickImage = (pool: StudioImage[]): StudioImage | null => {
      const candidate = pool.find((img) => !usedIds.has(img.id));
      if (candidate) {
        usedIds.add(candidate.id);
        return candidate;
      }
      return null;
    };

    // Allocate images to sections
    for (let i = 0; i < count; i++) {
      const approximateTime = (i / count) * totalDuration;
      const currentSection = sections.find(
        (s) => approximateTime >= s.startTime && approximateTime <= s.endTime
      ) || { energyLevel: 'medium', sectionName: 'Verse' };

      let selected: StudioImage | null = null;
      if (currentSection.energyLevel === 'high' || currentSection.energyLevel === 'explosive') {
        selected = pickImage(highEnergyImages) || pickImage(midEnergyImages) || pickImage(lowEnergyImages);
      } else if (currentSection.energyLevel === 'low') {
        selected = pickImage(lowEnergyImages) || pickImage(midEnergyImages) || pickImage(highEnergyImages);
      } else {
        selected = pickImage(midEnergyImages) || pickImage(highEnergyImages) || pickImage(lowEnergyImages);
      }

      // If all sorted pools exhausted, pick any remaining
      if (!selected) {
        selected = images.find((img) => !usedIds.has(img.id)) || images[i % images.length];
        usedIds.add(selected.id);
      }

      orderedImages.push(selected);
    }

    // Now calculate clip durations proportional to section energy
    // Chorus sections get slightly snappier cuts, Verses/Intros get longer holds
    const baseDuration = totalDuration / count;
    const rawDurations: number[] = [];

    for (let i = 0; i < count; i++) {
      const approximateTime = (i / count) * totalDuration;
      const currentSection = sections.find(
        (s) => approximateTime >= s.startTime && approximateTime <= s.endTime
      );

      if (currentSection?.energyLevel === 'explosive') {
        rawDurations.push(baseDuration * 0.75); // Faster cut
      } else if (currentSection?.energyLevel === 'high') {
        rawDurations.push(baseDuration * 0.88);
      } else if (currentSection?.energyLevel === 'low') {
        rawDurations.push(baseDuration * 1.25); // Slower contemplation
      } else {
        rawDurations.push(baseDuration);
      }
    }

    // Normalize so sum(durations) === totalDuration EXACTLY
    const totalRaw = rawDurations.reduce((sum, d) => sum + d, 0);
    const scaleFactor = totalDuration / totalRaw;

    const clips: TimelineClip[] = [];
    let currentTime = 0;

    const effectsCycle: VideoEffectType[] = [
      'ken-burns-in',
      'pan-right',
      'ken-burns-out',
      'pan-left',
      'cinematic-drift',
      'subtle-pulse',
    ];

    const transitionsCycle: TransitionType[] = [
      'cross-dissolve',
      'slide-left',
      'cross-dissolve',
      'zoom-in',
      'cross-dissolve',
      'fade-black',
    ];

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const dur = isLast
        ? Math.max(1, totalDuration - currentTime)
        : Math.round(rawDurations[i] * scaleFactor * 100) / 100;

      const startTime = Math.round(currentTime * 100) / 100;
      const endTime = isLast ? totalDuration : Math.round((startTime + dur) * 100) / 100;

      // Select dynamic transition and effect based on section
      const approxTime = startTime;
      const currentSection = sections.find(
        (s) => approxTime >= s.startTime && approxTime <= s.endTime
      );

      let effect: VideoEffectType = effectsCycle[i % effectsCycle.length];
      let transition: TransitionType = transitionsCycle[i % transitionsCycle.length];

      if (currentSection?.energyLevel === 'explosive' || currentSection?.energyLevel === 'high') {
        effect = i % 2 === 0 ? 'ken-burns-in' : 'subtle-pulse';
        transition = i % 2 === 0 ? 'zoom-in' : 'slide-left';
      } else if (currentSection?.energyLevel === 'low') {
        effect = 'ken-burns-out';
        transition = 'cross-dissolve';
      }

      clips.push({
        id: `clip_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        imageId: orderedImages[i].id,
        startTime,
        endTime,
        duration: Math.round((endTime - startTime) * 100) / 100,
        transition,
        transitionDuration: Math.min(1.2, dur * 0.25),
        effect,
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        rationale: `Matched to ${currentSection?.sectionName || 'Musical Section'} (${currentSection?.mood || 'Cinematic'})`,
      });

      currentTime = endTime;
    }

    return clips;
  }
}
