export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RightsConfirmation {
  id: string;
  user_id: string;
  project_id?: string | null;
  source_type: "upload" | "youtube";
  identifier: string;
  confirmed_at: string;
}

export interface SourceVideo {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  source_url?: string | null;
  audio_storage_path?: string | null;
  created_at: string;
}

export interface Clip {
  id: string;
  project_id: string;
  title: string;
  hook_text: string;
  start_time: number;
  end_time: number;
  duration: number;
  virality_score: number;
  reason?: string | null;
  transcript_excerpt?: string | null;
  status: "suggested" | "editing" | "rendering" | "completed" | "failed";
  rendered_video_path?: string | null;
  thumbnail_path?: string | null;
  created_at: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export interface Transcript {
  id: string;
  project_id: string;
  language: string;
  language_probability?: number | null;
  raw_text: string;
  segments?: TranscriptSegment[];
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  status: "created" | "uploading" | "ready" | "extracting_audio" | "transcribing" | "detecting_highlights" | "failed";
  progress: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  source_video?: SourceVideo | null;
  clips_count: number;
}

export interface UploadProgress {
  uploadId: string;
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  progressPercent: number;
  status: "idle" | "uploading" | "assembling" | "completed" | "error";
  errorMessage?: string;
}

export interface WordItem {
  word: string;
  start: number;
  end: number;
  probability?: number | null;
  deleted?: boolean;
}

export interface CaptionStyle {
  font: string;
  font_size: number;
  primary_color: string;
  highlight_color: string;
  position: "bottom" | "center" | "top";
  box_bg?: string | null;
}

export interface ClipDetail {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  hook_text?: string | null;
  start_time: number;
  end_time: number;
  duration: number;
  virality_score: number;
  reason?: string | null;
  transcript_excerpt?: string | null;
  status: "suggested" | "editing" | "rendering" | "completed" | "failed";
  rendered_video_path?: string | null;
  rendered_video_url?: string | null;
  thumbnail_url?: string | null;
  source_video_url?: string | null;
  source_duration?: number | null;
  source_width?: number | null;
  source_height?: number | null;
  aspect_ratio: "9:16" | "1:1" | "16:9";
  reframe_mode: "auto_face" | "manual" | "blurred_fit" | "center";
  focus_x: number;
  focus_y: number;
  captions_enabled: boolean;
  caption_style: CaptionStyle;
  words: WordItem[];
  title_overlay_text?: string | null;
  music_track_url?: string | null;
  music_volume: number;
  music_ducking: boolean;
  watermark_url?: string | null;
  remove_silence: boolean;
  remove_filler_words: boolean;
}

export interface ClipEditUpdate {
  title?: string;
  start_time?: number;
  end_time?: number;
  aspect_ratio?: "9:16" | "1:1" | "16:9";
  reframe_mode?: "auto_face" | "manual" | "blurred_fit" | "center";
  focus_x?: number;
  focus_y?: number;
  captions_enabled?: boolean;
  caption_style?: CaptionStyle;
  words?: WordItem[];
  title_overlay_text?: string;
  music_track_url?: string;
  music_volume?: number;
  music_ducking?: boolean;
  watermark_url?: string;
  remove_silence?: boolean;
  remove_filler_words?: boolean;
}

export interface ReportPayload {
  report_type: "copyright_dmca" | "inappropriate" | "unauthorized_use" | "other";
  target_type: "clip" | "project" | "share_link" | "general";
  target_id?: string;
  target_url?: string;
  reporter_name: string;
  reporter_email: string;
  original_work_url?: string;
  description: string;
  good_faith_statement: boolean;
}

export interface ReportItem {
  id: string;
  report_type: string;
  target_type: string;
  target_id?: string | null;
  target_url?: string | null;
  reporter_name: string;
  reporter_email: string;
  original_work_url?: string | null;
  description: string;
  good_faith_statement: boolean;
  status: "pending" | "under_review" | "content_removed" | "dismissed";
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}
