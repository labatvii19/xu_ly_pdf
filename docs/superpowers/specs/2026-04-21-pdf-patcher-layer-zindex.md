# Thiết kế Kỹ thuật: Hệ thống Z-index Layers (Sắp xếp Lớp)

## 1. Mục tiêu
Cho phép người dùng kiểm soát mức độ chồng lấp của các đối tượng (Mask, Image) trên một trang PDF tương tự Photoshop. Giải quyết bug bóng ma mặt nạ đè lên ảnh khi cắt vùng (Cut).

## 2. Giải pháp Cấu trúc dữ liệu
*   **Fix Bug Action Cắt (Cut):** Thay vì nạp mảng bám trắng (Mask) sau vùng chứa ảnh, thứ tự sinh (Append) sẽ được sửa lại: `Mask` đẩy lên trước -> `Image` được đẩy xuống theo sau trong mảng `layersRef.current`. Điều này giúp khung chữ nhật che dấu chữ cũ nằm khít vào nền, còn mảnh cắt luôn nổi lên mặt nước.
*   **Hàm Đảo Vị Trí (arrangeLayer):** 
    Viết hàm `arrangeLayer(id, direction)` thao tác trực tiếp lên mảng `layersRef.current` theo nguyên lý Mutation:
    *   `direction === 'up'`: Định vị index, cắt ra và ném xuống cuối mảng (`push`) -> Nổi lên mặt trên cùng giao diện.
    *   `direction === 'down'`: Định vị index, cắt ra và nhét lên đầu mảng (`unshift`) -> Chìm xuống tầng đáy, tức là sát dưới lớp mặt giấy in nguyên bản.

## 3. Cập nhật Mini Pill Context
Bong bóng công cụ nằm trên Layer đang được chọn sẽ tích hợp thêm 2 nút `Nâng Z` và `Hạ Z` (dùng icon `ArrowUpToLine` và `ArrowDownToLine`). 
Tối thiểu hóa chữ (chỉ để icon do đã chật chội).
