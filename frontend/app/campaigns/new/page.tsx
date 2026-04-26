import type { Metadata } from "next";
import CampaignForm from "@/components/CampaignForm";

export const metadata: Metadata = { title: "Tạo chiến dịch" };

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Tạo chiến dịch mới</h2>
      <CampaignForm />
    </div>
  );
}
