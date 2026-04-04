# HANDOFF

Tài liệu này dành cho người đã quen với `Next.js` / `Prisma` / `PostgreSQL`, nhưng chưa quen với repo `localKB`.

Mục tiêu của file này không phải thay thế `README.md` hay `DEPLOYMENT.md`.

- Dùng [`README.md`](./README.md) khi bạn cần chạy app local, seed dữ liệu, hoặc xem inventory tính năng.
- Dùng [`DEPLOYMENT.md`](./DEPLOYMENT.md) khi bạn cần build, deploy, backup, restore, hoặc reindex production.
- Dùng `HANDOFF.md` khi bạn cần hiểu repo được tổ chức ra sao, nên đọc từ đâu, và các chỗ dễ hiểu nhầm nhất.

## 1. LocalKB là gì

`localKB` là một knowledge base nội bộ gồm 2 phần chính:

- Public-facing app:
  - homepage
  - danh sách / chi tiết bài viết KB
  - danh sách / chi tiết FAQ
  - trang search public
- Admin CMS:
  - quản lý article / FAQ / category / media / user / search logs
  - đăng nhập nội bộ bằng `email/password`
  - session bằng `HttpOnly cookie`

Nói ngắn gọn:

- `PostgreSQL` là source of truth cho dữ liệu.
- `Prisma` là lớp truy cập dữ liệu chính.
- `Meilisearch` tăng tốc search public.
- Nếu Meilisearch lỗi hoặc chưa sẵn sàng, search có fallback về Prisma.

## 2. Bản đồ source of truth

Khi cần tra cứu nhanh, ưu tiên đọc theo map này:

| Việc cần làm | Đọc ở đâu |
| --- | --- |
| Chạy app local, env cơ bản, seed | [`README.md`](./README.md) |
| Build/deploy/backup/restore/reindex production | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Hiểu schema dữ liệu | [`prisma/schema.prisma`](./prisma/schema.prisma) |
| Hiểu auth + session | [`src/lib/auth/session.ts`](./src/lib/auth/session.ts), [`src/lib/auth/user.ts`](./src/lib/auth/user.ts), [`src/app/api/auth/login/route.ts`](./src/app/api/auth/login/route.ts) |
| Hiểu public content query | [`src/lib/content.ts`](./src/lib/content.ts) |
| Hiểu search + fallback | [`src/lib/search-query.ts`](./src/lib/search-query.ts), [`src/lib/search.ts`](./src/lib/search.ts), [`src/app/api/search/route.ts`](./src/app/api/search/route.ts) |
| Hiểu admin mutation flow | [`src/app/admin/actions.ts`](./src/app/admin/actions.ts) |
| Hiểu config/env parsing | [`src/lib/config.ts`](./src/lib/config.ts) |

## 3. Golden path, nên đọc trong giờ đầu tiên

Nếu mới vào repo, đọc theo đúng thứ tự này sẽ đỡ bị lạc nhất.

### Bước 1: nhìn schema trước

Đọc [`prisma/schema.prisma`](./prisma/schema.prisma).

Các model quan trọng:

- `User`
- `Session`
- `Article`
- `Faq`
- `Category`
- `Tag`
- `Revision`
- `SearchLog`

Các enum quan trọng:

- `Role`: `ADMIN`, `EDITOR`, `VIEWER`
- `UserStatus`: `ACTIVE`, `INACTIVE`
- `ContentStatus`: `DRAFT`, `PUBLISHED`, `UNPUBLISHED`

Điểm cần nắm:

- Chỉ content có `status = PUBLISHED` mới xuất hiện trên public app.
- `Article` có `authorId`, `Faq` thì không.
- Cả `Article` và `Faq` đều có `category`, `tags`, `revisions`.
- `SearchLog` lưu lịch sử query.

### Bước 2: hiểu auth và session

Đọc:

- [`src/app/api/auth/login/route.ts`](./src/app/api/auth/login/route.ts)
- [`src/lib/auth/session.ts`](./src/lib/auth/session.ts)
- [`src/lib/auth/user.ts`](./src/lib/auth/user.ts)

Luồng cơ bản:

1. User gọi `POST /api/auth/login`.
2. App validate payload bằng `zod`.
3. Kiểm tra email + password trong DB.
4. Tạo `Session` record trong PostgreSQL.
5. Trả về `Set-Cookie` với cookie name lấy từ env.
6. Các route cần auth đọc cookie này để resolve current session.

Điểm cần nhớ:

- Session không nằm ở JWT, mà nằm trong DB.
- `requireRoles()` là cổng chặn chính cho admin pages / actions.
- User `INACTIVE` sẽ bị chặn login và session cũ có thể bị dọn.

### Bước 3: hiểu public content flow

Đọc [`src/lib/content.ts`](./src/lib/content.ts).

File này là nơi gom phần lớn query public cho:

- homepage counts
- newest / featured items
- list pages cho KB / FAQ
- detail page theo slug

Nếu cần hiểu public app render gì từ DB, đây là một trong những file đáng đọc đầu tiên.

### Bước 4: hiểu search flow

Đọc theo thứ tự:

1. [`src/lib/search.ts`](./src/lib/search.ts)
2. [`src/lib/search-query.ts`](./src/lib/search-query.ts)
3. [`src/app/api/search/route.ts`](./src/app/api/search/route.ts)
4. [`src/app/search/page.tsx`](./src/app/search/page.tsx)

Mental model:

- `searchClient` kết nối Meilisearch bằng env trong `config.ts`.
- `searchPublishedContent()` là entrypoint logic search chính.
- Search ưu tiên Meilisearch.
- Nếu Meilisearch lỗi, logic fallback sang Prisma query.
- Public API route và search page đều đi qua logic này.

### Bước 5: hiểu admin mutation flow

Đọc:

- [`src/app/admin/layout.tsx`](./src/app/admin/layout.tsx)
- [`src/app/admin/actions.ts`](./src/app/admin/actions.ts)

`actions.ts` là file server action rất lớn, chứa gần như toàn bộ mutation quan trọng:

- create / update user
- create / update article
- create / update FAQ
- publish / unpublish
- revision restore
- category / media / search-related actions

Mental model:

- UI form trong `/admin/*` submit vào server actions.
- Server action validate / xử lý / ghi DB.
- Sau đó `revalidatePath()` và sync search index khi cần.

Nếu bạn định sửa behavior trong admin, gần như chắc chắn sẽ chạm `src/app/admin/actions.ts`.

## 4. Quyền truy cập

Đây là bảng diễn giải (trust boundary).

| Khu vực / hành động | Public | User đăng nhập | EDITOR | ADMIN |
| --- | --- | --- | --- | --- |
| Homepage, KB, FAQ, search public | Yes | Yes | Yes | Yes |
| Đổi mật khẩu `/account/password` | No | Yes | Yes | Yes |
| Vào `/admin` | No | No | Yes | Yes |
| Quản lý article / FAQ / category / media / search logs | No | No | Yes | Yes |
| Quản lý users `/admin/users` | No | No | No | Yes |

Điểm cần nhớ:

- `canAccessAdmin()` coi `ADMIN` và `EDITOR` là nhóm được vào admin.
- `src/app/admin/layout.tsx` dùng `requireRoles([Role.ADMIN, Role.EDITOR])`.
- `src/app/admin/users/page.tsx` chặn chặt hơn, chỉ `Role.ADMIN`.

## 5. Host vs container

Repo này có cả local host access và container-to-container access. Đừng copy env giữa hai file.

| Trường hợp | Database host | Meilisearch host | Nên nhìn ở đâu |
| --- | --- | --- | --- |
| App chạy từ host máy dev | thường là `localhost` | `http://localhost:7702` | xem hướng dẫn local và hiểu context đang chạy từ host |
| App/job chạy bên trong Docker network | `postgres` | service nội bộ của compose, production docs hiện dùng `http://meilisearch:7700` | xem [`DEPLOYMENT.md`](./DEPLOYMENT.md) và file compose tương ứng |

Diễn giải:

- Port `7702` là port publish ra host để local machine gọi Meilisearch.
- Port `7700` là port service bên trong container.
- Tên host `postgres` chỉ đúng khi process của bạn đang chạy trong Docker network.
- Nếu process chạy trên host máy local mà bạn vẫn dùng `postgres`, app sẽ không nói chuyện được với DB.

Khi thấy env ví dụ khác nhau giữa `README.md`, `.env.example`, `.env.production.example`, hay `DEPLOYMENT.md`, hãy hỏi trước:

> Process này đang chạy trên host, hay đang chạy trong container?

Đó là câu hỏi đúng. Không phải “file nào đúng hơn”.

## 6. Những điểm cần chú ý

### Search fallback

Search không phải chỉ sử dụng Meilisearch.

- Đường chính: Meilisearch
- Đường fallback: Prisma (PostgreS)

Nếu search có behavior lạ, ngoài việc kiểm tra index, hãy đọc cả fallback logic trong [`src/lib/search-query.ts`](./src/lib/search-query.ts).

### Tags đang tồn tại, nhưng đang tắt

Hiện tại:

- Schema có `Tag`
- Nhiều page vẫn có plumbing liên quan đến tags
- Nhưng feature flag đang tắt ở [`src/lib/features.ts`](./src/lib/features.ts)

Nghĩa là:

- Đừng assume tags là dead code
- Nhưng cũng đừng assume tags đang active trong UI

### Tên biến env cho Meilisearch có hai cách gọi

`config.ts` chấp nhận:

- `MEILISEARCH_MASTER_KEY`
- hoặc fallback sang `MEILI_MASTER_KEY`

Điều này có ích cho backward compatibility, nhưng cũng là chỗ dễ gây “chạy máy này được, máy khác không”.

Nếu thấy auth vào Meilisearch có vấn đề, kiểm tra cả hai const.

### Admin logic tập trung mạnh vào một file lớn

`src/app/admin/actions.ts` chứa rất nhiều mutation.

Điều tốt:

- Dễ biết cần đọc ở đâu khi debug server actions

Điều bất tiện:

- File lớn, dễ chạm nhiều concern cùng lúc

Khi sửa admin behavior, đọc kỹ phần liên quan trước khi tách refactor. Đừng vội “dọn dẹp kiến trúc” nếu task chính chỉ là một fix nhỏ.

## 7. Khi cần tìm bug, nên bắt đầu ở đâu?

### Nếu bug ở login hoặc phân quyền

Đọc theo thứ tự:

1. [`src/app/api/auth/login/route.ts`](./src/app/api/auth/login/route.ts)
2. [`src/lib/auth/session.ts`](./src/lib/auth/session.ts)
3. [`src/lib/auth/user.ts`](./src/lib/auth/user.ts)
4. page/layout đang gọi `requireRoles()` hoặc `getCurrentSession()`

### Nếu bug ở public content không hiện

Đọc theo thứ tự:

1. [`src/lib/content.ts`](./src/lib/content.ts)
2. page đang render nội dung
3. kiểm tra `status = PUBLISHED` chưa
4. kiểm tra `slug`, `category`, `updatedAt` filters

### Nếu bug ở search

Đọc theo thứ tự:

1. [`src/app/api/search/route.ts`](./src/app/api/search/route.ts)
2. [`src/lib/search-query.ts`](./src/lib/search-query.ts)
3. [`src/lib/search.ts`](./src/lib/search.ts)
4. nếu cần, đọc thêm phần sync index trong code search index

### Nếu bug ở admin save / publish / restore revision

Đọc theo thứ tự:

1. page admin liên quan
2. action tương ứng trong [`src/app/admin/actions.ts`](./src/app/admin/actions.ts)
3. model liên quan trong [`prisma/schema.prisma`](./prisma/schema.prisma)

## 8. File nào đáng mở đầu tiên

1. [`prisma/schema.prisma`](./prisma/schema.prisma)
2. [`src/lib/auth/session.ts`](./src/lib/auth/session.ts)
3. [`src/lib/content.ts`](./src/lib/content.ts)
4. [`src/lib/search-query.ts`](./src/lib/search-query.ts)
5. [`src/app/admin/actions.ts`](./src/app/admin/actions.ts)

Nếu 5 file này đã rõ, bạn sẽ hiểu phần lớn repo.
