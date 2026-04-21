# Thiết kế Kiến trúc: Khay nhớ tạm (Global Clip Bin) xuyên tài liệu

## 1. Tóm tắt Mục tiêu
Phân tích và thiết kế mô hình bộ nhớ tạm (Global Clipboard / Clip Bin) giúp người dùng PDF Patcher Mobile có thể Copy các khối hình/chữ từ PDF A, sau đó mở file PDF B và dán các khối đó vào một cách liền mạch, không làm treo máy (RAM-safe) và tuân thủ giao diện tối giản Apple-style mới.

## 2. Kiến trúc Dữ liệu (Data Flow)
*   **Trạng thái Toàn cục (Global State):** Khởi tạo một `useState` array tên là `clipBin` ở mức độ Root (bên trong `App.jsx`). Mảng này sẽ nằm hoàn toàn độc lập với `pdfFile`, `numPages`, và `layersRef`.
*   **Hành vi thụ động (Passive Collection):** Hàm `executeCutCopy` mỗi khi được gọi để Copy/Cut sẽ tạo ra một object `{ id, dataUrl, w, h }`. Object này vừa được đẩy vào `layersRef` (như cũ) vừa được ngầm đẩy vào mảng `clipBin`.
*   **Hành vi thay tệp (Context Switch):** Để tránh việc load lại toàn trang web (F5) làm chế chết biến bộ nhớ tạm, một logic mở file mới `handleNewFileUpload` sẽ được bổ sung. Nó reset `pdfFile`, `layersRef`, `pageStore`, `pageNum` về 0 nhưng KIÊN QUYẾT giữ nguyên mảng `clipBin`.

## 3. Kiến trúc Giao diện UI/UX
*   **Nút "Mở File" hỏa tốc (Fast Open Drawer):** 
    Thay thế chữ "📄 Patcher" tĩnh học trên góc trái màn hình thành nút có thể bấm (Thêm icon `FolderOpen`). Bấm vào sẽ kích hoạt thẻ `<input type="file" />` ẩn.
*   **Khay Chứa (The Clip Bin Panel):**
    *   **Icon:** Nút hành trang (biểu tượng `Briefcase` hoặc `Clipboard`) sẽ được chèn thành nút thứ 4 vào Viên thuốc tĩnh lặng (Bottom Pill) dưới đáy màn hình.
    *   **Panel thiết kế:** Tái sử dụng thiết kế kính mờ (Frost glass) của bàng Layer. Cửa sổ Clip Bin hiện danh sách dạng cuộn dọc. Mỗi Item hiển thị bản xem trước ảnh (Thumbnail image).
    *   **Clear All (Nút thùng rác):** Góc thiết kế có nút nhỏ để xóa sạch đồ trong khay giải phóng bộ nhớ.

## 4. Tương tác Dán (Paste Interaction)
Khi người dùng đang ở File B, họ nhấn vào nút Clip Bin:
*   Tap vào một Item trong danh sách.
*   Item này ngay lập tức được biến đổi thành một layer mới trong `layersRef` của File B và đặt ở tọa độ mặc định (`x: 50, y: 50` hoặc tính toán center viewport).
*   Giao diện panel tự đóng lại để người dùng bắt đầu thao tác kéo thả dán ở File B.

Đảm bảo độ trễ gần như rỗng `< 50ms` và vẫn tuân thủ 100% luật lệ "Invisible Interface" ban đầu.
