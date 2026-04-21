# Thiết kế Kỹ Thuật: Custom Pinch-to-Zoom

## 1. Vấn đề
Mở khóa chức năng phóng to/thu nhỏ tài liệu PDF thông qua thao tác kẹp/giãn 2 ngón tay (Pinch-to-zoom) trên màn hình cảm ứng di động.

## 2. Giải pháp: Internal React Touch Tracking
*   Không can thiệp vào Meta Tag `user-scalable` của trình duyệt. Việc này đảm bảo toàn bộ các Toolbars, Menu nổi và UI Controls không bị phóng to phình trướng ra ngoài màn hình bị lỗi Layout.
*   **Touch Event Listener**: Đính kèm trực tiếp vào `ovCanvas` thông qua `callbackRef`. Khi `handleDown` nhận dạng có `>= 2 touches`, hệ thống tự khóa logic "Drag Marquee" hoặc "Pan Mode", và khởi tạo gốc lưu tọa độ Pinch `initialDist` và `initialZoom`.
*   **Tính toán khoảng cách**: Trong `handleMove`, dùng định lý Pytago $d = \sqrt{dx^2 + dy^2}$ để đo khoảng cách hiện tại. Tỷ lệ Scale Mới = `initialZoom * (currentDist / initialDist)`.
*   **Trạng态 Đồng nhất**: Thay đổi `zoom` State hiện tại bằng một hàm bọc `setZoom`, song song giữ 1 giá trị Sync vào `zoomRef` để Pointer Handler đọc được mà không làm Dependency chạy lại quá nhiều lần (Gây tuột listener 60 fps).

## 3. Trải nghiệm
Thu phóng mượt mà phần lõi Canvas như trên Google Maps, thanh công cụ Toolbars vĩnh viễn đứng yên thanh lịch.
