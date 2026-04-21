# Thiết kế Kiến trúc: Chỉnh Tỷ Lệ Lớp Ghép (Layer Scaling)

## 1. Tóm tắt
Triển khai công cụ cho phép người dùng thay đổi kích thước (Phong to / Thu nhỏ) của từng mảnh cắt riêng lẻ ngay trên vùng xử lý PDF mà không cần điểm neo góc phức tạp.

## 2. Thiết kế Giao Diện (UI)
*   **Menu Ngữ Cảnh Nổi (Floating Controls):** 
    Khi một mảnh ghép (Layer) được bấm vào (chọn), một thanh viên thuốc cực nhỏ (Mini Pill) sẽ tự bay lơ lửng ngay trên đầu của Layer đó.
*   **Bố cục Nút:** Gồm 2 nút biểu tượng kính lúp có dấu Cộng `+` và Trừ `-` tách biệt qua dải phân cách xám. 
*   **Vật liệu:** Frosted Glass (Kính mờ) đồng bộ hóa hoàn toàn với bộ chủ đề iOS.

## 3. Kiến trúc Luồng Hành Vi (Interaction)
*   **Trung tâm (Scale from center):** 
    Khi bấm nút Cộng/Trừ, thuật toán sẽ tự động điều chỉnh cả `width` và `height` với bước nhảy `5%` (0.05). Đồng thời dùng các phép tính bù đắp lại tọa độ `X` và `Y` để bức ảnh được lấy tâm ở giữa, to tròn đều ra 4 phía chứ không bị phình méo lệch sang một góc.
*   **Hiệu suất:**
    Render ngay trên Canvas Overlay, kích hoạt hàm React State để vẽ lại màn hình mà không phá vỡ DOM. Chạm liên tục sẽ chạy cực trơn tru.
