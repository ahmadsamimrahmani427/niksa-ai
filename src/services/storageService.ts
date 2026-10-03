import { StudioImage, VideoProject, DesignProject, AppSettings } from '../types';

const STORAGE_KEYS = {
  IMAGES: 'niksa_studio_images',
  VIDEO_PROJECTS: 'niksa_video_projects',
  DESIGN_PROJECTS: 'niksa_design_projects',
  SETTINGS: 'niksa_settings',
  ACTIVE_PROJECT: 'niksa_active_video_project',
};

export const defaultSettings: AppSettings = {
  watermark: true,
  watermarkText: 'Niksa AI Studio • Ahmad Samim Rahmani',
  creatorCredit: 'Created by Ahmad Samim Rahmani',
  defaultResolution: '1080p',
  autoAnalyzeAudio: true,
  preferredEngine: 'gemini',
};

export const StorageService = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return defaultSettings;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  getImages(): StudioImage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.IMAGES);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load images:', e);
    }
    return [];
  },

  saveImage(image: StudioImage): void {
    try {
      const images = this.getImages();
      // Keep most recent 50 images in local cache
      const updated = [image, ...images.filter((img) => img.id !== image.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save image:', e);
    }
  },

  deleteImage(id: string): void {
    try {
      const images = this.getImages().filter((img) => img.id !== id);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(images));
    } catch (e) {
      console.error('Failed to delete image:', e);
    }
  },

  getVideoProjects(): VideoProject[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_PROJECTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load video projects:', e);
    }
    return [];
  },

  saveVideoProject(project: VideoProject): void {
    try {
      const projects = this.getVideoProjects();
      const updated = [project, ...projects.filter((p) => p.id !== project.id)];
      // Remove heavy non-serializable properties if any
      const serializable = updated.map((p) => ({
        ...p,
        audioTrack: p.audioTrack
          ? {
              ...p.audioTrack,
              audioBuffer: null,
              audioBlob: null,
            }
          : null,
      }));
      localStorage.setItem(STORAGE_KEYS.VIDEO_PROJECTS, JSON.stringify(serializable));
    } catch (e) {
      console.error('Failed to save video project:', e);
    }
  },

  deleteVideoProject(id: string): void {
    try {
      const projects = this.getVideoProjects().filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.VIDEO_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to delete video project:', e);
    }
  },

  getDesignProjects(): DesignProject[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DESIGN_PROJECTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load designs:', e);
    }
    return [];
  },

  saveDesignProject(design: DesignProject): void {
    try {
      const designs = this.getDesignProjects();
      const updated = [design, ...designs.filter((d) => d.id !== design.id)];
      localStorage.setItem(STORAGE_KEYS.DESIGN_PROJECTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save design project:', e);
    }
  },

  deleteDesignProject(id: string): void {
    try {
      const designs = this.getDesignProjects().filter((d) => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DESIGN_PROJECTS, JSON.stringify(designs));
    } catch (e) {
      console.error('Failed to delete design project:', e);
    }
  },
};
