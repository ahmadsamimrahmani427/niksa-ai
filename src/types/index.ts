export type AppView = 
  | 'studio' 
  | 'generator' 
  | 'designer' 
  | 'videomaker' 
  | 'assistant' 
  | 'gallery';

export interface StudioImage {
  id: string;
  url: string;
  name: string;
  prompt?: string;
  width: number;
  height: number;
  tags?: string[];
  mood?: 'calm' | 'vibrant' | 'dramatic' | 'joyful' | 'intimate' | 'epic' | 'mysterious';
  visualEnergy?: 'low' | 'medium' | 'high' | 'explosive';
  aspectRatio?: string;
  createdAt: number;
  originalDataUrl?: string;
}

export interface AudioSection {
  id: string;
  sectionName: string;
  startTime: number;
  endTime: number;
  energyLevel: 'low' | 'medium' | 'high' | 'explosive';
  mood: string;
  recommendedVisualPace?: string;
  visualDescription?: string;
}

export interface AudioTrackData {
  id: string;
  fileName: string;
  duration: number;
  bpm: number;
  sampleRate: number;
  audioBuffer?: AudioBuffer | null;
  audioBlob?: Blob | null;
  audioUrl?: string;
  waveform: number[]; // Peak amplitude samples (0 to 1)
  sections: AudioSection[];
}

export type TransitionType = 
  | 'cross-dissolve' 
  | 'fade-black' 
  | 'fade-white' 
  | 'slide-left' 
  | 'slide-right' 
  | 'zoom-in' 
  | 'cinematic-blur';

export type VideoEffectType = 
  | 'none'
  | 'ken-burns-in' 
  | 'ken-burns-out' 
  | 'pan-left' 
  | 'pan-right' 
  | 'cinematic-drift' 
  | 'subtle-pulse'
  | 'glow'
  | 'shake'
  | 'noir'
  | 'warm-cinematic'
  | 'vhs-retro';

export interface TimelineClip {
  id: string;
  imageId: string;
  startTime: number;
  endTime: number;
  duration: number;
  transition: TransitionType;
  transitionDuration?: number; // default 0.8s
  effect: VideoEffectType;
  scale: number; // default 1
  x: number; // default 0
  y: number; // default 0
  rotation: number; // default 0
  opacity: number; // default 1
  filter?: string;
  rationale?: string;
}

export interface VideoProject {
  id: string;
  title: string;
  clips: TimelineClip[];
  audioTrack?: AudioTrackData | null;
  resolution: '1080p' | '720p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1';
  fps: 30 | 60;
  totalDuration: number;
  createdAt: number;
  updatedAt: number;
}

export type DesignLayerType = 'text' | 'image' | 'shape';

export interface BaseDesignLayer {
  id: string;
  name: string;
  type: DesignLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface TextDesignLayer extends BaseDesignLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle?: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  stroke?: { color: string; width: number };
  glow?: boolean;
}

export interface ShapeDesignLayer extends BaseDesignLayer {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'badge' | 'line' | 'star';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface ImageDesignLayer extends BaseDesignLayer {
  type: 'image';
  imageUrl: string;
  mask?: 'none' | 'circle' | 'rounded' | 'star' | 'heart';
  filter?: string;
  brightness?: number;
  contrast?: number;
}

export type DesignLayer = TextDesignLayer | ShapeDesignLayer | ImageDesignLayer;

export interface DesignProject {
  id: string;
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  layers: DesignLayer[];
  createdAt: number;
  updatedAt: number;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestedPrompt?: string;
  action?: {
    type: 'send-to-generator' | 'send-to-designer' | 'send-to-videomaker';
    payload: string;
  };
}

export interface AppSettings {
  watermark: boolean;
  watermarkText: string;
  creatorCredit: string;
  defaultResolution: '1080p' | '720p' | '4k';
  autoAnalyzeAudio: boolean;
  preferredEngine: 'gemini' | 'qwen-neural';
}
