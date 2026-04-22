---
description: Tối ưu bundle size và hiệu năng — phân tích và giảm thời gian load trên mobile
---

Đọc skill: `.agent/workflows/agent-skills-main/skills/performance-optimization/SKILL.md`

Thực hiện phân tích hiệu năng PDF Patcher:

### Bước 1: Đo Lường Bundle Size Hiện Tại
```bash
cd /home/trung/.gemini/project/xu_ly_pdf/app
npm run build 2>&1 | grep -E "kB|MB|chunk"
```
Ghi lại kích thước của từng chunk.

### Bước 2: Xác Định Vấn Đề Lớn Nhất
Nguồn gốc phổ biến trong dự án này:
- `pdfjs-dist` legacy build (~1MB) — cần cho iOS Safari, không thể bỏ
- `pdf-lib` (~500KB) — có thể dynamic import
- `fabric` — kiểm tra xem có thực sự dùng không

### Bước 3: Áp Dụng Dynamic Import (nếu an toàn)
```javascript
// Thay vì import tĩnh ở đầu file:
// import { exportPdf } from './services/exportService';

// Dùng dynamic import khi user bấm nút xuất:
const { exportPdf } = await import('./services/exportService');
```

### Bước 4: Kiểm Tra Core Web Vitals
Mục tiêu cho mobile:
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

### Bước 5: Build Lại và So Sánh
```bash
npm run build 2>&1 | grep -E "kB|MB|chunk"
```

Báo cáo: Tiết kiệm được bao nhiêu KB, tác động đến load time trên mobile 4G.
