# TỔNG HỢP DANH MỤC FAQ & KNOWLEDGE BASE

> Tài liệu hỗ trợ kỹ thuật nội bộ — 15 nhóm chủ đề

---

## Nhóm 1: Lỗi Truy cập & Hệ thống

> 📌 Nhóm ticket có tần suất cao nhất.

- **Tại sao không vào được phần mềm/mất kết nối máy chủ?**
  → Check IP tĩnh, mở Port 1488, restart SQL Service.

- **Xử lý lỗi phần mềm chạy chậm, lag hoặc treo?**
  → Xóa log SQL, shrink database, check dung lượng ổ C máy chủ.

- **Lỗi "Timeout expired" hoặc "Cannot connect to server"?**
  → Kiểm tra mạng LAN, tường lửa hoặc SQL bị stop.

- **Lỗi Shortcut bị mất hoặc không mở được phần mềm trên Desktop?**
  → Link lại file `.exe` trong bộ cài.

- **App Mobile không đăng nhập được/không chọn được kho?**
  → Check mã khách hàng, phân quyền kho cho tài khoản app.

---

## Nhóm 2: Cài đặt & Bản quyền

- **Hướng dẫn cài đặt máy trạm mới và kết nối máy chủ.**

- **Quy trình cấp lại Key phần mềm khi cài lại máy hoặc thay phần cứng.**

- **Cài đặt và cấu hình SQL Server cho máy chủ mới.**

- **Hướng dẫn cập nhật (Update) phiên bản phần mềm mới cho toàn hệ thống.**

---

## Nhóm 3: Quản lý Kho & Tồn kho

- **Tại sao tồn kho bị lệch giữa Thẻ kho và danh mục tìm kiếm?**
  → Chạy lại thủ tục cập nhật tồn kho.

- **Hướng dẫn xử lý tồn kho bị âm.**
  → Phân quyền xuất âm hoặc điều chỉnh nhập bù.

- **Quy trình kiểm kê liên tục và điều chỉnh tăng/giảm kho.**

- **Quản lý Lô & Hạn sử dụng (Date):**
  → Cách nhập lô và xử lý cảnh báo hạn dùng.

- **Lỗi chuyển kho: Tại sao hàng đã chuyển nhưng kho đích chưa nhận được?**
  → Kiểm tra trạng thái duyệt phiếu, lỗi kho ảo.

---

## Nhóm 4: Bán hàng & Đơn hàng

- **Tại sao đơn hàng không cho bán tiền mặt, chỉ cho bán nợ (hoặc ngược lại)?**
  → Check thiết lập "Cho phép công nợ" trong danh mục khách hàng.

- **Xử lý đơn đặt hàng đã hủy nhưng vẫn hiện trên báo cáo.**

- **Cách gõ số lượng có dấu thập phân (phẩy) và định dạng số.**
  → Cấu hình Region trong Control Panel.

- **Lỗi không chọn được nhân viên hoặc khách hàng khi lên đơn.**
  → Check trạng thái "Hiệu lực".

- **Hướng dẫn tích điểm khách hàng và xử lý lỗi điểm bị âm.**

---

## Nhóm 5: In ấn & Thiết kế mẫu phiếu

- **Sửa mẫu hóa đơn (A4, A5, K80):**
  → Thêm mã QR ngân hàng, thêm logo, chỉnh thông tin địa chỉ.

- **Lỗi máy in không in được bill hoặc in ra trắng.**
  → Check máy in mặc định, driver máy in.

- **Cài đặt và thiết kế tem mã vạch (Bartender).**

- **Hướng dẫn chỉnh in 2 liên, in tự động sau khi lưu đơn.**

---

## Nhóm 6: Kế toán, Công nợ & Thu chi

- **Tại sao công nợ khách hàng hiển thị sai?**
  → Sửa lỗi công thức Trigger công nợ, check phiếu thu trùng.

- **Hướng dẫn nghiệp vụ gối đầu công nợ và trừ nợ khi trả hàng.**

- **Quản lý tài khoản ngân hàng:**
  → Chỉnh sai đơn vị tiền tệ (VND/USD), xem báo cáo thu ngân.

- **Cách xử lý hóa đơn thu tiền một phần.**

---

## Nhóm 7: Báo cáo & Dữ liệu

- **Lỗi không xuất được báo cáo ra Excel.**
  → Check thư viện Excel hoặc quyền folder tạm.

- **Tại sao báo cáo doanh thu theo ca bị lệch tiền?**
  → Check nhân viên thao tác sai ca, phiếu thu ngày tương lai.

- **Hướng dẫn nhập dữ liệu (Import) sản phẩm, khách hàng từ file Excel mẫu.**

- **Xử lý lỗi báo cáo không hiển thị dữ liệu.**
  → Thường do thiếu thủ tục SQL - Procedure.

---

## Nhóm 8: Kết nối & Đồng bộ

- **Đồng bộ Sổ Chính - Sổ Phụ: Tại sao dữ liệu không sang?**
  → Check Job đồng bộ, trùng mã khách hàng.

- **Lỗi đẩy hóa đơn lên hệ thống Hóa đơn máy tính tiền (HDMTT) hoặc Web thuế.**

- **Kết nối App Bán hàng/Quản lý với dữ liệu Offline.**

---

## Nhóm 9: Nghiệp vụ Lắp ráp & Tháo dỡ

> 📌 Dành cho các khách hàng có mô hình sản xuất nhẹ hoặc đóng gói combo.

- **Quản lý cấu tạo thành phẩm:**
  → Cách thiết lập định mức nguyên vật liệu cho một mã hàng.

- **Nghiệp vụ Lắp ráp & Tháo dỡ:**
  → Hướng dẫn lập phiếu lắp ráp từ nguyên liệu rời thành thành phẩm và ngược lại.

- **Quy trình tính giá vốn cho hàng lắp ráp:**
  → Giải quyết thắc mắc về giá vốn thành phẩm sau khi tháo dỡ/lắp ráp.

- **Báo cáo dự trù hàng hóa:**
  → Cách xem báo cáo để chuẩn bị nguyên liệu dựa trên kế hoạch sản xuất.

---

## Nhóm 10: Chăm sóc Khách hàng & Marketing

### Quản lý Tích điểm

- **Cách thiết lập tỉ lệ tích điểm.**

- **Xử lý lỗi khách hàng bị âm điểm (Reset điểm về 0).**

- **Chỉnh sửa trường màu sắc/phân loại khách hàng để tích điểm.**

### Quản lý Voucher & Khuyến mãi

- **Cách tạo chương trình khuyến mãi (Mua A tặng B, giảm giá theo nhóm hàng).**

- **Xử lý lỗi trùng nhà cung cấp trong chương trình khuyến mãi.**

### Kênh liên lạc & Bảng giá

- **Gửi tin nhắn (Zalo OA/SMS):**
  → Hướng dẫn kết nối và gửi thông báo đơn hàng qua Zalo.

- **Quản lý Bảng giá theo đối tượng:**
  → Thiết lập bảng giá sỉ, giá lẻ, giá theo khu vực (bảng giá USD, VND).

---

## Nhóm 11: Nhân sự, Ca làm việc & Tiền thưởng

### Quản lý Giao ca (Shift Management)

- **Hướng dẫn nhân viên chốt ca, in báo cáo tổng kết ca.**

- **Xử lý lỗi lệch tiền giao ca giữa thực tế và phần mềm.**

### Tính toán Tiền thưởng & Hoa hồng

- **Thiết lập % tiền thưởng cho nhân viên theo mặt hàng hoặc doanh số.**

- **Sửa báo cáo chi tiết tiền thưởng (thêm cột thưởng theo tiền, thưởng theo %).**

- **Cách hiển thị màu sắc phân biệt trên báo cáo chi lương.**

### Máy chấm công

- **Máy chấm công & Nhân sự:**
  → Kết nối máy chấm công và xử lý lỗi đầu đọc không nhận dữ liệu.

---

## Nhóm 12: Thiết bị ngoại vi & Phần cứng chuyên dụng

- **Cân điện tử:**
  → Hướng dẫn kết nối cân, xử lý lỗi không nhảy số cân hoặc sai đơn vị khối lượng.

- **Cây hiển thị giá (Pole Display):**
  → Cài đặt driver và cấu hình hiển thị giá tiền cho khách xem.

- **Két tiền (Cash Drawer):**
  → Cài đặt két tự động bật ra khi in hóa đơn.

- **Máy in mã vạch chuyên dụng:**
  → Căn chỉnh khổ tem (2 tem, 3 tem), xử lý lỗi in tem bị lệch hoặc mờ mã vạch.

---

## Nhóm 13: Tích hợp Hệ thống & Hóa đơn điện tử

### Hóa đơn máy tính tiền (HDMTT)

- **Hướng dẫn đẩy đơn lên hệ thống thuế.**

- **Xử lý lỗi hóa đơn bị nhầm chi nhánh hoặc lỗi thủ tục khi gọi dịch vụ thuế.**

### Đồng bộ phần mềm kế toán

- **Đồng bộ phần mềm kế toán (Misa):**
  → Xử lý lỗi không tìm thấy đơn hàng trên Misa sau khi đồng bộ.

### Tích hợp ngân hàng (BIDV Portal)

- **Thiết lập tài khoản BIDV để tự động xác nhận thanh toán.**

- **Kiểm tra lịch sử giao dịch ngay trên phần mềm.**

### Hải quan & Sổ phụ

- **Bản Hải quan & Sổ phụ:**
  → Quy trình tách dữ liệu giữa bản nội bộ và bản báo cáo thuế.

---

## Nhóm 14: DBA & Quản trị hệ thống nâng cao

> 📌 Dành cho nhân viên kỹ thuật xử lý sâu.

### Quản lý SQL Jobs

- **Thiết lập Job tự động clear log định kỳ.**

- **Job tự động cập nhật giá nhập gần nhất vào danh mục sản phẩm.**

- **Job đồng bộ dữ liệu giữa các chi nhánh/hosting.**

### Backup & Restore nâng cao

- **Hướng dẫn cấu hình backup tự động lên Google Drive.**

- **Quy trình restore database từ hosting về máy chủ cục bộ khi có sự cố.**

### Xử lý dữ liệu hàng loạt

- **SQL cập nhật mã sản phẩm từ chữ thường sang chữ in hoa.**

- **SQL xóa đơn hàng cũ các tháng trước để giảm tải hệ thống.**

- **Fix lỗi "Convert nvarchar to float" do định dạng vùng (Region) của Windows.**

---

## Nhóm 15: Quy trình Kết sổ & Chuyển vùng dữ liệu

### Quy trình Kết sổ năm/tháng

- **Hướng dẫn chốt tồn kho, chốt công nợ để chuyển sang kỳ dữ liệu mới.**

- **Cách xem lại dữ liệu của các năm cũ sau khi đã kết sổ.**

### Chuyển máy chủ

- **Các bước đóng gói dữ liệu, chuyển hosting và kết nối lại toàn bộ máy trạm.**

- **Cố định IP và NAT Port để dùng App mobile khi đổi nhà mạng.**

### Chuyển đổi từ phần mềm khác

- **Xử lý dữ liệu từ phần mềm khác chuyển sang.**
  → Ví dụ: Chuyển từ KiotViet sang MasterPro.
