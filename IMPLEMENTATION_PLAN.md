# Kế hoạch xây dựng Internal Wiki / Knowledge Base / FAQ

## Tóm tắt
Xây dựng một `custom web app` dùng nội bộ công ty, gồm homepage có `instant search`, khu vực đọc nội dung công khai trong nội bộ, và khu vực admin để biên tập/publish bài viết.  
Bản v1 dùng `email/password nội bộ`, nội dung dạng `wiki + FAQ`, triển khai trên `cloud nội bộ/VPS riêng`, và dùng `full-text search + typo tolerance` để trả kết quả ngay khi người dùng bắt đầu gõ.

## Kiến trúc và thay đổi chính
- Chọn stack v1: `Next.js + TypeScript` cho web app, `PostgreSQL` cho dữ liệu nghiệp vụ, `Meilisearch` cho instant search, `Prisma` cho ORM, `Docker Compose` để deploy nội bộ.
- Tách 3 lớp chức năng rõ ràng:
  - `Public app`: homepage, trang kết quả tìm kiếm, trang bài viết wiki, trang FAQ.
  - `Admin CMS`: tạo/sửa/xóa draft, publish/unpublish, gán category/tag, xem log tìm kiếm không có kết quả.
  - `Search indexing`: đồng bộ nội dung published sang Meilisearch ngay sau create/update/publish/unpublish.
- Thiết kế route/API chính:
  - `/` homepage với search bar trung tâm, dropdown kết quả tức thì khi nhập từ 2 ký tự.
  - `/kb/[slug]` cho bài viết wiki.
  - `/faq` và `/faq/[slug]` cho danh sách/câu hỏi chi tiết.
  - `/search?q=` cho trang kết quả đầy đủ.
  - `/api/search?q=` trả về kết quả gợi ý tức thì, group theo `Articles` và `FAQs`.
  - `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
  - `/admin/articles`, `/admin/faqs`, `/admin/categories`, `/admin/tags`, `/admin/users`.
- Mô hình dữ liệu v1:
  - `User`: email, password hash, role.
  - `Role`: `admin`, `editor`, `viewer`.
  - `Article`: title, slug, summary, body rich text/markdown, status, category, tags, author, timestamps.
  - `FAQ`: question, answer, slug, category, tags, status, timestamps.
  - `Category`, `Tag`.
  - `Revision`: snapshot nội dung để xem lịch sử chỉnh sửa cơ bản.
  - `SearchLog`: query, result count, user id tùy chọn, timestamp.
- Hành vi search v1:
  - Debounce 150–200ms phía client.
  - Chỉ index nội dung `published`.
  - Ưu tiên match tiêu đề/câu hỏi hơn body.
  - Hỗ trợ typo tolerance, prefix matching, highlight từ khóa.
  - Dropdown hiển thị tối đa 5 bài wiki + 5 FAQ, có keyboard navigation.
  - Có trạng thái `loading`, `no results`, và link sang trang kết quả đầy đủ.

## Phạm vi triển khai
- Giai đoạn 1: nền tảng
  - Khởi tạo app, auth nội bộ bằng `email/password`, session qua `HttpOnly cookie`, seed user admin đầu tiên, role-based access cho admin/editor/viewer.
  - Dựng schema DB, migration, và cấu hình Meilisearch + PostgreSQL bằng Docker Compose.
- Giai đoạn 2: quản trị nội dung
  - Admin CMS cho Article/FAQ/Category/Tag.
  - Workflow `draft -> published -> unpublished`.
  - Lưu revision mỗi lần publish hoặc update nội dung đã publish.
- Giai đoạn 3: trải nghiệm người dùng
  - Homepage với search bar nổi bật, instant search dropdown, trang chi tiết nội dung, trang kết quả tìm kiếm, lọc theo type/category/tag.
  - Responsive desktop/mobile, ưu tiên đọc nhanh và truy cập FAQ từ homepage.
- Giai đoạn 4: vận hành và observability
  - Logging lỗi API/search, healthcheck cho app/db/search.
  - Ghi `SearchLog` để theo dõi truy vấn không có kết quả và tối ưu nội dung.
  - Backup DB định kỳ; rebuild search index khi cần.

## Public interfaces / kiểu dữ liệu cần chốt
- API response cho `/api/search`:
  - `query`
  - `results`
  - mỗi item gồm: `id`, `type` (`article|faq`), `title`, `slug`, `summary/snippet`, `category`, `tags`, `highlight`
  - `totalByType`
- CMS form fields:
  - Article: `title`, `slug`, `summary`, `body`, `categoryId`, `tagIds`, `status`
  - FAQ: `question`, `slug`, `answer`, `categoryId`, `tagIds`, `status`
- Quyền v1:
  - `admin`: quản lý user + toàn bộ nội dung
  - `editor`: quản lý nội dung
  - `viewer`: chỉ đọc
- UI search contract:
  - Chưa đủ 2 ký tự thì không query
  - Có request mới thì hủy/ignore response cũ
  - Chọn item sẽ điều hướng ngay tới trang chi tiết

## Test plan và tiêu chí chấp nhận
- Unit test:
  - auth service, permission guard, slug generation, publish workflow, search payload mapping.
- Integration test:
  - login/logout, CRUD Article/FAQ, publish/unpublish, index sync sang Meilisearch, query search theo title/body/tag.
- E2E test:
  - user mở homepage, gõ từ khóa, thấy dropdown tức thì, di chuyển bằng bàn phím, mở đúng trang.
  - editor tạo bài mới, publish, nội dung xuất hiện trong search.
  - unpublish thì nội dung biến mất khỏi public/search.
  - no-result hiển thị đúng và vẫn cho phép sang trang tìm kiếm đầy đủ.
- Acceptance criteria v1:
  - Người dùng nội bộ đăng nhập được bằng email/password do admin cấp.
  - Admin/editor tạo và publish được wiki/FAQ không cần sửa DB thủ công.
  - Homepage trả gợi ý tìm kiếm gần như tức thì khi gõ.
  - Kết quả tìm kiếm phân loại rõ `Wiki` và `FAQ`.
  - Chỉ nội dung published mới xuất hiện ở public app và search.

## Giả định và mặc định đã chọn
- UI và nội dung v1 ưu tiên tiếng Việt; chưa làm đa ngôn ngữ đầy đủ.
- Không có self-signup; tài khoản được admin tạo/invite nội bộ.
- Chưa làm SSO ở v1, nhưng kiến trúc auth giữ chỗ để nâng cấp sau.
- Chưa làm semantic/AI search ở v1; nếu cần sẽ là phase 2 sau khi có dữ liệu truy vấn thực tế.
- Chưa làm phân quyền theo phòng ban/tài liệu mật; v1 dùng quyền theo vai trò toàn hệ thống.
- Nội dung đính kèm file chỉ hỗ trợ ở mức link/file URL; media library đầy đủ để sau.
