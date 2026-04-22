# Kiến Trúc Hệ Thống — PDF Toolkit
> Phiên bản: 1.0 | Ngày: 2026-04-22 | Trạng thái: LOCKED ✅
> **ĐÂY LÀ TÀI LIỆU GỐC — AGENT KHÔNG ĐƯỢC SỬA ĐỔI**

---

## 1. Kiến Trúc Tổng Thể (Target Architecture)

```
pdf-toolkit/
├── app/
│   ├── src/
│   │   ├── main.jsx              # Entry point + Router
│   │   ├── App.jsx               # Shell: Layout, Nav, Auth guard
│   │   ├── index.css             # Design system tokens
│   │   │
│   │   ├── modules/              # Mỗi tool là 1 module độc lập
│   │   │   ├── edit-pdf/
│   │   │   │   ├── EditModule.jsx      # Refactored từ App.jsx hiện tại
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useCanvas.js    # Canvas + touch handlers
│   │   │   │   │   ├── useLayers.js    # Layer state management
│   │   │   │   │   └── useHistory.js   # Undo/Redo stack
│   │   │   │   └── services/
│   │   │   │       ├── pdfService.js   # PDF.js load & render
│   │   │   │       └── exportService.js # pdf-lib export
│   │   │   │
│   │   │   ├── split-pdf/         # Phase 3
│   │   │   ├── merge-pdf/         # Phase 4
│   │   │   └── convert/           # Phase 4
│   │   │
│   │   ├── components/            # Shared UI components
│   │   │   ├── Dashboard.jsx      # Trang chọn tool (Phase 2)
│   │   │   ├── AuthGuard.jsx      # Bảo vệ route (Phase 2)
│   │   │   └── ui/               # Glass buttons, Pill, etc.
│   │   │
│   │   └── services/
│   │       └── authService.js     # Auth logic (Phase 2)
```

---

## 2. Quyết Định Kiến Trúc Đã Khóa (ADR)

### ADR-001: Client-Side Only PDF Processing
**Quyết định:** Toàn bộ xử lý PDF diễn ra trên browser, không upload file lên server.
**Lý do:** Bảo mật dữ liệu người dùng, không cần backend xử lý file nặng.
**Hệ quả:** Dùng `pdfjs-dist` (đọc) + `pdf-lib` (ghi) chạy trong browser.

### ADR-002: pdfjs-dist Legacy Build cho iOS Safari
**Quyết định:** LUÔN import từ `pdfjs-dist/legacy/build/pdf.mjs`, KHÔNG từ `pdfjs-dist/build/`.
**Lý do:** iOS Safari 14-16 không hỗ trợ `Promise.withResolvers` — legacy build có polyfill.
**Hệ quả:** Bundle lớn hơn ~200KB nhưng đảm bảo tương thích.

### ADR-003: touchAction: 'none' Trên Overlay Canvas
**Quyết định:** Overlay canvas LUÔN có `touchAction: 'none'`.
**Lý do:** Nếu dùng `pan-x pan-y`, Safari iOS không delivery `touchmove` 2 ngón → pinch zoom chết.
**Hệ quả:** Scroll được implement bằng cách KHÔNG gọi `preventDefault()` khi không drag.

### ADR-004: getImageData() Sync Trước toBlob() Async
**Quyết định:** Khi copy/cut, PHẢI dùng `getImageData()` đồng bộ để snapshot pixel trước, SAU ĐÓ mới dùng `toBlob()` async.
**Lý do:** `toBlob()` async chạy sau khi canvas re-render → canvas đã trắng → blob trắng.
**Hệ quả:** Pattern: getImageData() → putImageData() → toBlob() → createObjectURL().

### ADR-005: Blob URL Thay DataURL
**Quyết định:** Dùng `URL.createObjectURL(blob)` thay `canvas.toDataURL()` cho image layers.
**Lý do:** DataURL siêu dài gây memory issue trên iOS, Safari có thể ngắt quãng việc load.
**Hệ quả:** Phải quản lý lifecycle của Blob URLs (revoke khi layer bị xóa).

### ADR-006: useRef Thay useState Cho Live Data
**Quyết định:** `layersRef`, `marqueeRef`, `dragRef`, `pinchRef` dùng `useRef`, KHÔNG `useState`.
**Lý do:** setState trong touch move handlers gây re-render 60fps → jank trên mobile.
**Hệ quả:** Dùng `setRenderId(v => v+1)` để trigger re-render có kiểm soát.

### ADR-007: Safari Gesture API Cho Pinch Zoom
**Quyết định:** Đăng ký `gesturestart` + `gesturechange` events (Safari-specific) song song với `touchmove`.
**Lý do:** `gesturechange` cung cấp `e.scale` trực tiếp, chính xác hơn tự tính từ `touches`.
**Hệ quả:** Pinch zoom mượt trên iPad, fallback về touchmove cho browsers khác.

### ADR-008: Module-First Architecture
**Quyết định:** Mỗi PDF tool (edit, split, merge, convert) là một module độc lập trong `modules/`.
**Lý do:** Dễ thêm module mới, dễ test riêng, tránh App.jsx phình thành 5000 dòng.
**Hệ quả:** Phase 1 cần refactor App.jsx → EditModule.jsx trước khi add modules mới.

---

## 3. Stack Kỹ Thuật

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Framework | React 19 + Vite 8 | Không đổi |
| PDF đọc | `pdfjs-dist` v5 (legacy build) | KHÔNG đổi sang build thường |
| PDF ghi | `pdf-lib` v1.17 | |
| Icons | `lucide-react` | |
| Styling | Vanilla CSS (design tokens) | Không dùng Tailwind |
| Deploy | Vercel | Auto alias: `app-eight-chi-75.vercel.app` |
| Auth (Phase 2) | TBD — đề xuất Supabase Auth hoặc Firebase Auth | Chưa quyết định |
| Payment (Phase 2) | TBD — đề xuất Stripe hoặc MoMo | Chưa quyết định |

---

## 4. Routing Structure (Target)

```
/                  → Dashboard (chọn tool) — Phase 2
/login             → Đăng nhập — Phase 2
/edit              → Edit PDF module ← hiện tại
/split             → Split PDF — Phase 3
/merge             → Merge PDF — Phase 4
/convert           → Convert — Phase 4
```

---

## 5. Chiến Lược Phát Triển

**Giai đoạn 1 (Hiện tại):**
- Không thêm route, không thêm auth
- Chỉ refactor `App.jsx` → `EditModule.jsx` khi đã stable
- Ưu tiên: bug fix → undo/redo → eraser → PC testing

**Giai đoạn 2+:**
- Thêm routing (React Router)
- Thêm auth wrapper
- Dashboard xuất hiện sau login
