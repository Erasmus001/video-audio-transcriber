
export interface TranscriptSegment {
  timestamp: string;
  text: string;
  seconds: number;
}

export interface Chapter {
  title: string;
  timestamp: string;
  seconds: number;
}

export interface VideoAnalysisData {
  summary: string;
  transcript: TranscriptSegment[];
  topics: string[];
  chapters: Chapter[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type ProjectStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface VideoProject {
  id: string;
  file: File | Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: 'video' | 'audio';
  status: ProjectStatus;
  createdAt: number;
  data?: VideoAnalysisData;
  error?: string;
  previewUrl?: string;
  duration?: number;
  processingTime?: number;
  progress?: number;
  chatHistory?: ChatMessage[];
}

export type ExportFormat = 'json' | 'txt' | 'srt';

export interface CachedProject {
  id: string;
  data: VideoAnalysisData;
  createdAt: number;
  fileName: string;
  fileSize: number;
  duration: number;
}
