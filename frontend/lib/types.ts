export interface Video {
  id: number;
  title: string;
  video_id: string;
  file_path: string;
  status: "pending" | "processing" | "ready" | "error";
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: "draft" | "running" | "paused" | "done";
  video_id: string;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
