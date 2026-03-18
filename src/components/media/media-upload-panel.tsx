"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function MediaUploadPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    try {
      setIsUploading(true);
      setNotice(null);

      const response = await fetch("/api/admin/uploads", {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { url?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error : "Tải ảnh thất bại.");
      }

      setNotice({
        message: "Đã tải ảnh lên thư viện.",
        status: "success",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "Tải ảnh thất bại.",
        status: "error",
      });
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-[1.8rem] border border-line bg-white p-5 shadow-[0_12px_40px_rgba(23,27,32,0.06)]">
      <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
        Upload media
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">
        Tải ảnh vào thư viện chung để tái sử dụng trong articles và FAQs.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-strong"
      >
        {isUploading ? "Đang tải ảnh..." : "Tải ảnh mới"}
      </button>

      {notice ? (
        <p
          className={`mt-4 text-sm ${
            notice.status === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
