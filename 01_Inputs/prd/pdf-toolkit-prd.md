# PRD — PDF Toolkit Web App
> Phiên bản: 1.0 | Ngày: 2026-04-22 | Trạng thái: LOCKED ✅
> **ĐÂY LÀ TÀI LIỆU GỐC — AGENT KHÔNG ĐƯỢC SỬA ĐỔI**

---

## 1. Tầm Nhìn Sản Phẩm

Một bộ công cụ xử lý PDF chạy trên web, hoạt động mượt mà trên cả **điện thoại di động (iOS/Android)** và **máy tính (PC/Mac)**, phục vụ người dùng cá nhân trả phí.

**Câu slogan:** *"Mọi thao tác trên PDF — ở bất cứ đâu, trên bất kỳ thiết bị nào."*

---

## 2. Đối Tượng Người Dùng

| Thuộc tính | Giá trị |
|---|---|
| Loại người dùng | Cá nhân (Individual) |
| Quy mô | Nhỏ (~vài người dùng ban đầu) |
| Thiết bị chính | iPhone/iPad (iOS Safari) + PC Desktop |
| Trường hợp dùng điển hình | Vá nội dung PDF trên iPad bằng ngón tay/bút |

---

## 3. Các Module Sản Phẩm

### Module 1: Edit PDF ← `ĐANG XÂY DỰNG`
Chỉnh sửa, vá nội dung tài liệu PDF hiện có.

**Tính năng đã có:**
- Upload và render PDF
- Marquee selection (khoanh vùng)
- Copy / Cut / Paste layer
- Lock layer (chốt cố định)
- Z-index arrangement (Bring to Front / Send to Back)
- Layer zoom (scale up/down)
- Pinch-to-zoom trang PDF
- Clip Bin (khay chứa mảnh cắt)
- Export PDF với tên tùy chỉnh
- Chọn đường dẫn lưu file (File System Access API)

**Tính năng CÒN THIẾU (phải hoàn thiện trước khi chuyển Module 2):**
- [ ] Undo / Redo (Ctrl+Z / Ctrl+Y)
- [ ] Eraser tool — xóa vùng trên layer
- [ ] Paint/Brush tool — phủ màu để che đường nối layer
- [ ] Fix: Tất cả bug iOS Safari còn sót lại
- [ ] Fix: Test và đảm bảo hoạt động trên PC (Desktop Chrome/Firefox/Safari)

### Module 2: Split PDF ← `Phase 3`
Chọn trang, tách thành file PDF riêng lẻ.

### Module 3: Merge PDF ← `Phase 4`
Kéo nhiều file PDF vào, sắp xếp thứ tự trang, xuất 1 file.

### Module 4: Convert → PDF ← `Phase 4`
Chuyển JPG/PNG/Word thành PDF.

*(Có thể mở rộng thêm modules khác trong tương lai)*

---

## 4. Lộ Trình 4 Giai Đoạn

```
Phase 1 — Hoàn Thiện Edit PDF
  → Fix bug iOS + test PC
  → Thêm Undo/Redo
  → Thêm Eraser + Paint tool
  → Refactor App.jsx → EditModule (chuẩn bị cho multi-module)

Phase 2 — Nền Tảng Sản Phẩm
  → Authentication (đăng nhập)
  → Thanh toán đơn giản (1 gói cá nhân)
  → Dashboard chọn tool

Phase 3 — Split PDF Module

Phase 4 — Merge PDF + Convert Module
```

---

## 5. Yêu Cầu Phi Chức Năng

| Yêu cầu | Mục tiêu |
|---|---|
| Mobile-first | Hoạt động hoàn hảo trên iPhone/iPad iOS Safari |
| Responsive | Cũng hoạt động tốt trên Desktop |
| Performance | Load time < 3s trên 4G |
| Platform | Web App (PWA-ready trong tương lai) |
| Future | Có thể wrap thành native app Android/iOS sau |

---

## 6. Yêu Cầu Kỹ Thuật Bắt Buộc

*(Những thứ KHÔNG được phép thay đổi — xem thêm architecture.md)*

- PDF Editor chạy thuần client-side (không upload lên server)
- Không lưu file PDF của user lên cloud (bảo mật)
- Hỗ trợ iOS Safari 14+

---

## 7. Định Nghĩa "Hoàn Thành" (DoD) Phase 1

Phase 1 được coi là DONE khi:
- [ ] Copy/Cut tạo layer hiển thị đúng nội dung (không trắng) trên iOS Safari
- [ ] Pinch zoom hoạt động mượt trên iPad
- [ ] Scroll trang hoạt động trong Pan mode
- [ ] Undo/Redo hoạt động (tối thiểu 20 bước)
- [ ] Eraser tool xóa được vùng trên layer
- [ ] Toàn bộ tính năng test OK trên Desktop Chrome
- [ ] Export PDF ra đúng nội dung
