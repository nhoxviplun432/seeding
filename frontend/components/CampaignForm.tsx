"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { campaignAPI } from "@/lib/api";
import { ErrorMsg } from "@/components/package/ErrorMsg";

interface FormValues {
  name: string;
  video_id: string;
  scheduled_at: string;
}

export default function CampaignForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    try {
      await campaignAPI.create({
        name: values.name,
        video_id: values.video_id,
        status: "draft",
        scheduled_at: values.scheduled_at || null,
      });
      router.push("/campaigns");
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Tên chiến dịch</label>
        <input
          {...register("name", { required: "Vui lòng nhập tên chiến dịch" })}
          placeholder="Chiến dịch A"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <ErrorMsg msg={errors.name?.message} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Video ID</label>
        <input
          {...register("video_id", { required: "Vui lòng nhập Video ID" })}
          placeholder="video_id"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <ErrorMsg msg={errors.video_id?.message} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Lên lịch (tuỳ chọn)</label>
        <input
          type="datetime-local"
          {...register("scheduled_at")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <ErrorMsg msg={errors.root?.message} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {isSubmitting ? "Đang tạo..." : "Tạo chiến dịch"}
      </button>
    </form>
  );
}
