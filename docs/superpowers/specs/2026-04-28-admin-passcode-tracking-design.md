# Spec: Admin Passcode & User Tracking

> Phiên bản: 1.0  
> Ngày tạo: 2026-04-28  
> Trạng thái: Draft

## 1. Mục tiêu (Objective)
Thay thế hệ thống đăng nhập Google Auth phức tạp bằng hệ thống xác thực Passcode (Mật khẩu dùng chung) cực kỳ đơn giản.
Đồng thời, xây dựng hệ thống theo dõi (Tracking) lưu lịch sử truy cập của người dùng và một Trang Quản Trị (Admin Dashboard) để thống kê các lượt truy cập này.

## 2. Luồng thao tác (User Flow)
1. **Truy cập**: Người dùng vào địa chỉ ứng dụng (URL).
2. **Cửa ải đăng nhập (Gate)**: Màn hình hiển thị duy nhất một ô nhập mã truy cập.
   - Nếu nhập mã người dùng (`plpl12345`): 
     - Ứng dụng âm thầm gửi thông tin thiết bị lên Supabase (`visit_logs`).
     - Chuyển vào giao diện xử lý PDF.
   - Nếu nhập mã Admin (`admin999` - có thể thay đổi trong code):
     - Chuyển thẳng vào màn hình Admin Dashboard.
   - Nếu nhập sai: Báo lỗi "Mã không hợp lệ".

## 3. Kiến trúc kỹ thuật (Architecture)

### Tech Stack
- **Database**: Supabase PostgreSQL.
- **Client**: `@supabase/supabase-js` (sử dụng Anon Key, không cần Auth).

### Cấu trúc bảng (Data Schema)
**Table: `visit_logs`**
| Tên cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | uuid (PK) | Định danh duy nhất |
| `created_at` | timestamp | Thời điểm truy cập |
| `device_type` | text | Loại thiết bị (Mobile/Tablet/Desktop) |
| `os` | text | Hệ điều hành (iOS, Android, Windows, Mac) |
| `browser` | text | Trình duyệt (Safari, Chrome, v.v.) |
| `user_agent` | text | Chi tiết User-Agent nguyên bản |

### Cơ chế lưu trữ & Quyền (RLS)
- App sử dụng Anon Key để gọi API `insert` vào bảng `visit_logs`.
- **Row Level Security (RLS)** trên Supabase sẽ được cấu hình:
  - Cho phép `INSERT` ẩn danh (anon).
  - Cho phép `SELECT` ẩn danh (anon) để Admin Dashboard hiển thị dữ liệu (Vì bảo mật cấp app đã khóa bằng mã Admin trước khi gọi dữ liệu).

## 4. Giao diện (UI/UX)
- **Thiết kế**: Theo phong cách Radical Clarity & Calm.
- **Màn hình Đăng Nhập (Login Screen)**: 
  - Nền mờ Glassmorphism.
  - Một ô input mật khẩu, hỗ trợ nhấn Enter để Submit.
- **Màn hình Quản Trị (Admin Dashboard)**:
  - Tách biệt hoàn toàn với giao diện xử lý PDF.
  - Có nút "Thoát / Đăng xuất" ở góc.
  - Hiển thị tổng số lượt truy cập.
  - Một bảng (Table) đơn giản hiển thị danh sách các lượt truy cập, sắp xếp từ mới nhất tới cũ nhất.

## 5. Kế hoạch triển khai (Kỳ vọng)
1. Tạo bảng `visit_logs` trên Supabase thông qua SQL Editor.
2. Cập nhật `App.jsx` để thêm trạng thái `authStatus` (`locked`, `user`, `admin`).
3. Xây dựng component `LoginGate` hiển thị ô nhập mã.
4. Xây dựng component `AdminDashboard` để fetch và hiển thị dữ liệu từ `visit_logs`.
5. Tích hợp hàm lấy thông tin thiết bị (User-Agent parser) trước khi vào chế độ `user`.
