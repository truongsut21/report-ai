// ============================================================
// Shared TypeScript interfaces for Blog Post Video Generator
// ============================================================

/** Video script content section (mapped from blog H2 headings) */
export interface ScriptContentSection {
  title: string;
  narration: string;
  highlights: string[];
  duration: number;
  keywords?: string[];
}

/** Video script section */
export interface ScriptSection {
  text: string;
  duration: number;
  keywords?: string[];
}

/** Complete video script */
export interface VideoScript {
  intro: ScriptSection;
  toc: ScriptSection;
  sections: ScriptContentSection[];
  summary: ScriptSection;
  closing: ScriptSection;
  totalDuration: number;
  generatedAt: string;
  tone: ScriptTone;
  articleStats?: {
    wordCount: number;
    imageCount: number;
    headingCount: number;
    linkCount: number;
  };
}

/** Script tone options */
export type ScriptTone = 'review' | 'summary' | 'tutorial';

/** Audio file info */
export interface AudioFile {
  path: string;
  duration: number;
  sectionId: string;
}

/** Stock media asset */
export interface StockMedia {
  type: 'image' | 'video';
  url: string;
  localPath: string;
  source: 'pexels' | 'pixabay';
  photographer?: string;
  query: string;
  width: number;
  height: number;
}

/** Sound effect definition */
export interface SoundEffect {
  name: string;
  path: string;
  duration: number;
  type: 'whoosh' | 'notification' | 'typing' | 'success' | 'pop' | 'custom';
}

/** Scene in the video composition */
export interface VideoScene {
  id: string;
  startTime: number;
  duration: number;
  narrationAudio?: AudioFile;
  background?: StockMedia;
  sfx?: SoundEffect[];
  title?: string;
  subtitle?: string;
  highlights?: string[];
  type: 'intro' | 'toc' | 'section' | 'content' | 'summary' | 'closing';
  sectionIndex?: number;
}

/** Complete video composition config */
export interface VideoComposition {
  scenes: VideoScene[];
  backgroundMusic?: { path: string; volume: number };
  totalDuration: number;
  width: number;
  height: number;
  outputPath: string;
}

/** CLI options */
export interface CLIOptions {
  preview: boolean;
  render: boolean;
  output: string;
  voice: string;
  style: string;
  tone: ScriptTone;
  noMedia: boolean;
  noSfx: boolean;
  noCache: boolean;
}

/** Pipeline result */
export interface PipelineResult {
  script: VideoScript;
  audioFiles: AudioFile[];
  mediaAssets: StockMedia[];
  composition: VideoComposition;
  outputPath?: string;
  duration: number;
}
