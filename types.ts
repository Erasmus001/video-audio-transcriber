export interface TranscriptSegment {
  timestamp: string;
  text: string;
  seconds: number;
}

export interface VideoAnalysisData {
  summary: string;
  transcript: TranscriptSegment[];
  topics: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppState {
  IDLE,
  PROCESSING,
  ANALYZED,
  ERROR
}

export type ProjectStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface VideoProject {
  id: string;
  file: File | Blob; // Can be a File object or a Blob from URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: 'video' | 'audio';
  status: ProjectStatus;
  createdAt: number;
  data?: VideoAnalysisData;
  error?: string;
  previewUrl?: string;
  duration?: number; // Duration in seconds
  processingTime?: number; // Time taken to process in ms
  sourceUrl?: string; // Original URL if uploaded via link
}

export type ExportFormat = 'json' | 'txt' | 'srt';

export interface CachedProject {
  id: string; // Composite key: name_size_duration
  data: VideoAnalysisData;
  createdAt: number;
  fileName: string;
  fileSize: number;
  duration: number;
}