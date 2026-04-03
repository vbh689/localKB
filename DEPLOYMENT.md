# Production Deployment

## 1. Chuẩn bị

1. Tạo file môi trường production:

   ```bash
   cp .env.production.example .env.production
   ```

2. Cập nhật các giá trị thật trong `.env.production`, đặc biệt là:
   - `APP_URL`
   - `DATA_ROOT`
   - `APP_UID`
   - `APP_GID`
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL`
   - `MEILI_MASTER_KEY`

   Với `MEILISEARCH_URL`, khi app và job chạy qua `docker compose` hãy dùng URL nội bộ giữa containers:

   ```bash
   MEILISEARCH_URL="http://meilisearch:7700"
   ```

   Không dùng `:7702` ở đây vì `7702` chỉ phù hợp cho truy cập từ host nếu bạn tự publish port ra ngoài.

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

   chown -R "${APP_UID}:${APP_GID}" "${DATA_ROOT}/uploads"
   ```

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

   Lệnh này an toàn để chạy nhiều lần. Database mới sẽ tự bỏ qua bước baseline.

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

## 5. Restore

1. Dừng app để tránh ghi mới trong lúc restore:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml stop app
   ```

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
