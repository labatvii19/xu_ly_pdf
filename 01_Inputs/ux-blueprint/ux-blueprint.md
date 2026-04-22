# UX Blueprint — PDF Toolkit
> Phiên bản: 1.0 | Ngày: 2026-04-22 | Trạng thái: LOCKED ✅
> **ĐÂY LÀ TÀI LIỆU GỐC — AGENT KHÔNG ĐƯỢC SỬA ĐỔI**

---

## 1. Triết Lý Thiết Kế

**Calm & Powerful** — Giao diện phải cảm thấy yên tĩnh, không rối mắt, nhưng cung cấp đủ công cụ chuyên nghiệp khi cần. Người dùng hiểu giao diện trong 3 giây, thực hiện thao tác trong 10 giây.

---

## 2. Design System

```
Màu sắc:
  --primary:    #007AFF   (Apple Blue)
  --surface:    rgba(255,255,255,0.85) (Glassmorphism)
  --bg:         #f5f5f7   (Apple Grey)
  --text:       #1d1d1f
  --text-muted: #6e6e73
  --red-text:   #FF3B30   (iOS Red)
  --border:     rgba(0,0,0,0.08)

Typography:
  Font: -apple-system, BlinkMacSystemFont, 'SF Pro Display'
  Scale: 12 / 13 / 15 / 17 / 22px

Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px

Touch targets: tối thiểu 44×44px (Apple HIG)

Animation: transition ≤ 300ms, feedback ≤ 100ms
```

---

## 3. Layout Pattern: Floating Pill UI

Mỗi module PDF dùng layout chuẩn:

```
┌─────────────────────────────────┐
│  [Header: Tên file + Nav trang] │  ← Fixed top, mỏng
├─────────────────────────────────┤
│                                 │
│     [Vùng làm việc chính]       │  ← Scrollable
│     PDF / Upload zone / etc.    │
│                                 │
└─────────────────────────────────┘
         [Bottom Pill]              ← Fixed bottom, glassmorphism
         Toolbar chính của module
```

**Bottom Pill:** Chứa tool chính, luôn visible. Không quá 6 button.
**Context Menu:** Nổi lên khi chọn element, tự biến mất khi xong.
**Panel phụ (Layer/Clip Bin):** Trượt từ bên phải, overlay.

---

## 4. Navigation (Phase 2+)

```
Dashboard (/)
  ├── Tile "Edit PDF"    → /edit
  ├── Tile "Split PDF"   → /split
  ├── Tile "Merge PDF"   → /merge
  └── Tile "Convert"     → /convert

Header (global):
  Logo | Tool name | [Account avatar]
```

Mỗi tile trên Dashboard:
- Icon lớn
- Tên công cụ
- 1 dòng mô tả ngắn
- Hover/tap: highlight + scale animation

---

## 5. Module Edit PDF — UI Details

### Bottom Pill (hiện tại):
```
[🤚 Pan] [⬜ Select] [🗂 Layers] [💼 Clip Bin] [🗑 Delete?]
```

### Context Menu (khi có vùng chọn):
```
[Copy] [Cut] [✕]
```

### Layer Control Menu (khi chọn layer):
```
[🔒 Lock] | [↑ Top] [↓ Bottom] | [🔍+ Lớn] [🔍- Nhỏ]
```

### Tính năng cần bổ sung (Phase 1):
- **Undo/Redo:** Nút trong header hoặc bottom pill (`↩ ↪`)
- **Eraser:** Nút trong bottom pill, vẽ tay xóa vùng trên layer
- **Paint/Brush:** Nút brush, chọn màu, phủ lên vùng nối layer

---

## 6. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 768px) | Bottom pill full width, panels overlay chiếm 80% màn hình |
| Tablet (768-1024px) | Bottom pill + side panel có thể dock bên phải |
| Desktop (> 1024px) | Sidebar fixed trái cho toolbox, work area chiếm giữa |

---

## 7. Anti-patterns Không Được Làm

- ❌ Modal popup xác nhận cho mọi hành động nhỏ  
- ❌ Toolbar quá nhiều button (> 6 trên mobile pill)
- ❌ Màu sắc loè loẹt, nhiều gradient
- ❌ Chữ quá nhỏ (< 12px)
- ❌ Vùng chạm < 44×44px
- ❌ Animation > 300ms
