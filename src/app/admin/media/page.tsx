import Image from "next/image";
import { Role } from "@prisma/client";
import { MediaItemActions } from "@/components/media/media-item-actions";
import { MediaUploadPanel } from "@/components/media/media-upload-panel";
import { requireRoles } from "@/lib/auth/session";
import { formatFileSize, getUploadedMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMediaPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const resolvedSearchParams = await searchParams;
  const query = getParam(resolvedSearchParams.q)?.trim() ?? "";
  const mediaItems = await getUploadedMedia(query);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <MediaUploadPanel />

        <div className="glass-panel rounded-[1.8rem] p-6">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Media library
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Kết quả</p>
              <p className="mt-2 text-3xl font-semibold">{mediaItems.length}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Filter</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {query || "Tất cả file"}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Loại</p>
              <p className="mt-2 text-sm font-medium text-foreground">Ảnh Markdown</p>
            </div>
          </div>

          <form className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Tìm theo tên file hoặc đường dẫn"
              className="min-w-[280px] flex-1 rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
            >
              Tìm media
            </button>
          </form>
        </div>
      </div>

      {mediaItems.length === 0 ? (
        <div className="glass-panel rounded-[1.8rem] p-10 text-center">
          <p className="text-lg font-medium">
            {query ? "Không tìm thấy file nào khớp bộ lọc." : "Chưa có file nào trong thư viện."}
          </p>
          <p className="mt-2 text-sm text-muted">
            Tải ảnh lên ở khung bên trái để bắt đầu xây dựng media library nội bộ.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mediaItems.map((item) => (
            <article key={item.url} className="glass-panel overflow-hidden rounded-[1.8rem]">
              <div className="relative aspect-[4/3] bg-background">
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1280px) 28vw, (min-width: 768px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <p className="truncate text-sm font-medium text-foreground">{item.fileName}</p>
                  <p className="text-xs leading-6 text-muted">{item.relativePath}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{item.updatedAt.toLocaleString("vi-VN")}</span>
                </div>

                <MediaItemActions alt={item.alt} url={item.url} />

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-medium text-accent-strong"
                >
                  Mở file gốc
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
