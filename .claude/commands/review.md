---
description: Review toàn bộ code App.jsx — phát hiện lỗi tiềm ẩn, anti-patterns, cơ hội tối ưu
---

Đọc skill: `.agent/workflows/agent-skills-main/skills/code-review-and-quality/SKILL.md`

Thực hiện code review 5 trục cho PDF Patcher:

### Trục 1: Correctness (Đúng hành vi)
Đọc `app/src/App.jsx` và kiểm tra:
- [ ] `getImageData()` được gọi sync trước `toBlob()` trong `executeCutCopy`
- [ ] `touchAction: 'none'` trên overlay canvas
- [ ] Import từ `pdfjs-dist/legacy/build/`
- [ ] `maskLayer` luôn push vào mảng TRƯỚC `imageLayer`
- [ ] Không có `imageSmoothingEnabled = false` trước drawImage khi copy

### Trục 2: Performance (Hiệu năng)
- [ ] Touch handlers dùng `useRef` thay `useState` để tránh re-render
- [ ] `requestAnimationFrame` được dùng để batch DOM updates
- [ ] Không có re-render không cần thiết trong `handleMove`
- [ ] Blob URLs được tạo đúng cách (không DataURL cho ảnh lớn)

### Trục 3: Security (Bảo mật)
- [ ] Không có token/secret hardcode trong code
- [ ] Blob URL objects được quản lý đúng (không memory leak)

### Trục 4: Maintainability (Dễ bảo trì)
- [ ] Các hàm handler không quá 50 dòng
- [ ] Comments giải thích rõ các đoạn logic phức tạp của iOS Safari
- [ ] Không có dead code / commented-out code

### Trục 5: UX Compliance (Tuân thủ UI/UX)
- [ ] Vùng chạm tối thiểu 44×44px cho tất cả buttons
- [ ] Context menu nổi trên overlay canvas không bị che
- [ ] Pinch zoom hoạt động mượt, không giật

### Kết Quả
Liệt kê các vấn đề theo mức độ:
- 🔴 **Phải sửa ngay** (gây bug, vi phạm iOS rules)
- 🟡 **Nên sửa** (performance, maintainability)
- 🟢 **Gợi ý** (cải tiến optional)
