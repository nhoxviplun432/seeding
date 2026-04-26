import axios from "axios";
import { getToken } from "./auth";
import type { Video, Campaign } from "./types";

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
