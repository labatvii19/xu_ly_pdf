# Thiết kế Lại Giao diện PDF Patcher Cốt lõi (Apple-Style Minimalism)

## 1. Tóm tắt Mục tiêu
Thiết kế lại và gọt giũa giao diện PDF Patcher Mobile tuân thủ khắt khe "5 Trụ cột Giao diện" của người dùng. Ưu tiên hàng đầu đem lại tính tàng hình (Invisible UI), sang trọng (Premium), không gian trống tinh tế, và khả năng thao tác một tay ở môi trường ngoài trời.

## 2. Hệ Ngôn ngữ Thị giác (Visual Language)
*   **Theme Chính:** Chế độ Sáng (Light Mode / iOS Style).
*   **Màu nền lõi:** Xám cao cấp bề mặt nhôm `#F5F5F7`. Bầu không khí dồn trọng điểm tập trung vào phần Document nền trắng.
*   **Màu thành phần Nổi (Panels):** Trắng tinh khiết `rgba(255, 255, 255, 0.85)` đính kèm thuộc tính kính mờ Apple `backdrop-filter: blur(25px)`.
*   **Màu hành động (Accent):** Xanh dương iOS `#007AFF` (Giao diện rành mạch). Thay thế toàn bộ màu đỏ `danger` hay xanh lè lòe loẹt.
*   **Viền & Bóng (Depth):** Viền sáng 1px `border: 1px solid rgba(0,0,0,0.06)` và bóng đổ cực nhẹ, đổ siêu mảnh tạo cảm giác bay lơ lửng `box-shadow: 0 4px 24px rgba(0,0,0,0.06)`.
*   **Văn bản:** Gỡ bỏ tối đa các chữ cái chú thích rườm rà. Mã màu text `#1D1D1F` không đen gắt, rất làm dịu mắt ngoài trời.

## 3. Kiến trúc Thành phần (Layout Changes)
*   **Màn hình Tràn viền (Immersive Canvas):** 
    Phá bỏ dải Top Bar màu tối cũ, thu hút toàn bộ 100% diện tích màn hình để chiếu PDF. 
*   **Thanh Công Cụ Viên thuốc (The Floating Tool Pill):** 
    *   **Vị trí:** Trung tâm cạnh dưới cách mép `24px`.
    *   **Hình khối:** Viên thuốc bo góc tuyệt đối (`border-radius: 99px`).
    *   **Nội dung:** Giảm hết chữ text hiển thị. Chỉ giữ 3 biểu tượng rành mạch: Bàn tay (Pan), Khung vuông (Marquee), Chồng nếp giấy (Layer).
*   **Khối thu phóng chuyên dụng (The Zoom Stick):**
    *   Viên thuốc đặt dọc ở lề bên phải (Right-edge sticky). Tích hợp phím `+` và `-` to hơn để chạm nhẹ trên thiết bị cảm ứng mà không cần phải cố rướn tay vươn lên tít tận Header cũ.
*   **Thanh Điều hướng & Lưu Trữ:** 
    *   Chỉ gồm 2 khay rời rạc nổi ở 2 đỉnh. Góc trái hiện `< Trang 1/5 >`. Góc phải hiện nút "Tải PDF".

## 4. Tương tác Thấu cảm (Humane Interaction)
*   **Tắt mọi nhiễu thị giác (Zero Noise):** Ứng dụng dứt khoát chỉ cho chọn hoặc Hủy chọn (One primary action). Không có những pop-up xác nhận lồng chéo vào nhau.
*   **Micro-animations:** Kháng cự thao tác bằng phản hồi lún nút nhấn trong dải tốc độ `transition: 0.15s`. Nút bị chạm sẽ biến đổi về `transform: scale(0.92)`.
*   Chuyển menu "Copy/Cut" thành dạng tooltip phồng nhẹ ở chính diện vùng lựa chọn, đảm bảo mắt người dùng không phải đánh ngang sang vị trí khác để tìm kiếm nút bấm.
