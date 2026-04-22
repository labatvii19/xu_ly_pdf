# AGENTS.md — PDF Patcher (xu_ly_pdf)
> Dành cho Antigravity IDE · Phiên bản 1.0 · Cập nhật: 2026-04-22

Hướng dẫn vận hành AI Agent trong dự án **PDF Patcher** — ứng dụng Web chỉnh sửa PDF trên thiết bị di động, triển khai trên Vercel.

---

## 🗺 Bản Đồ Dự Án

```
xu_ly_pdf/
├── app/                        # React + Vite Application
│   ├── src/
│   │   ├── App.jsx             # ⭐ Core: UI, canvas logic, touch handlers
│   │   ├── index.css           # Design system & UI tokens
│   │   └── services/
│   │       ├── pdfService.js   # PDF.js: nạp & render trang PDF
│   │       └── exportService.js# pdf-lib: xuất file PDF đã vá
│   └── package.json
├── docs/superpowers/specs/     # Đặc tả kỹ thuật từng tính năng
├── .agent/
│   ├── rules/                  # Quy tắc UI/UX bắt buộc
│   ├── skills/brainstorming/   # ⭐ Skill brainstorm (PHẢI dùng trước khi build)
│   └── workflows/agent-skills-main/skills/  # 20 skills kỹ thuật
└── AGENTS.md                   # File này
```

---

## 🤖 Mô Hình Hoạt Động của Agent trong Antigravity IDE

Antigravity IDE **không dùng slash commands** (`/spec`, `/plan`). Thay vào đó, agent phải:

1. **Tự nhận diện ý định** từ yêu cầu của anh Trung
2. **Nạp skill tương ứng** bằng cách đọc file `SKILL.md` qua `view_file`
3. **Tuân thủ workflow** trong skill đó trước khi viết bất kỳ dòng code nào

> ⚡ **Quy tắc vàng:** Không bao giờ nhảy thẳng vào code khi chưa xác định đúng skill.

---

## 📋 Bảng Ánh Xạ: Ý Định → Skill

| Khi anh Trung nói... | Skill cần nạp | Đường dẫn |
|---|---|---|
| "thêm tính năng...", "tôi muốn có..." | `idea-refine` → `spec-driven-development` | `.agent/skills/brainstorming/SKILL.md` (TRƯỚC TIÊN) |
| "lên kế hoạch", "chia nhỏ task" | `planning-and-task-breakdown` | `.agent/workflows/agent-skills-main/skills/planning-and-task-breakdown/SKILL.md` |
| "build", "implement", "làm đi" | `incremental-implementation` | `.agent/workflows/agent-skills-main/skills/incremental-implementation/SKILL.md` |
| "bug", "lỗi", "không hoạt động" | `debugging-and-error-recovery` | `.agent/workflows/agent-skills-main/skills/debugging-and-error-recovery/SKILL.md` |
| "UI", "giao diện", "thiết kế lại" | `frontend-ui-engineering` | `.agent/workflows/agent-skills-main/skills/frontend-ui-engineering/SKILL.md` |
| "review code", "kiểm tra" | `code-review-and-quality` | `.agent/workflows/agent-skills-main/skills/code-review-and-quality/SKILL.md` |
| "đơn giản hoá", "refactor" | `code-simplification` | `.agent/workflows/agent-skills-main/skills/code-simplification/SKILL.md` |
| "deploy", "lên vercel", "ship" | `shipping-and-launch` | `.agent/workflows/agent-skills-main/skills/shipping-and-launch/SKILL.md` |
| "performance", "tối ưu" | `performance-optimization` | `.agent/workflows/agent-skills-main/skills/performance-optimization/SKILL.md` |
| "lên github", "git", "commit" | `git-workflow-and-versioning` | `.agent/workflows/agent-skills-main/skills/git-workflow-and-versioning/SKILL.md` |

---

## 🔄 Vòng Đời Phát Triển Chuẩn (Áp dụng cho Dự Án này)

```
 Ý TƯỞNG      →    ĐẶC TẢ     →     XÂY DỰNG     →   KIỂM CHỨNG   →     SHIP
┌──────────┐    ┌───────────┐    ┌─────────────┐    ┌───────────┐    ┌──────────┐
│brainstorm│───▶│ spec md   │───▶│ App.jsx     │───▶│ iPad test │───▶│  Vercel  │
│SKILL.md  │    │docs/specs/│    │ + services/ │    │ Safari    │    │  deploy  │
└──────────┘    └───────────┘    └─────────────┘    └───────────┘    └──────────┘
```

### Bước 0 — Brainstorm (LUÔN LUÔN đầu tiên với tính năng mới)
```
Đọc: .agent/skills/brainstorming/SKILL.md
Tạo: docs/superpowers/specs/YYYY-MM-DD-pdf-patcher-[tên-tính-năng].md
```

### Bước 1 — Build (Thực thi theo từng lát cắt nhỏ)
- File chính: `app/src/App.jsx`
- Services: `app/src/services/pdfService.js`, `exportService.js`
- Style: `app/src/index.css`
- **Sau mỗi thay đổi:** `npm run build` để kiểm tra lỗi compile

### Bước 2 — Verify (Kiểm chứng trên thiết bị thực)
- Build + deploy lên Vercel để test trên Safari iPad
- Không chấp nhận "có vẻ đúng" — phải có bằng chứng cụ thể

### Bước 3 — Ship
```bash
# Build
npm run build

# Deploy Vercel
npx vercel --prod --yes --token [token]

# Commit lên GitHub
git add . && git commit -m "[mô tả ngắn]" && git push
```

---

## ⚙️ Context Kỹ Thuật Dự Án

### Stack
| Layer | Công nghệ |
|---|---|
| Framework | React 19 + Vite 8 |
| PDF đọc | `pdfjs-dist` v5 (legacy build cho iOS Safari) |
| PDF ghi | `pdf-lib` v1.17 |
| Icons | `lucide-react` v1.8 |
| Deploy | Vercel (auto alias: `app-eight-chi-75.vercel.app`) |

### Kiến trúc Canvas (QUAN TRỌNG — đọc kỹ trước khi sửa touch logic)

```
Scroll Container
└── PDF Container [width = vpRef.w * zoom, height = vpRef.h * zoom]
    ├── <canvas bgCanvasRef />      ← PDF render (2.5× pixel density)
    ├── <svg>                       ← Layers hiển thị (viewBox = canvas size)
    │   ├── <rect> mask layers     ← Vá trắng (luôn ở dưới cùng)
    │   └── <image> image layers   ← Nội dung đã cắt (nổi lên trên)
    └── <canvas ovCanvasRef />      ← Overlay: nhận TẤT CẢ touch events
                                       touchAction: 'none' (KHÔNG ĐƯỢC đổi)
```

### Luật Bất Di Bất Dịch về Touch/Canvas

1. **`touchAction: 'none'`** trên overlay canvas — KHÔNG ĐƯỢC đổi thành `pan-x pan-y`. Scroll sẽ hoạt động tự nhiên khi không có dragRef.
2. **Copy/Cut phải dùng `getImageData()` đồng bộ** — KHÔNG dùng `drawImage` bất đồng bộ để tránh white canvas trên Safari.
3. **`toBlob()` + `URL.createObjectURL()`** để tạo ảnh — KHÔNG dùng `DataURL` cho ảnh lớn.
4. **`pdfjs-dist/legacy/build/`** — KHÔNG đổi về `pdfjs-dist/build/` (iOS Safari sẽ crash).
5. **`getImageData` → `putImageData`** với canvas tạm — snapshot trước, async sau.

### Hệ thống Layer (State Machine)

```javascript
layersRef.current = [
  // Mảng theo thứ tự z-index (index nhỏ = dưới cùng)
  { id, type: 'mask', x, y, w, h },          // Miếng vá trắng
  { id, type: 'image', x, y, w, h,
    dataUrl: blobUrl,                          // Blob URL (không phải DataURL)
    locked: false },                           // Lock ngăn kéo thả
]
// Quy tắc: maskLayer LUÔN thêm trước imageLayer (index thấp hơn)
```

---

## 🚨 Anti-Patterns Tuyệt Đối CẤM

| Hành vi sai | Hậu quả |
|---|---|
| Nhảy thẳng vào code khi không đọc skill | Vi phạm quy trình, dễ sai hướng |
| Đổi `touchAction` thành `pan-x pan-y` | Pinch zoom chết hoàn toàn trên iOS |
| Dùng `drawImage` trong `toBlob` callback | Canvas trắng tinh trên Safari iPad |
| Import từ `pdfjs-dist/build/` | Crash ngay khi load trên iPhone/iPad |
| Thêm `imageSmoothingEnabled = false` trước `drawImage` khi copy | White chunk bug trên iOS |
| Xóa dữ liệu gốc của người dùng | Vi phạm quy tắc tuyệt đối |
| Push secrets/token lên GitHub repo public | Lỗ hổng bảo mật nghiêm trọng |

---

## 📐 Quy Tắc UI/UX (theo `.agent/rules/ui`)

1. **Radical Clarity:** Mỗi màn hình chỉ có 1 hành động chính
2. **Floating Pill UI:** Bottom pill cố định, context menu nổi trên layer
3. **Calm & Premium:** Glassmorphism, không gây nhiễu thị giác
4. **Mobile-first:** Tối ưu cho ngón tay cái, vùng chạm tối thiểu 44×44px
5. **Micro-animation:** Transition ≤ 300ms, feedback ≤ 100ms
6. **Antigravity 10s Rule:** Người dùng hiểu giao diện trong 3 giây, thực hiện thao tác trong 10 giây

---

## ✅ Checklist Trước Khi Deploy

```
□ npm run build — không có lỗi TypeScript/ESLint
□ Tính năng test trên Chrome Desktop
□ Tính năng test trên Safari iPad (nếu liên quan touch)
□ Copy/Cut tạo layer có nội dung (không trắng)
□ Pinch zoom hoạt động trên iPad
□ Scroll trang hoạt động trong Pan mode
□ Export PDF tạo file đúng nội dung
□ Commit lên GitHub với message mô tả rõ ràng
```

---

## 📍 Thông Tin Triển Khai

| Môi trường | URL |
|---|---|
| Production (Vercel) | https://app-eight-chi-75.vercel.app |
| Source (GitHub) | https://github.com/labatvii19/xu_ly_pdf |
| Local dev | `npm run dev` trong `app/` |
