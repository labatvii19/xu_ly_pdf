# Technical Spec: Paint & Eraser Tools

> Phiên bản: 1.0  
> Ngày tạo: 2026-04-23  
> Trạng thái: Draft

## 1. Mục tiêu
Bổ sung công cụ vẽ tự do (Paint) và tẩy xóa (Eraser) cho ứng dụng PDF Patcher, tối ưu hóa cho trải nghiệm di động (iPad/iPhone) và tương thích hoàn toàn với hệ thống Undo/Redo.

## 2. Đặc tả tính năng

### 2.1 Paint Tool (Bút vẽ)
- **Cơ chế:** Vẽ tự do bằng ngón tay hoặc Apple Pencil trên màn hình.
- **Lưu trữ:** Mỗi nét vẽ (từ lúc chạm đến lúc nhấc tay) được lưu thành một Layer riêng biệt (`type: 'stroke'`).
- **Dữ liệu:** Sử dụng SVG Points (Vector) để đảm bảo không bị vỡ nét khi Zoom.
- **Thuộc tính:**
    - `color`: [Trắng, Đen, Đỏ, Xanh].
    - `size`: 1px - 50px (mặc định 5px).

### 2.2 Eraser Tool (Tẩy xóa)
- **Cơ chế đa năng:**
    - **Xóa Layer:** Khi rê trúng một Layer (Stroke hoặc Image), layer đó sẽ bị xóa khỏi danh sách.
    - **Vá trắng:** Cho phép vẽ màu trắng đè lên PDF để che nội dung gốc (thực chất là một Stroke màu trắng).
- **Phản hồi:** Cần có vùng quét (Radius) để người dùng dễ dàng xóa các nét vẽ nhỏ.

### 2.3 Giao diện điều khiển (UX)
- Thêm icon `Pencil` và `Eraser` vào Bottom Pill.
- Khi một trong 2 công cụ được chọn, hiển thị **Sub-Toolbar** nổi phía trên Pill chứa:
    - **Color Palette:** 4 nút màu.
    - **Size Slider:** Thanh kéo điều chỉnh độ dày cọ.

## 3. Kiến trúc kỹ thuật

### 3.1 Cấu trúc dữ liệu Layer mới
```javascript
{
  id: "stroke-123",
  type: "stroke",
  color: "#ff0000",
  width: 5,
  points: [{x, y}, {x, y}, ...], // Hệ tọa độ 1.0x (PDF Points)
  opacity: 1
}
```

### 3.2 Hiển thị (Rendering)
Sử dụng thẻ `<path>` trong SVG hiện có của ứng dụng:
```html
<path 
  d="M x1 y1 L x2 y2 ..." 
  stroke="#ff0000" 
  stroke-width="5" 
  fill="none" 
  stroke-linecap="round" 
  stroke-linejoin="round"
/>
```

### 3.3 Hit-Testing (Eraser logic)
- Sử dụng thuật toán tính khoảng cách từ điểm chạm đến đoạn thẳng (Point-to-Line segment distance) để xác định nét vẽ bị xóa.
- Đối với ảnh/mask: Kiểm tra tọa độ điểm chạm có nằm trong bounding box của layer không.

## 4. Tác động hệ thống
- **Undo/Redo:** Mỗi Stroke Layer được thêm vào sẽ tạo một snapshot mới, cho phép Undo mượt mà.
- **Export PDF:** 
    - Các stroke màu trắng được xuất thành `drawRectangle` (nếu đơn giản) hoặc `drawPath` (phức tạp) trong `pdf-lib`.
    - Các nét vẽ màu khác được xuất thành vector paths trong PDF.

## 5. Kế hoạch triển khai (Phác thảo)
1. Cập nhật `App.jsx` state cho Brush settings.
2. Thiết kế Toolbar UI con (Sub-Pill).
3. Triển khai Touch Handlers cho chế độ vẽ (ghi nhận mảng điểm).
4. Viết hàm chuyển mảng điểm thành SVG Path string.
5. Triển khai logic Eraser (hit-test xóa layer).
6. Cập nhật hàm Export PDF để hỗ trợ nét vẽ.
