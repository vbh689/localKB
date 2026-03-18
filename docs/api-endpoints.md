# LocalKB API Endpoints

Tài liệu này mô tả các API endpoints hiện có trong repo. Tất cả endpoint trả JSON trừ các route export CSV và upload file.

## Quy ước chung

- API auth nội bộ dùng session cookie `HttpOnly`.
- Các route trong `/api/admin/*` yêu cầu user đã đăng nhập và có role `ADMIN` hoặc `EDITOR`.
- Các route public `/api/search` và `/api/health` không yêu cầu đăng nhập.
- Khi lỗi, hầu hết route trả JSON theo dạng `{ "error": "..." }`.

## Auth

### `POST /api/auth/login`

- Auth: không cần
- Body JSON:

```json
{
  "email": "admin@localkb.internal",
  "password": "ChangeMe123!"
}
```

- Response `200`:

```json
{
  "user": {
    "id": "clx...",
    "email": "admin@localkb.internal",
    "role": "ADMIN"
  }
}
```

- Response `400`: `Invalid login payload.`
- Response `401`: `Invalid email or password.`
- Response `500`: `Login service temporarily unavailable.`
- Ghi chú:
  - Email được trim và convert về lowercase trước khi lookup.
  - Khi login thành công, response set cookie session `HttpOnly`.

### `POST /api/auth/logout`

- Auth: không bắt buộc, nhưng nếu có cookie session thì sẽ xóa session đó
- Body: không có
- Response `200`:

```json
{
  "success": true
}
```

- Ghi chú:
  - Nếu request có session token, session sẽ bị xóa khỏi DB.
  - Response luôn clear cookie session.

### `GET /api/auth/me`

- Auth: cần cookie session hợp lệ
- Response `200`:

```json
{
  "user": {
    "id": "clx...",
    "email": "admin@localkb.internal",
    "role": "ADMIN"
  }
}
```

- Response `401`: `Unauthenticated.`
- Response `500`: `Session service temporarily unavailable.`

## Search

### `GET /api/search`

- Auth: không cần
- Query params:
  - `q`: chuỗi tìm kiếm
  - `limit`: số kết quả tối đa mỗi loại, mặc định `5`, giới hạn tối đa `10`
  - `type`: `article` hoặc `faq`
  - `category`: tên category
  - `tag`: tên tag

- Ví dụ:

```bash
curl "http://localhost:3000/api/search?q=vpn&limit=5&type=faq"
```

- Response `200`:

```json
{
  "query": "vpn",
  "results": [
    {
      "id": "clx...",
      "type": "faq",
      "title": "Xin quyền truy cập VPN như thế nào?",
      "slug": "xin-quyen-truy-cap-vpn-nhu-the-nao",
      "summary": "...",
      "category": "IT Support",
      "tags": ["vpn", "access"],
      "highlight": "..."
    }
  ],
  "totalByType": {
    "article": 0,
    "faq": 1
  }
}
```

- Response `500`: `Search service temporarily unavailable.`
- Ghi chú:
  - Nếu `q` ngắn hơn 2 ký tự và không có filter, API trả payload rỗng.
  - Nếu chỉ có filter mà không có `q`, API vẫn trả kết quả theo filter.
  - Route sẽ ưu tiên Meilisearch, và fallback sang Prisma nếu search service lỗi.
  - Mỗi request hợp lệ sẽ ghi `SearchLog`.

## Health

### `GET /api/health`

- Auth: không cần
- Response `200` hoặc `503` tùy trạng thái hệ thống
- Response body:

```json
{
  "app": { "status": "available" },
  "db": { "latencyMs": 3, "status": "available" },
  "search": { "latencyMs": 7, "status": "available" },
  "status": "ok",
  "timestamp": "2026-03-18T12:00:00.000Z"
}
```

- Ghi chú:
  - `status = ok` khi DB và search đều `available`
  - Nếu một phần lỗi, route trả `503` và `status = degraded`

## Admin Exports

### `GET /api/admin/search-logs/export`

- Auth: `ADMIN` hoặc `EDITOR`
- Query params:
  - `q`: lọc theo query
  - `resultFilter`: `all` hoặc `no-result`
  - `sort`: `latest` hoặc `results_desc`

- Response `200`: CSV
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="search-logs.csv"`

- CSV columns:
  - `query`
  - `result_count`
  - `result_type`
  - `created_at`

- Response `401`: `Unauthorized`

### `GET /api/admin/stats/export`

- Auth: `ADMIN` hoặc `EDITOR`
- Query params:
  - `days`: `7`, `14`, `30`, `90`  hoặc giá trị hợp lệ khác theo `normalizeRangeDays`

- Response `200`: CSV
- Headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="content-stats-<days>d.csv"`

- CSV columns:
  - `day`
  - `searches`
  - `no_result`
  - `published_content`

- Response `401`: `Unauthorized`

## Admin Uploads

### `POST /api/admin/uploads`

- Auth: `ADMIN` hoặc `EDITOR`
- Content type: `multipart/form-data`
- Form field:
  - `file`: file ảnh

- Response `200`:

```json
{
  "markdown": "![image](/uploads/2026/03/image_abcd1234.png)",
  "url": "/uploads/2026/03/image_abcd1234.png"
}
```

- Response `400`: `File upload is required.` hoặc `Only image uploads are supported.`
- Response `401`: `Unauthorized`
- Response `500`: `Image upload failed.`
- Ghi chú:
  - File được lưu dưới `public/uploads/YYYY/mm/`
  - Tên file được sanitize theo rule: chỉ giữ `letter`, `number`, `_`, `-`, `.`
  - File name output dùng format `uploads/YYYY/mm/sanitizedName_md5.extension`; nếu file gốc không còn basename hợp lệ thì chỉ dùng `md5.extension`
  - API trả luôn snippet Markdown để editor chèn trực tiếp vào nội dung

## Liên Quan

- `user` object trả về từ auth API chỉ gồm `id`, `email`, `role`
- Search payload dùng chung với homepage instant search và trang `/search`
- Toàn bộ API handler nằm trong `src/app/api`
