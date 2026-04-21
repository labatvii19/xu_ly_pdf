# Thiết kế kỹ thuật: Ứng dụng Web xử lý PDF (Vá/Nhân bản lớp) trên Mobile

## Mục tiêu
Xây dựng một web app (Progressive Web App) chạy trên thiết bị di động (Smartphones) dùng để chỉnh sửa nhanh file PDF. Ứng dụng cho phép tạo vùng chọn (Marquee selection) nội dung, biến vùng chọn thành một lớp ảnh (layer) để copy, cut, và dán đè lên các vị trí khác trên trang PDF. Mục đích chính là thực hiện thao tác "vá" hoặc "nhân bản" các mảng nội dung một cách trực quan bằng thao tác vuốt chạm.

## Kiến trúc hệ thống
- **Nền tảng:** Client-side Web App (React.js hoặc Vanilla HTML/JS) thiết kế tối ưu cho màn hình cảm ứng di động (Mobile-first, touch-friendly).
- **Quy trình xử lý file:**
  1. Đọc và render PDF: Dùng thư viện `pdf.js`.
  2. Canvas tương tác: Dùng `Fabric.js` để quản lý hiển thị, vuốt chạm, và các object/layer nổi xếp chồng.
  3. Trích xuất/Cut/Copy: Vẽ vùng chọn -> Chụp pixel/rasterize vùng đó thành một layer Object trong Fabric.js. Thao tác 'Cut' sẽ sinh rạ một hình chữ nhật trắng đè vào toạ độ gốc.
  4. Xuất file PDF: Dùng thư viện `pdf-lib` để nhận file gốc, gắn tĩnh tọa độ của các layer mới (các layer ảnh hoặc hình chữ nhật trắng) vào trang PDF và xuất file kết quả cuối cùng.
- **Lưu trữ:** 0% lưu trên Server. Tất cả diễn ra trên bộ nhớ trình duyệt để đảm bảo bảo mật và không tốn cước mạng data.

## Giao diện & Trải nghiệm (UI/UX)
- **Cơ chế tải trang (Pagination):** Để tránh văng trình duyệt do sự cố tràn RAM (OOM), PDF được render từng trang một cùng với các nút `< Trang trước`, `Trang X/Y`, `Trang sau >`. Quản lý trạng thái (state) nội bộ đối với các layer của trang cũ để khi quay lại vẫn khôi phục chính xác.
- **Thanh công cụ (Bottom Bar):** Cố định ở cạnh dưới màn hình.
  - **Chế độ Bàn Tay (Pan/Zoom):** Chạm 1 ngón để vuốt trang, vuốt 2 ngón (pinch) để phóng to/thu nhỏ màn hình.
  - **Chế độ Chọn vùng (Marquee):** Khóa cuộn trang. Dùng 1 ngón kéo để vẽ khung chữ nhật nét đứt xung quanh phần văn bản.
- **Menu Ngữ Cảnh Nổi (Floating Context Menu):** Nổi lên tại vị trí vừa vẽ vùng chọn. Gồm các hành động: `Copy`, `Cut`.
- **Trình quản lý Lớp (Layer Panel):** Thanh điều khiển nhỏ góc màn hình, liệt kê các layer hiện có để người dùng có thể: chọn nhanh, xóa, thay đổi thứ tự z-index (chồng lấn lên nhau).

## Quản lý Lỗi và Giới hạn
- **File PDF có mật khẩu:** Kiểm tra password trong khối catch của `pdf.js`, nếu file có tham số mã hóa sẽ hiện Popup yêu cầu nhập mật khẩu.
- **Load siêu lớn:** Khống chế hệ số nhân (scale ratio) của `pdf.js` kết xuất để tối ưu vùng đồ hoạ của canvas nằm dưới 2048x2048 pixels (safe zone cho iOS/Android).
