# Thiết kế Kỹ thuật: Hệ thống Khóa Lớp (Layer Locking)

## 1. Mục tiêu
Cho phép người dùng "đóng đinh" phân đoạn hình/chữ vào nền PDF, ngăn chặn tuyệt đối mọi hành vi chạm/rê/tương tác nhầm.

## 2. Kiến trúc Dữ liệu
*   **Property Mới:** Mỗi object lưu trong mảng `layersRef.current` sẽ bổ sung thêm trường dữ liệu ngầm định `locked: boolean` (Mặc định `false`).

## 3. Kiến trúc UI / Hành vi
*   **Menu Dính (Context Menu):** Khi người dùng click vào Layer tự do, Context Menu sẽ có thêm một phím bấm hình ổ khóa (Lock Icon). Khi bấm, gán `l.locked = true` và `setSelectedId(null)` để thủ tiêu vùng chọn, bắt đầu hành vi ngó lơ.
*   **Lọc Điểm Chạm (Hit Testing):** Hàm `find(l => ...)` chạy trong `handleDown` của thao tác Pan Mode sẽ được đính kèm giới hạn `!l.locked`. Nếu bị khóa, điểm chạm (PointerEvent) sẽ đi xuyên qua lớp ảnh và kích hoạt Scroll View của phần nền giấy.
*   **Khay Layers (Gỡ Lỗi):** Bên trong Layer Panel (bảng có danh sách tất cả các miếng cắt), tái sử dụng giao diện Kính mờ. Thêm nút Toggle Ổ Khóa (Mở / Khóa). Nút này cho phép mở khóa lại những llayer đã bị dính chết trên mặt giấy để sửa chữa khi làm size.
