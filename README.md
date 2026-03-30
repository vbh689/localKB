# LocalKB

LocalKB là ứng dụng wiki / knowledge base / FAQ nội bộ cho công ty, xây dựng bằng `Next.js`, `Prisma`, `PostgreSQL` và `Meilisearch`.

Ứng dụng cung cấp một điểm vào chung để tra cứu tài liệu nội bộ, câu hỏi thường gặp và nội dung quản trị với giao diện public-facing rõ ràng cho người dùng cuối và CMS riêng cho đội vận hành.

## Giao diện nhanh

<p align="center">
  <img src="./public/readme/home.png" alt="Homepage LocalKB" width="48%" />
  <img src="./public/readme/kb.png" alt="Knowledge Base listing" width="48%" />
</p>
<p align="center">
  <img src="./public/readme/faq.png" alt="FAQ listing" width="48%" />
  <img src="./public/readme/login.png" alt="Login page" width="48%" />
</p>

## Tính năng hiện có

- Đăng nhập nội bộ bằng `email/password` và session `HttpOnly cookie`
- Homepage có `instant search`
- Trang public cho `wiki`, `FAQ` và `search`
- Admin CMS cho `articles`, `FAQs`, `categories`, `tags`, `users`
- Xuất bản / ẩn bài và đồng bộ nội dung `published` sang `Meilisearch`
- Search logs và dashboard usage trong admin
- Revision history, compare preview và khôi phục revision cho article / FAQ

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `Meilisearch`
- `Docker Compose`

## Yêu cầu

- `Node.js 22+`
- `npm`
- `Docker` và `Docker Compose`

## Cài đặt nhanh

1. Cài dependencies

```bash
npm install
```

2. Tạo file env

```bash
cp .env.example .env
```

3. Chạy hạ tầng local

```bash
docker compose up -d
```

4. Tạo Prisma Client, đẩy schema và seed dữ liệu

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Chạy app

```bash
npm run dev
```

App mặc định chạy tại [http://localhost:3000](http://localhost:3000).

## Tài khoản mặc định sau khi seed

- Email: `admin@localkb.internal`
- Password: `ChangeMe123!`

Giá trị này được đọc từ `.env`:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Biến .env

Mẫu biến môi trường nằm trong [.env.example](./.env.example).

```env
APP_URL="http://localhost:3000"

DATABASE_URL="postgresql://localkb:localkb@localhost:5432/localkb?schema=public"
SESSION_COOKIE_NAME="localkb_session"

MEILISEARCH_URL="http://localhost:7702"
MEILISEARCH_MASTER_KEY="localkb-master-key"

SEED_ADMIN_EMAIL="admin@localkb.internal"
SEED_ADMIN_PASSWORD="ChangeMe123!"
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run docs:screenshots
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Route chính

- `/` homepage và instant search
- `/login` đăng nhập
- `/search?q=` trang kết quả tìm kiếm
- `/kb` danh sách article
- `/kb/[slug]` trang article
- `/faq` danh sách FAQ
- `/faq/[slug]` chi tiết FAQ
- `/admin` dashboard quản trị
- `/admin/articles`
- `/admin/faqs`
- `/admin/categories`
- `/admin/tags`
- `/admin/users`
- `/admin/search-logs`
- `/account/password`

## API route

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/search?q=`

## Docker services

`docker-compose.yml` khởi tạo:

- `postgres` tại `localhost:5432`
- `meilisearch` tại `localhost:7702`

## Deploy production

- Stack production đầy đủ nằm ở [`docker-compose.prod.yml`](./docker-compose.prod.yml)
- Mẫu biến môi trường production nằm ở [`.env.production.example`](./.env.production.example)
- Luôn chạy production compose với `--env-file .env.production` để `DATA_ROOT`, `APP_UID` và `APP_GID` được áp dụng cho volume và user mapping
- Runbook deploy, backup và restore nằm ở [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## Kiểm tra nhanh

```bash
npm run lint
npm run build
```

Nếu cần reset dữ liệu mẫu:

```bash
npm run db:seed
```

## Ghi chú

- Chỉ nội dung `PUBLISHED` mới xuất hiện trên public app và search.
- `Article revision` hiện tại khôi phục `title` và `body`; `category/tags (nếu có)/status` được giữ nguyên.
- `FAQ revision` restore `question` và `answer`.
