import type {
  Video,
  VideoListResponse,
  UploadVideoResponse,
  Campaign,
  CampaignListResponse,
  CampaignCreate,
  CampaignUpdate,
  AnalyticsSummary,
  AnalyticsDataPoint,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Videos ─────────────────────────────────────────────────────────────────

export const videoAPI = {
  list: (skip = 0, limit = 20) =>
    request<VideoListResponse>(`/api/videos?skip=${skip}&limit=${limit}`),

  get: (id: number) =>
    request<Video>(`/api/videos/${id}`),

  upload: (formData: FormData) =>
    fetch(`${BASE_URL}/api/videos/upload`, { method: "POST", body: formData })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<UploadVideoResponse>;
      }),
};

// ── Campaigns ──────────────────────────────────────────────────────────────

export const campaignAPI = {
  list: (skip = 0, limit = 20) =>
    request<CampaignListResponse>(`/api/campaigns?skip=${skip}&limit=${limit}`),

  get: (id: number) =>
    request<Campaign>(`/api/campaigns/${id}`),

  create: (payload: CampaignCreate) =>
    request<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: CampaignUpdate) =>
    request<Campaign>(`/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    request<void>(`/api/campaigns/${id}`, { method: "DELETE" }),
};

// ── Analytics ──────────────────────────────────────────────────────────────

export const analyticsAPI = {
  byVideo: (videoId: number) =>
    request<AnalyticsSummary>(`/api/analytics/video/${videoId}`),

  byCampaign: (campaignId: number) =>
    request<AnalyticsDataPoint[]>(`/api/analytics/campaign/${campaignId}`),
};
