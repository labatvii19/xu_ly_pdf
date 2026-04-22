# Spec: Undo/Redo System — PDF Toolkit
> Trạng thái: DRAFT | Ngày: 2026-04-22

## 1. Mục tiêu
Cung cấp khả năng hoàn tác (Undo) và làm lại (Redo) cho các thao tác chỉnh sửa layer trong module Edit PDF, giúp người dùng tự tin hơn khi thực hiện các thao tác "vá" tài liệu trên di động.

## 2. Phạm vi can thiệp
- File: `app/src/App.jsx`
- Logic: Quản lý lịch sử của `layersRef.current`.

## 3. Chi tiết kỹ thuật

### 3.1. State Management
Thêm các refs mới để quản lý lịch sử mà không gây re-render:
```javascript
const historyRef = useRef([]); // Mảng chứa các bản snapshots của layers
const historyIndexRef = useRef(-1); // Chỉ số snapshot hiện tại
```

### 3.2. Lưu Snapshot (saveHistory)
Hàm này sẽ được gọi sau mỗi hành động làm thay đổi layers:
- **Bước 1**: Cắt bỏ các snapshots đứng sau `historyIndexRef` (néu người dùng đã undo rồi thực hiện hành động mới).
- **Bước 2**: Tạo bản copy mới của `layersRef.current` (Shallow copy mảng là đủ vì các object layer bên trong không thay đổi thuộc tính lồng nhau phức tạp).
- **Bước 3**: Push vào mảng và giới hạn 30 snapshots.
- **Bước 4**: Cập nhật `historyIndexRef`.

### 3.3. Thao tác Undo/Redo
- **Undo**: Kiểm tra `index > 0`, giảm index, cập nhật `layersRef.current`, gọi `setRenderId`.
- **Redo**: Kiểm tra `index < length - 1`, tăng index, cập nhật `layersRef.current`, gọi `setRenderId`.

## 4. Các điểm tích hợp (Triggers)
Hệ thống sẽ tự động lưu trạng thái sau các sự kiện:
1. `executeCutCopy`: Sau khi thêm layer mới.
2. `handleUp`: Khi kết thúc thao tác drag hoặc zoom (chỉ lưu nếu có sự thay đổi vị trí/kích thước).
3. `Delete Layer`: Khi xóa một layer khỏi danh sách.
4. `Bring to Front / Send to Back`: Khi thay đổi thứ tự layers.

## 5. UI/UX
- Thêm 2 nút bấm trong `Bottom Pill` hoặc trên Top Bar:
  - `Undo` (icon: `Undo2`)
  - `Redo` (icon: `Redo2`)
- Trạng thái nút: Mờ đi (disabled) nếu không thể undo/redo.

## 6. Lưu ý iOS Safari
- Đảm bảo việc copy mảng không gây treo bộ nhớ.
- Snapshot đầu tiên nên được lưu ngay khi PDF load xong (mảng rỗng).
