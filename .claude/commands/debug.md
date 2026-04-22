---
description: Debug bất kỳ bug nào — tự động chẩn đoán môi trường, chọn đúng skill và tìm root cause
---

## Khởi Động Quy Trình Debug

Áp dụng skill: `.agent/workflows/agent-skills-main/skills/debugging-and-error-recovery/SKILL.md`

**$ARGUMENTS** là mô tả bug (để trống nếu anh sẽ giải thích sau).

---

### Bước 0: Chẩn Đoán Môi Trường (LUÔN làm trước)

Trước khi chạy quy trình, xác định:

```
Bug xảy ra ở đâu?
├── Browser/Mobile UI    → Đọc thêm .agent/skills/pdf-patcher-dev/SKILL.md
│                           (có iOS Safari specific rules)
├── Build / Compile      → Chạy: cd app && npm run build 2>&1
├── PDF Export           → Xem: app/src/services/exportService.js
├── PDF Load / Render    → Xem: app/src/services/pdfService.js
├── Logic / State        → Xem: app/src/App.jsx (state declarations)
└── Backend / Deploy     → Xem: Vercel logs, git history
```

**Đọc thêm context file NẾU phù hợp — không đọc hết tất cả.**

---

### Bước 1–5: Theo Skill Chuẩn

Sau khi xác định môi trường, chạy đúng nguyên protocol 5 bước từ `debugging-and-error-recovery/SKILL.md`:

1. **Reproduce** — Tái hiện lỗi
2. **Localize** — Thu hẹp phạm vi
3. **Reduce** — Tạo minimal case
4. **Fix Root Cause** — Sửa nguyên nhân, không sửa triệu chứng
5. **Guard** — Đảm bảo không tái phát

---

### Xác Minh Kết Quả

```bash
cd app && npm run build
# ✓ built = OK
```

Nếu bug liên quan mobile/iOS: thêm bước deploy test trên thiết bị thực.

**Ví dụ dùng:**
- `/debug` — bắt đầu phân tích, hỏi thêm nếu cần
- `/debug copy ra layer trắng trên safari`
- `/debug build thất bại sau khi thêm dependency`
- `/debug export PDF bị lỗi font`
