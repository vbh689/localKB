# LocalKB

LocalKB là ứng dụng wiki / knowledge base / FAQ nội bộ cho công ty, xây dựng bằng `Next.js`, `Prisma`, `PostgreSQL` và `Meilisearch`.

Ứng dụng cung cấp một điểm vào chung để tra cứu tài liệu nội bộ, câu hỏi thường gặp và nội dung quản trị với giao diện public-facing rõ ràng cho người dùng cuối và CMS riêng cho đội vận hành.

## Tính năng hiện có

- Đăng nhập nội bộ bằng `email/password` và session `HttpOnly cookie`
- Homepage có `instant search`
- Trang public cho `wiki`, `FAQ` và `search`
- Admin CMS cho `articles`, `FAQs`, `categories`, `tags`, `users`
- Xuất bản / ẩn bài và đồng bộ nội dung `published` sang `Meilisearch`
- Search logs và dashboard usage trong admin
- Revision history, compare preview và khôi phục revision cho article / FAQ
- 
<details>
  <summary>Screenshot</summary>

  <p align="center">
    <img src="./public/readme/home.png" alt="Homepage LocalKB" width="48%" />
    <img src="./public/readme/kb.png" alt="Knowledge Base listing" width="48%" />
  </p>
  <p align="center">
    <img src="./public/readme/faq.png" alt="FAQ listing" width="48%" />
    <img src="./public/readme/login.png" alt="Login page" width="48%" />
  </p>
</details>

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

## Route hiện có

### Public routes

- `/` homepage, quick stats, bài viết mới, FAQ mới và `instant search`
- `/login` trang đăng nhập nội bộ
- `/account/password` đổi mật khẩu cho user đã đăng nhập
- `/search?q=&type=&category=&tag=` trang kết quả tìm kiếm public, hỗ trợ lọc theo loại nội dung, category và tag
- `/kb?page=&limit=&sort=&category=&from=&to=` danh sách article đã publish, có phân trang, sắp xếp và lọc theo category / ngày cập nhật
- `/kb/[slug]` trang chi tiết article đã publish
- `/faq?page=&limit=&sort=&category=&from=&to=` danh sách FAQ đã publish, có phân trang, sắp xếp và lọc theo category / ngày cập nhật
- `/faq/[slug]` trang chi tiết FAQ đã publish

### Admin routes

- `/admin` dashboard quản trị, thống kê usage, health check, top queries, recent content, export stats CSV và trigger reindex search
- `/admin/articles` quản lý article: tạo mới, lọc, sửa, publish / unpublish, revision history, compare preview và restore revision
- `/admin/faqs` quản lý FAQ: tạo mới, lọc, sửa, publish / unpublish, revision history, compare preview và restore revision
- `/admin/categories` quản lý category
- `/admin/tags` quản lý tag, chỉ hiển thị khi tính năng tag được bật
- `/admin/users` quản lý user nội bộ, role, trạng thái và mật khẩu
- `/admin/media` media library, upload ảnh và lấy Markdown embed cho editor
- `/admin/search-logs` xem search logs, lọc no-result, phân trang và export CSV

### Upload/file routes

- `/uploads/[...segments]` route handler phục vụ file ảnh đã upload với cache header dài hạn

## API route hiện có

### Auth API

- `POST /api/auth/login` đăng nhập bằng JSON payload `{ "email": string, "password": string }`, tạo session `HttpOnly cookie`
- `POST /api/auth/logout` xóa session hiện tại và clear cookie
- `GET /api/auth/me` lấy thông tin user từ session hiện tại

### Public API

- `GET /api/search?q=&limit=&type=&category=&tag=` tìm kiếm nội dung đã publish, giới hạn tối đa `10` kết quả
- `GET /api/health` kiểm tra tình trạng hệ thống và trả về HTTP `200` hoặc `503`

### Admin API

- `POST /api/admin/uploads` upload ảnh cho CMS/editor bằng `multipart/form-data`, trả về `url` và Markdown image snippet
- `GET /api/admin/stats/export?days=` export CSV thống kê search và publish trend theo số ngày đã chọn trên dashboard admin
- `GET /api/admin/search-logs/export?q=&resultFilter=&sort=` export CSV search logs theo bộ lọc hiện tại

### Ghi chú phân quyền

- Nhóm route `/admin/*` và API admin yêu cầu đăng nhập với role `ADMIN` hoặc `EDITOR`, ngoại trừ `/admin/users` chỉ cho `ADMIN`
- Các route public chỉ hiển thị nội dung có trạng thái `PUBLISHED`

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
