---
description: Review code trong phạm vi $ARGUMENTS — phát hiện vấn đề correctness, performance, security, maintainability
---

Áp dụng skill: `.agent/workflows/agent-skills-main/skills/code-review-and-quality/SKILL.md`

Phạm vi review: **$ARGUMENTS** (để trống = toàn bộ `app/src/`)

---

### Bước 0: Xác Định Phạm Vi

```
Nếu $ARGUMENTS trống    → Review App.jsx + services/
Nếu là tên file cụ thể  → Review file đó
Nếu là tên tính năng    → Tìm và review code liên quan
```

### Bước 1: Áp Dụng 5 Trục Review (từ skill)

Theo đúng framework 5 trục trong `code-review-and-quality/SKILL.md`.

**Chỉ đọc thêm context chuyên biệt NẾU cần:**
- Có canvas/touch/iOS code → đọc `.agent/skills/pdf-patcher-dev/SKILL.md`
- Có PDF export code → đọc `services/exportService.js` trước
- Có dependency mới → kiểm tra `package.json`

### Bước 2: Phân Loại Vấn Đề

```
🔴 Phải sửa   — sai logic, vi phạm invariant đã biết, security issue
🟡 Nên sửa    — performance, readability, khó maintain
🟢 Gợi ý      — optional improvement
```

### Bước 3: Đề Xuất Action

Với mỗi vấn đề 🔴: đưa ra patch cụ thể ngay.
Với vấn đề 🟡/🟢: hỏi anh Trung có muốn xử lý không.

**Ví dụ dùng:**
- `/review` — review toàn bộ source
- `/review App.jsx` — chỉ review file App.jsx
- `/review executeCutCopy` — review một function cụ thể
