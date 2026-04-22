---
name: pdf-patcher-dev
description: Skill chuyên biệt cho dự án PDF Patcher. Dùng khi sửa bug, thêm tính năng, hoặc debug bất cứ thứ gì liên quan đến canvas, touch, iOS Safari, layer management, PDF export trong dự án xu_ly_pdf.
---

# PDF Patcher Dev Skill

Skill chuyên biệt bao gồm các rules kỹ thuật tích lũy từ quá trình debug thực tế trên **Safari iPad/iPhone**.

## Khi Nào Dùng Skill Này

- Bất kỳ thay đổi nào liên quan đến `App.jsx`
- Bug liên quan đến touch, gesture, canvas trên iOS Safari
- Thêm tính năng layer mới
- Sửa lỗi copy/cut/paste nội dung PDF
- Export PDF ra file

## Quy Trình 5 Bước Chuẩn

### Bước 1: Đọc Context
Trước khi sửa bất cứ thứ gì, đọc phần liên quan trong `App.jsx`:
```
- Lines 1-35: Helper functions (getClientXY, getPinchDist, toCanvasCoords)
- Lines 90-210: Touch handlers (handleDown, handleMove, handleUp)
- Lines 250-300: Canvas callback ref & PDF render
- Lines 336-400: executeCutCopy (CỰC KỲ NHẠY CẢM - đọc kỹ)
- Lines 540-600: JSX render (canvas, SVG layers)
```

### Bước 2: Kiểm Tra Luật Bất Di Bất Dịch

Trước khi viết code, xác nhận không vi phạm:

```
□ touchAction vẫn là 'none' trên overlay canvas
□ getImageData() được gọi ĐỒNG BỘ trước toBlob()
□ Import pdfjs từ 'pdfjs-dist/legacy/build/'
□ maskLayer được push VÀO MẢNG TRƯỚC imageLayer
□ Không dùng imageSmoothingEnabled = false trước drawImage của copy
```

### Bước 3: Implement Theo Slice Nhỏ

Mỗi thay đổi phải:
- Chỉ chạm đúng phần cần sửa
- Không phá vỡ các handler khác
- Build thành công: `npm run build`

### Bước 4: Verify Build

```bash
cd app && npm run build
# Phải thấy: ✓ built in Xms
# Không được có lỗi đỏ
```

### Bước 5: Deploy & Report

```bash
npx vercel --prod --yes --token [token]
# URL: https://app-eight-chi-75.vercel.app
```

---

## Chẩn Đoán Bug Nhanh (iOS Safari Specific)

### White Layer Bug (Copy ra vùng trắng)
```
Nguyên nhân: toBlob() async chạy sau khi canvas bị re-render
Giải pháp:
  1. getImageData(x0, y0, w, h) → ĐỒNG BỘ, lưu vào biến
  2. Xóa UI state (setContextMenu, setSelRect, setMode)
  3. Tạo canvas tạm: tmp.getContext('2d').putImageData(pixelData, 0, 0)
  4. tmp.toBlob(callback) → trong callback: createObjectURL → setRenderId
```

### Pinch Zoom Không Hoạt Động
```
Nguyên nhân: touchAction: 'pan-x pan-y' chặn multi-touch events
Giải pháp: touchAction: 'none' VÀ không preventDefault trong handleMove
           khi không có dragRef (để scroll hoạt động bình thường)
```

### PDF Không Load Trên iPhone/iPad
```
Nguyên nhân: pdfjs-dist v5 dùng Promise.withResolvers không có trong Safari cũ
Giải pháp: Import từ 'pdfjs-dist/legacy/build/pdf.mjs' (có polyfill)
```

### Layer Dán Sai Vị Trí
```
Nguyên nhân: selRect đang ở tọa độ canvas (2.5× scale), SVG viewBox cũng 2.5×
             → tọa độ phải KHỚP nhau
Cần kiểm tra: toCanvasCoords() trả về canvas pixel coords = SVG coords → đúng
              Chỉ sai nếu có bug trong getBoundingClientRect() lúc zoom
```

---

## Các Quyết Định Kiến Trúc Đã Xác Nhận (ADR)

| Quyết định | Lý do |
|---|---|
| Dùng `useRef` thay `useState` cho layer data trong move handlers | Tránh re-render 60fps, giữ 60fps animation |
| `requestAnimationFrame` để batch render | Một frame một re-render |
| SVG thay Canvas cho layer hiển thị | Scale tốt với CSS zoom, không cần re-draw |
| Blob URL thay DataURL | DataURL quá dài gây vấn đề memory trên iOS |
| Legacy pdfjs build | Hỗ trợ Safari iOS 14+ |
| `getImageData` sync snapshot | Tránh race condition với canvas re-render |

---

## Verification

Sau khi sửa bất kỳ tính năng nào:

- [ ] `npm run build` thành công (không lỗi đỏ)
- [ ] Test Copy/Cut trên trình duyệt Desktop Chrome → layer hiện đúng nội dung
- [ ] Test Pinch Zoom nếu có thay đổi touch handler
- [ ] Deploy lên Vercel và test trên Safari iPad thực tế nếu liên quan iOS
- [ ] Commit code lên GitHub với message mô tả rõ ràng
