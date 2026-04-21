# Thiết kế Giao diện: Rê Vùng Chọn Marquee

## 1. Mục tiêu
Cho phép người dùng tái sử dụng tỷ lệ/kích thước vùng chọn Marquee cũ và di chuyển nó sang vị trí nội dung khác trước khi Copy/Cut. Hành vi giống Photoshop.

## 2. Logic Trạng Thái
*   **Chạm trong vùng Chọn (Hit Testing):** 
    Khi sự kiện `pointerdown` diễn ra, tính toán tọa độ ngón tay. Nếu nằm CÓ trong diện tích bao phủ `[m.x, m.x + m.w]` và `[m.y, m.y + m.h]`, chặn việc khởi tạo hinh chữ nhật mới.
*   **Trạng thái Kéo (Drag Mode):** Đoạn mã khởi tạo `dragRef.current = { type: 'marquee', offsetX, offsetY }` để lưu vector dịch chuyển.
*   **Di chuyển & Xử lý Menu:** 
    * Thu ẩn Context Menu (Sao chép / Cắt) khi ngón tay đang trượt.
    * Liên tục gọi `requestAnimationFrame` vẽ lại Canvas Mảng bám (Overlay Canvas) với x/y mới.
    * Khi thả tay, tái tính toán tọa độ Màn hình thực (Client Bounding Rect) để hiển thị lại Context Menu ngay dưới đít vùng cắt.

## 3. Lợi ích
Giảm áp lực phải vẽ lại hình dạng nhiều lần đối với các mảng cắt giống nhau (ví dụ: Logo lặp lại, dấu vân tay, form điền chữ nhật giống hệt nhau).
