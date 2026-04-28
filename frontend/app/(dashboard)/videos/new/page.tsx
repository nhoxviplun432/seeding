import type { Metadata } from "next";
import VideoUpload from "@/components/VideoUpload";

export const metadata: Metadata = { title: "Tải lên video" };

export default function NewVideoPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Tải lên video mới</h2>
      <VideoUpload />
    </div>
  );
}
