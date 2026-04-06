# Production Deployment

## 1. Chuẩn bị

1. Tạo file môi trường production:

   ```bash
   cp .env.production.example .env.production
   ```

2. Cập nhật các giá trị thật trong `.env.production`, đặc biệt là:

   | Biến | Mô tả |
   |------|-------|
   | `APP_URL` | URL công khai của ứng dụng (ví dụ: `https://kb.example.com`) |
   | `DATA_ROOT` | Đường dẫn lưu trữ dữ liệu persistent trên host (mặc định: `./app-data`) |
   | `APP_UID` | UID của host user sở hữu thư mục uploads (xem bằng `id -u`) |
   | `APP_GID` | GID của host group tương ứng (xem bằng `id -g`) |
   | `POSTGRES_PASSWORD` | Mật khẩu database |
   | `DATABASE_URL` | Connection string tới PostgreSQL, ví dụ: `postgresql://localkb:<password>@postgres:5432/localkb?schema=public` |
   | `MEILI_MASTER_KEY` | Khóa chính cho Meilisearch, dùng cho xác thực API |
   | `MEILISEARCH_URL` | URL nội bộ giữa các container, dùng `http://meilisearch:7700` |

   Với `MEILISEARCH_URL`, khi app và job chạy qua `docker compose` hãy dùng URL nội bộ giữa containers:

   ```bash
   MEILISEARCH_URL="http://meilisearch:7700"
   ```

   Không dùng `:7702`, `7702` chỉ phù hợp cho truy cập từ host nếu publish port ra ngoài.

   Để `APP_UID` và `APP_GID` tự khớp với máy đang deploy, lấy từ host user hiện tại rồi ghi vào `.env.production`:

   ```bash
   APP_UID="$(id -u)"
   APP_GID="$(id -g)"

   sed -i.bak \
     -e "s/^APP_UID=.*/APP_UID=\"${APP_UID}\"/" \
     -e "s/^APP_GID=.*/APP_GID=\"${APP_GID}\"/" \
     .env.production
   rm -f .env.production.bak
   ```

3. Tạo sẵn thư mục dữ liệu trên host:

   ```bash
   set -a
   . ./.env.production
   set +a

   mkdir -p \
     "${DATA_ROOT}/postgres" \
     "${DATA_ROOT}/meilisearch" \
     "${DATA_ROOT}/uploads" \
     "${DATA_ROOT}/backups/postgres" \
     "${DATA_ROOT}/backups/uploads"

   sudo chown -R "${APP_UID}:${APP_GID}" "${DATA_ROOT}/uploads"
   ```

   > **Lưu ý:** `APP_UID` và `APP_GID` phải khớp với user/group sở hữu `${DATA_ROOT}/uploads` trên host. Trên Linux thường là `1000:1000`; trên macOS user đầu tiên thường là `501:20`. Nếu upload media trả về `Image upload failed` và log có `EACCES: permission denied, mkdir '/app/public/uploads/...'`, kiểm tra bằng `ls -ldn "${DATA_ROOT}/uploads"` rồi chạy lại `sudo chown -R "$(id -u):$(id -g)" "${DATA_ROOT}/uploads"` nếu đang deploy local bằng user hiện tại.

4. Cấu hình reverse proxy hiện có để forward về `127.0.0.1:3000`.

## 2. Bootstrap production

1. Build image:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml build
   ```

2. Khởi động hạ tầng:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres meilisearch
   ```

3. Chuẩn bị migration metadata cho các hệ thống cũ đã từng dùng `db:push`:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:prepare
   ```

   > **`--profile ops`**: kích hoạt container `tools` — dùng cho các tác vụ one-off như migration, seed, hoặc reindex search index. Container này không chạy liên tục.
   >
   > **`db:migrate:prepare`**: baseline database hiện tại để chuyển sang hệ thống Prisma migration. Lệnh này an toàn để chạy nhiều lần. Database mới hoàn toàn sẽ tự bỏ qua bước này. Chỉ cần chạy **một lần** khi lần đầu migrate từ hệ thống dùng `db:push`.

4. Chạy migration:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:deploy
   ```

5. Seed tài khoản admin lần đầu nếu cần:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run db:seed
   ```

6. Khởi động app:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
   ```

7. Kiểm tra sức khỏe hệ thống:

   ```bash
   curl http://127.0.0.1:3000/api/health
   docker compose --env-file .env.production -f docker-compose.prod.yml ps
   ```

## 3. Quy trình release

1. Backup trước khi release:

   ```bash
   ./scripts/ops/backup-postgres.sh
   ./scripts/ops/backup-uploads.sh
   ```

2. Rebuild image:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml build app tools
   ```

3. Chuẩn bị migration metadata nếu release này là lần đầu đi qua hệ migration:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:prepare
   ```

   > **Chỉ cần chạy bước này một lần** khi lần đầu chuyển sang hệ thống Prisma migration. Các release sau nếu đã có migration metadata thì bỏ qua.

4. Chạy migration production:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:deploy
   ```

5. Cập nhật app:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
   ```

6. Xác nhận app healthy:

   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

## 4. Backup thủ công

- PostgreSQL:

  ```bash
  ./scripts/ops/backup-postgres.sh
  ```

- Uploads:

  ```bash
  ./scripts/ops/backup-uploads.sh
  ```

Backup sẽ nằm dưới `${DATA_ROOT}/backups/` trong `.env.production` (mặc định là `./app-data/backups/`).

**Định dạng tên file backup:**

| Loại | Định dạng | Ví dụ |
|------|-----------|-------|
| PostgreSQL | `localkb-postgres-YYYYMMDD-HHMMSS.sql.gz` | `localkb-postgres-20260406-143022.sql.gz` |
| Uploads | `localkb-uploads-YYYYMMDD-HHMMSS.tar.gz` | `localkb-uploads-20260406-143022.tar.gz` |

## 5. Restore

1. Dừng app để tránh ghi mới trong lúc restore:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml stop app
   ```

   > **Tại sao dừng app?** Trong quá trình restore, database và file uploads ở trạng thái không nhất quán. Nếu app vẫn chạy, user có thể tạo dữ liệu mới bị mất hoặc gây xung đột với dữ liệu đang được khôi phục.

2. Nạp biến môi trường nếu bạn dùng `DATA_ROOT` khác mặc định:

   ```bash
   set -a
   . ./.env.production
   set +a
   ```

3. Restore PostgreSQL:

   ```bash
   ./scripts/ops/restore-postgres.sh "${DATA_ROOT:-./app-data}/backups/postgres/<file>.sql.gz"
   ```

4. Restore uploads:

   ```bash
   ./scripts/ops/restore-uploads.sh "${DATA_ROOT:-./app-data}/backups/uploads/<file>.tar.gz"
   ```

5. Khởi động lại app:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
   ```

6. Rebuild search index từ DB:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm tools npm run search:reindex
   ```

   > **Tại sao rebuild search index?** Meilisearch không được backup trực tiếp — chỉ có PostgreSQL và uploads được backup. Search index được rebuild hoàn toàn từ dữ liệu trong database, nên bước này đảm bảo kết quả tìm kiếm đồng bộ sau khi restore.

## 6. Cấu trúc dữ liệu production

```text
${DATA_ROOT}/
  backups/
    postgres/
    uploads/
  meilisearch/
  postgres/
  uploads/
```

## 7. Lưu ý về backup

- **Meilisearch không có backup riêng**: Search index được rebuild từ PostgreSQL bằng `npm run search:reindex`. Không cần backup thư mục `meilisearch/`.
- **Xoay vòng backup**: Các script backup không tự động xóa file cũ. Nên định kỳ dọn dẹp backup cũ để tiết kiệm disk, ví dụ:

  ```bash
  # Xóa backup PostgreSQL cũ hơn 30 ngày
  find "${DATA_ROOT}/backups/postgres" -name "*.sql.gz" -mtime +30 -delete

  # Xóa backup uploads cũ hơn 30 ngày
  find "${DATA_ROOT}/backups/uploads" -name "*.tar.gz" -mtime +30 -delete
  ```

- **Backup tự động**: Có thể thêm cron job để backup định kỳ hàng ngày trước khi release.
