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

// ── Seeding: Comments ──────────────────────────────────────────────────────────
export interface SeedComment {
  id: number;
  post_url: string;
  post_id: string;
  comment_content: string;
  account_id: number;
  account_name: string;
  campaign_id?: number | null;
  status: "pending" | "success" | "failed" | "retrying";
  error_msg?: string | null;
  commented_at?: string | null;
  created_at: string;
}

export interface SeedCommentListResponse {
  items: SeedComment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Seeding: Groups ────────────────────────────────────────────────────────────
export type GroupJoinStatus = "pending" | "joined" | "rejected" | "left";

export interface SeedGroup {
  id: number;
  group_id: string;
  group_name: string;
  group_url: string;
  member_count?: number | null;
  account_id: number;
  account_name: string;
  join_status: GroupJoinStatus;
  keyword?: string | null;
  joined_at?: string | null;
  created_at: string;
}

export interface SeedGroupListResponse {
  items: SeedGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Seeding: Keywords ──────────────────────────────────────────────────────────
export type KeywordTarget = "group_search" | "post_comment" | "group_join";

export interface SeedKeyword {
  id: number;
  keyword: string;
  target: KeywordTarget;
  is_active: boolean;
  match_count: number;
  last_scanned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeedKeywordListResponse {
  items: SeedKeyword[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Seeding: Posts ─────────────────────────────────────────────────────────────
export type PostTarget  = "profile" | "group";
export type PostStatus  = "draft" | "scheduled" | "running" | "success" | "failed" | "paused";
export type AITone      = "neutral" | "friendly" | "professional" | "persuasive" | "humorous";

export interface SeedPost {
  id: number;
  title: string;
  content: string;
  ai_tone: AITone;
  target: PostTarget;
  target_ids: string[];
  account_id: number;
  account_name: string;
  status: PostStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  error_msg?: string | null;
  post_count: number;
  success_count: number;
  fail_count: number;
  created_at: string;
  updated_at: string;
}

export interface SeedPostListResponse {
  items: SeedPost[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreatePostPayload {
  title: string;
  content: string;
  ai_tone: AITone;
  target: PostTarget;
  target_ids: string[];
  account_id: number;
  scheduled_at?: string | null;
}

export interface UpdatePostPayload {
  title?: string;
  content?: string;
  ai_tone?: AITone;
  target?: PostTarget;
  target_ids?: string[];
  scheduled_at?: string | null;
  status?: PostStatus;
}

// ── Seeding: Friends ───────────────────────────────────────────────────────────
export type FriendSyncStatus = "pending" | "sent" | "accepted" | "rejected" | "removed";

export interface SeedFriend {
  id: number;
  target_uid: string;
  target_name?: string | null;
  account_id: number;
  account_name: string;
  sync_status: FriendSyncStatus;
  note?: string | null;
  error_msg?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
}

export interface SeedFriendListResponse {
  items: SeedFriend[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateFriendPayload {
  target_uid: string;
  account_id: number;
  note?: string;
}

export interface BulkSyncPayload {
  target_uids: string[];
  account_id: number;
}
