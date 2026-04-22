---
description: Build + Deploy lên Vercel production — tự động hóa toàn bộ pipeline ship code
---

Thực hiện pipeline ship code cho PDF Patcher theo thứ tự:

### Bước 1: Build kiểm tra
```bash
cd /home/trung/.gemini/project/xu_ly_pdf/app && npm run build
```
Nếu có lỗi → DỪNG, báo cáo lỗi, không deploy.

### Bước 2: Deploy lên Vercel
```bash
npx vercel --prod --yes --token [lấy token từ 01_Inputs/vercel_token.txt nếu có, hoặc hỏi anh Trung]
```
Phải thấy dòng: `Aliased: https://app-eight-chi-75.vercel.app`

### Bước 3: Commit lên GitHub
```bash
cd /home/trung/.gemini/project/xu_ly_pdf
git add .
git commit -m "$ARGUMENTS"
git push
```
Nếu `$ARGUMENTS` trống → tự sinh commit message mô tả những gì đã thay đổi.

### Bước 4: Báo Cáo
- URL production: https://app-eight-chi-75.vercel.app
- Liệt kê các tính năng/fix đã được ship
- Gợi ý test case cụ thể anh nên kiểm tra trên iPad

**Ví dụ dùng:**
- `/ship` — tự sinh commit message
- `/ship fix: white layer bug on iOS Safari` — dùng message tùy chỉnh
