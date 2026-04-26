// ── Enums ──────────────────────────────────────────────────────────────────

export type VideoStatus = "draft" | "processing" | "scheduled" | "published" | "failed";
export type CampaignStatus = "draft" | "running" | "paused" | "completed" | "failed";

// ── Video ──────────────────────────────────────────────────────────────────

export interface Video {
  id: number;
  facebook_video_id: string | null;
  page_id: string;
  file_size: number | null;
  duration: number | null;
  thumbnail_path: string | null;
  title: string;
  description: string | null;
  tags: string[];
  status: VideoStatus;
  scheduled_time: string | null;
  published_time: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface VideoListResponse {
  items: Video[];
  total: number;
}

export interface UploadVideoResponse {
  success: boolean;
  video_id: number;
  task_id: string;
}

// ── Campaign ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: number;
  video_id: number;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_accounts: string[];
  proxy_pool: string[];
  schedule_at: string | null;
  max_concurrent: number;
  delay_min: number;
  delay_max: number;
  created_at: string;
  updated_at: string | null;
}

export interface CampaignListResponse {
  items: Campaign[];
  total: number;
}

export interface CampaignCreate {
  video_id: number;
  name: string;
  description?: string;
  target_accounts?: string[];
  proxy_pool?: string[];
  schedule_at?: string;
  max_concurrent?: number;
  delay_min?: number;
  delay_max?: number;
}

export interface CampaignUpdate {
  name?: string;
  description?: string;
  target_accounts?: string[];
  proxy_pool?: string[];
  schedule_at?: string;
  max_concurrent?: number;
  delay_min?: number;
  delay_max?: number;
  status?: CampaignStatus;
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsDataPoint {
  id: number;
  video_id: number;
  campaign_id: number | null;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  collected_at: string;
}

export interface AnalyticsSummary {
  video_id: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  total_comments: number;
  total_reach: number;
  data_points: AnalyticsDataPoint[];
}
