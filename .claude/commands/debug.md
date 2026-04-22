---
description: Debug a bug in PDF Patcher — systematic iOS Safari root-cause analysis
---

Đọc skill: `.agent/skills/pdf-patcher-dev/SKILL.md` và `.agent/workflows/agent-skills-main/skills/debugging-and-error-recovery/SKILL.md`

Sau đó làm theo quy trình 5 bước sau:

1. **Reproduce** — Xác nhận bug tái hiện ở đâu: Desktop Chrome hay Safari iPhone/iPad?
2. **Localize** — Xác định tầng lỗi:
   - Touch/Canvas logic → `App.jsx` handlers (handleDown/Move/Up)
   - Copy/Cut/Paste → `executeCutCopy` function
   - PDF render → `pdfService.js`
   - PDF export → `exportService.js`
3. **Kiểm tra Anti-patterns iOS Safari:**
   - `touchAction` còn là `'none'` trên overlay canvas không?
   - `getImageData()` có được gọi SYNC trước `toBlob()` không?
   - Import pdfjs từ `legacy/build/` chưa?
4. **Fix Root Cause** — Sửa đúng chỗ, không patch triệu chứng
5. **Verify:**
   ```bash
   cd app && npm run build
   # Phải thấy ✓ built — không có lỗi đỏ
   ```

Nếu bug liên quan iOS Safari: Dùng kiến thức từ `pdf-patcher-dev/SKILL.md` trước khi thử giải pháp mới.
