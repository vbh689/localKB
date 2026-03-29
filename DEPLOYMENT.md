# Production Deployment

## 1. Chuẩn bị

1. Tạo file môi trường production:

   ```bash
   cp .env.production.example .env.production
   ```

2. Cập nhật các giá trị thật trong `.env.production`, đặc biệt là:
   - `APP_URL`
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL`
   - `MEILI_MASTER_KEY`

3. Tạo sẵn thư mục dữ liệu trên host:

   ```bash
   mkdir -p app-data/postgres app-data/meilisearch app-data/uploads app-data/backups
   ```

4. Cấu hình reverse proxy hiện có để forward về `127.0.0.1:3000`.

## 2. Bootstrap production

1. Build image:

   ```bash
   docker compose -f docker-compose.prod.yml build
   ```

2. Khởi động hạ tầng:

   ```bash
   docker compose -f docker-compose.prod.yml up -d postgres meilisearch
   ```

3. Chạy migration:

   ```bash
   docker compose -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:deploy
   ```

4. Seed tài khoản admin lần đầu nếu cần:

   ```bash
   docker compose -f docker-compose.prod.yml --profile ops run --rm tools npm run db:seed
   ```

5. Khởi động app:

   ```bash
   docker compose -f docker-compose.prod.yml up -d app
   ```

6. Kiểm tra sức khỏe hệ thống:

   ```bash
   curl http://127.0.0.1:3000/api/health
   docker compose -f docker-compose.prod.yml ps
   ```

## 3. Quy trình release

1. Backup trước khi release:

   ```bash
   ./scripts/ops/backup-postgres.sh
   ./scripts/ops/backup-uploads.sh
   ```

2. Rebuild image:

   ```bash
   docker compose -f docker-compose.prod.yml build app tools
   ```

3. Chạy migration production:

   ```bash
   docker compose -f docker-compose.prod.yml --profile ops run --rm tools npm run db:migrate:deploy
   ```

4. Cập nhật app:

   ```bash
   docker compose -f docker-compose.prod.yml up -d app
   ```

5. Xác nhận app healthy:

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

Backup sẽ nằm dưới `app-data/backups/`.

## 5. Restore

1. Dừng app để tránh ghi mới trong lúc restore:

   ```bash
   docker compose -f docker-compose.prod.yml stop app
   ```

2. Restore PostgreSQL:

   ```bash
   ./scripts/ops/restore-postgres.sh app-data/backups/postgres/<file>.sql.gz
   ```

3. Restore uploads:

   ```bash
   ./scripts/ops/restore-uploads.sh app-data/backups/uploads/<file>.tar.gz
   ```

4. Khởi động lại app:

   ```bash
   docker compose -f docker-compose.prod.yml up -d app
   ```

5. Rebuild search index từ DB:

   ```bash
   docker compose -f docker-compose.prod.yml --profile ops run --rm tools npm run search:reindex
   ```

## 6. Cấu trúc dữ liệu production

```text
app-data/
  backups/
    postgres/
    uploads/
  meilisearch/
  postgres/
  uploads/
```
