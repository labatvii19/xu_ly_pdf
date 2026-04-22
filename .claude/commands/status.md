---
description: Xem nhanh toàn bộ trạng thái dự án — git log, bundle size, URL production
---

Chạy lệnh nhanh để cung cấp bức tranh tổng thể về trạng thái dự án:

### 1. Git Status & Lịch Sử
```bash
cd /home/trung/.gemini/project/xu_ly_pdf
git log --oneline -10
git status
```

### 2. Bundle Size Hiện Tại
```bash
cd app && npm run build 2>&1 | grep -E "✓ built|kB|MB"
```

### 3. Danh Sách Specs Đã Có
```bash
ls -la docs/superpowers/specs/
```

### 4. Danh Sách Layers & Features Hiện Tại (từ App.jsx)
Đọc nhanh `app/src/App.jsx` dòng 44-55 (state declarations) để liệt kê các tính năng đang hoạt động.

### Tổng Hợp Báo Cáo
Hiển thị theo format:

```
📦 BUILD   : [size] — [ngày build cuối]
🚀 DEPLOY  : https://app-eight-chi-75.vercel.app
📋 COMMITS : [10 commit gần nhất]
📄 SPECS   : [danh sách file spec]
✅ FEATURES: [danh sách tính năng từ state declarations]
```
