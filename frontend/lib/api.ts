import axios from "axios";
import { getToken } from "./auth";
import type {
  Video, Campaign,
  SeedComment, SeedCommentListResponse,
  SeedGroup, SeedGroupListResponse,
  SeedKeyword, SeedKeywordListResponse,
  KeywordTarget,
  SeedPost, SeedPostListResponse,
  CreatePostPayload, UpdatePostPayload,
  PostTarget, PostStatus,
  SeedFriend, SeedFriendListResponse,
  CreateFriendPayload, BulkSyncPayload,
  FriendSyncStatus,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const client = axios.create({ baseURL: `${API_URL}/api` });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const videoAPI = {
  upload: async (formData: FormData): Promise<{ video_id: string }> => {
    const res = await client.post<{ video_id: string }>("/videos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getById: async (id: number): Promise<Video> => {
    const res = await client.get<Video>(`/videos/${id}`);
    return res.data;
  },

  list: async (): Promise<Video[]> => {
    const res = await client.get<Video[]>("/videos/");
    return res.data;
  },
};

export const campaignAPI = {
  list: async (): Promise<Campaign[]> => {
    const res = await client.get<Campaign[]>("/campaigns/");
    return res.data;
  },

  getById: async (id: number): Promise<Campaign> => {
    const res = await client.get<Campaign>(`/campaigns/${id}`);
    return res.data;
  },

  create: async (payload: Omit<Campaign, "id" | "created_at" | "updated_at">): Promise<Campaign> => {
    const res = await client.post<Campaign>("/campaigns/", payload);
    return res.data;
  },
};

// ── Seeding: Comments ──────────────────────────────────────────────────────────
export interface CommentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: SeedComment["status"] | "all";
  account_id?: number;
}

export const commentAPI = {
  list: async (params: CommentListParams = {}): Promise<SeedCommentListResponse> => {
    const res = await client.get<SeedCommentListResponse>("/seeding/comments/", { params });
    return res.data;
  },
  getById: async (id: number): Promise<SeedComment> => {
    const res = await client.get<SeedComment>(`/seeding/comments/${id}`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await client.delete(`/seeding/comments/${id}`);
  },
};

// ── Seeding: Groups ────────────────────────────────────────────────────────────
export interface GroupListParams {
  page?: number;
  page_size?: number;
  search?: string;
  join_status?: SeedGroup["join_status"] | "all";
  account_id?: number;
}

export const groupAPI = {
  list: async (params: GroupListParams = {}): Promise<SeedGroupListResponse> => {
    const res = await client.get<SeedGroupListResponse>("/seeding/groups/", { params });
    return res.data;
  },
  getById: async (id: number): Promise<SeedGroup> => {
    const res = await client.get<SeedGroup>(`/seeding/groups/${id}`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await client.delete(`/seeding/groups/${id}`);
  },
};

// ── Seeding: Keywords ──────────────────────────────────────────────────────────
export interface KeywordListParams {
  page?: number;
  page_size?: number;
  search?: string;
  target?: KeywordTarget | "all";
  is_active?: boolean | "all";
}

export interface CreateKeywordPayload {
  keyword: string;
  target: KeywordTarget;
  is_active?: boolean;
}

export interface UpdateKeywordPayload {
  keyword?: string;
  target?: KeywordTarget;
  is_active?: boolean;
}

export const keywordAPI = {
  list: async (params: KeywordListParams = {}): Promise<SeedKeywordListResponse> => {
    const res = await client.get<SeedKeywordListResponse>("/seeding/keywords/", { params });
    return res.data;
  },
  getById: async (id: number): Promise<SeedKeyword> => {
    const res = await client.get<SeedKeyword>(`/seeding/keywords/${id}`);
    return res.data;
  },
  create: async (payload: CreateKeywordPayload): Promise<SeedKeyword> => {
    const res = await client.post<SeedKeyword>("/seeding/keywords/", payload);
    return res.data;
  },
  update: async (id: number, payload: UpdateKeywordPayload): Promise<SeedKeyword> => {
    const res = await client.patch<SeedKeyword>(`/seeding/keywords/${id}`, payload);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await client.delete(`/seeding/keywords/${id}`);
  },
};

// ── Seeding: Posts ─────────────────────────────────────────────────────────────
export interface PostListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: PostStatus | "all";
  target?: PostTarget | "all";
  account_id?: number;
}

export const postAPI = {
  list: async (params: PostListParams = {}): Promise<SeedPostListResponse> => {
    const res = await client.get<SeedPostListResponse>("/seeding/posts/", { params });
    return res.data;
  },
  getById: async (id: number): Promise<SeedPost> => {
    const res = await client.get<SeedPost>(`/seeding/posts/${id}`);
    return res.data;
  },
  create: async (payload: CreatePostPayload): Promise<SeedPost> => {
    const res = await client.post<SeedPost>("/seeding/posts/", payload);
    return res.data;
  },
  update: async (id: number, payload: UpdatePostPayload): Promise<SeedPost> => {
    const res = await client.patch<SeedPost>(`/seeding/posts/${id}`, payload);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await client.delete(`/seeding/posts/${id}`);
  },
  run: async (id: number): Promise<void> => {
    await client.post(`/seeding/posts/${id}/run`);
  },
  pause: async (id: number): Promise<void> => {
    await client.post(`/seeding/posts/${id}/pause`);
  },
};

// ── Seeding: Friends ───────────────────────────────────────────────────────────
export interface FriendListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sync_status?: FriendSyncStatus | "all";
  account_id?: number;
}

export const friendAPI = {
  list: async (params: FriendListParams = {}): Promise<SeedFriendListResponse> => {
    const res = await client.get<SeedFriendListResponse>("/seeding/friends/", { params });
    return res.data;
  },
  getById: async (id: number): Promise<SeedFriend> => {
    const res = await client.get<SeedFriend>(`/seeding/friends/${id}`);
    return res.data;
  },
  create: async (payload: CreateFriendPayload): Promise<SeedFriend> => {
    const res = await client.post<SeedFriend>("/seeding/friends/", payload);
    return res.data;
  },
  bulkSync: async (payload: BulkSyncPayload): Promise<{ synced: number }> => {
    const res = await client.post<{ synced: number }>("/seeding/friends/bulk-sync", payload);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await client.delete(`/seeding/friends/${id}`);
  },
};
