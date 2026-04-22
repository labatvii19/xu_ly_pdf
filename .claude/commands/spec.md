---
description: Tạo spec tính năng mới — brainstorm, đặc tả kỹ thuật, lưu vào docs/superpowers/specs/
---

Đọc skill: `.agent/skills/brainstorming/SKILL.md`

Thực hiện quy trình spec-driven cho tính năng: **$ARGUMENTS**

### Phase 1: Brainstorm & Làm Rõ Yêu Cầu
Đặt 3-5 câu hỏi làm rõ:
- Tính năng này giải quyết vấn đề gì cụ thể trong việc vá PDF?
- Người dùng thực hiện thao tác này bằng ngón tay hay bút cảm ứng?
- Có tính năng tương tự nào trên ứng dụng PDF chuyên nghiệp khác không?
- Giới hạn kỹ thuật nào cần lưu ý (iOS Safari, canvas, touch)?

### Phase 2: Tạo Spec Document
Tạo file: `docs/superpowers/specs/YYYY-MM-DD-pdf-patcher-[tên-tính-năng].md`

Nội dung bao gồm:
```markdown
# [Tên Tính Năng]

## Vấn Đề Cần Giải Quyết
## Giải Pháp Đề Xuất
## Hành Vi Chi Tiết (trên touch screen)
## Kiến Trúc Kỹ Thuật
  - File cần sửa: App.jsx / pdfService.js / exportService.js / index.css
  - State mới cần thêm (nếu có)
  - Touch handler cần cập nhật (nếu có)
## Các Trường Hợp Biên (Edge Cases)
## Anti-patterns Cần Tránh (iOS Safari)
## Tiêu Chí Hoàn Thành
```

### Phase 3: Xác Nhận Trước Khi Code
Hiển thị spec cho anh Trung xem xét. **Không viết code cho đến khi có xác nhận.**

**Ví dụ dùng:**
- `/spec zoom layer` 
- `/spec undo redo`
- `/spec multi-page paste`
