import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPdf, renderPageToCanvas } from './services/pdfService';
import { exportPdf } from './services/exportService';
import {
  Hand, Square, Download, Trash2, Layers, Pencil, Eraser,
  Copy, Scissors, ChevronLeft, ChevronRight, X, FolderOpen, Briefcase, ZoomIn, ZoomOut, ArrowUpToLine, ArrowDownToLine, Lock, Unlock, Undo2, Redo2, Sparkles, Type,
  Pipette, Palette, Plus, Minus, LogOut, ShieldAlert, LogIn
} from 'lucide-react';
import './index.css';
import { supabase } from './services/supabaseClient';

const LoginGate = ({ onLogin }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === 'plpl12345') {
      onLogin('user');
    } else if (passcode === 'admin999') {
      onLogin('admin');
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
      <form onSubmit={handleSubmit} className={`glass-panel ${error ? 'shake' : ''}`} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '300px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>PDF Patcher</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Vui lòng nhập mã truy cập để tiếp tục</p>
        <input 
          type="password" 
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Nhập mã..."
          autoFocus
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', background: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: '16px', fontWeight: 600, letterSpacing: '2px' }}
        />
        {error && <span style={{ color: 'var(--red-text)', fontSize: '12px' }}>Mã không hợp lệ</span>}
        <button type="submit" className="action-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px' }}>Xác nhận</button>
      </form>
    </div>
  );
};

const AdminDashboard = ({ onLogout }) => {
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={24} style={{ color: 'var(--primary-color)' }}/>
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Admin Dashboard</h1>
        </div>
        <button className="action-btn" onClick={onLogout} style={{ background: 'var(--bg-panel)' }}>
          <LogOut size={16}/> Thoát
        </button>
      </div>
      <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <p>Bảng thống kê truy cập sẽ hiển thị ở đây (Giai đoạn 2).</p>
      </div>
    </div>
  );
};


// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientXY(e) {
  if (e.touches?.length)        return { x: e.touches[0].clientX,        y: e.touches[0].clientY };
  if (e.changedTouches?.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function getPinchDist(e) {
  if (e.touches?.length >= 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }
  return null;
}

function toPdfCoords(e, canvas, vp, zoom) {
  const r   = canvas.getBoundingClientRect();
  const { x: cx, y: cy } = getClientXY(e);
  // When using CSS scale, the bounding rect size is (base * zoom).
  // We divide by zoom to get back to 1.0x PDF points.
  return {
    x: (cx - r.left) / zoom,
    y: (cy - r.top)  / zoom,
  };
}

function rgb2hex(rgb) {
  if (!rgb || !rgb.startsWith('rgb')) return rgb;
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';
  const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


// ────────────────────────────────────────────────────────────────────────────
export default function App() {
  // PDF
  const [pdfFile, setPdfFile]   = useState(null);
  const [pdfDoc,  setPdfDoc]    = useState(null);
  const [pageNum, setPageNum]   = useState(1);
  const [numPages, setNumPages] = useState(0);

  // UI
  const [mode,          setMode]          = useState('pan');
  const [layerPanelOpen,setLayerPanelOpen]= useState(false);
  const [clipBinOpen,   setClipBinOpen]   = useState(false);
  const [clipBin,       setClipBin]       = useState([]);
  const [contextMenu,   setContextMenu]   = useState(null); // {x,y} viewport-fixed
  const [selRect,       setSelRect]       = useState(null); // {x,y,w,h} canvas coords
  const [selectedId,    setSelectedId]    = useState(null);
  const [renderId,      setRenderId]      = useState(0);   // bump to force re-render of SVG layers
  const [historyStamp,  setHistoryStamp]  = useState(0);    // force re-render for undo/redo buttons
  const [zoom,          setZoom]          = useState(1.0);  // zoom level
  const [brushSize,     setBrushSize]     = useState(5);
  const [brushColor,    setBrushColor]    = useState('#000000');
  
  // Auth State
  const [authStatus, setAuthStatus] = useState('locked'); // 'locked', 'user', 'admin'

  const zoomRef         = useRef(1.0);

  // Refs
  const bgCanvasRef  = useRef(null);
  const ovCanvasRef  = useRef(null); // managed by callback ref below
  const vpRef        = useRef({ w: 0, h: 0 });
  const modeRef      = useRef('pan');
  const layersRef    = useRef([]);
  const pageStore    = useRef({});
  const marqueeRef   = useRef(null); // drawing state
  const dragRef      = useRef(null); // drag state
  const pinchRef     = useRef({ initialDist: null, initialZoom: null });
  const rafRef       = useRef(null);
  const activeStrokeRef = useRef(null); // { points: [], color, size }
  const historyRef   = useRef([]); // Array of snapshots
  const historyIndexRef = useRef(-1);
  // Stable refs for event handlers — fixes stale closure bug
  const handleDownRef = useRef(null);
  const handleMoveRef = useRef(null);
  const handleUpRef   = useRef(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Global listener for pointerup to ensure drag cleanup
  useEffect(() => {
    const handleGlobalUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setRenderId(Date.now());
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, []);

  // (Google Auth block removed in favor of simple passcode gate)

  // ── Redraw overlay canvas (marquee box) ──
  const drawOverlay = useCallback(() => {
    const oc = ovCanvasRef.current;
    if (!oc || !vpRef.current.w) return;
    const ctx = oc.getContext('2d');
    
    // Đồng bộ hệ tọa độ vẽ (Canvas 2.5x) với hệ tọa độ PDF (1.0x)
    const scale = oc.width / vpRef.current.w;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    
    ctx.clearRect(0, 0, vpRef.current.w, vpRef.current.h);
    const m = marqueeRef.current;
    if (m && m.w > 0 && m.h > 0) {
      ctx.fillStyle   = 'rgba(0, 122, 255, 0.1)';
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth   = 2.5 / scale; // Giữ độ dày viền không đổi khi zoom
      ctx.setLineDash([7 / scale, 4 / scale]);
      ctx.beginPath();
      ctx.rect(m.x, m.y, m.w, m.h);
      ctx.fill();
      ctx.stroke();
    }
  }, []);

  // ── History Logic ──
  const saveHistory = useCallback(() => {
    // Deep clone current layers (layers contain primitive values and string URLs)
    const snapshot = layersRef.current.map(l => ({ ...l }));
    
    // Truncate forward history if we were in the middle of a stack
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(snapshot);
    
    // Limit to 30 steps
    if (newHistory.length > 30) newHistory.shift();
    
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    // Persist to page store immediately to prevent sync issues
    pageStore.current[pageNum - 1] = snapshot;
    
    setHistoryStamp(Date.now());
  }, [pageNum]);

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    layersRef.current = historyRef.current[historyIndexRef.current].map(l => ({ ...l }));
    setRenderId(v => v + 1);
    setHistoryStamp(Date.now());
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    layersRef.current = historyRef.current[historyIndexRef.current].map(l => ({ ...l }));
    setRenderId(v => v + 1);
    setHistoryStamp(Date.now());
  };

  // ── Pointer handlers (all use refs, ZERO setState during move) ──
  const handleDown = useCallback((e) => {
    const numTouches = e.touches ? e.touches.length : 0;
    if (numTouches >= 2) {
      e.preventDefault();
      const dist = getPinchDist(e);
      if (dist) {
        pinchRef.current = { initialDist: dist, initialZoom: zoomRef.current };
      }
      return;
    }
    const curMode = modeRef.current;
    const canvas  = bgCanvasRef.current;
    if (!canvas) return;

    if (curMode === 'marquee') {
      e.preventDefault();
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      const m = marqueeRef.current;
      
      // Hit test existing marquee
      if (m && m.w > 0 && m.h > 0 && pos.x >= m.x && pos.x <= m.x + m.w && pos.y >= m.y && pos.y <= m.y + m.h) {
        dragRef.current = { type: 'marquee', offsetX: pos.x - m.x, offsetY: pos.y - m.y };
        setContextMenu(null);
        return;
      }

      // Draw new marquee
      marqueeRef.current = { x: pos.x, y: pos.y, w: 0, h: 0, x0: pos.x, y0: pos.y, isDrawing: true };
      setContextMenu(null);
      setSelRect(null);
    } else if (curMode === 'text') {
      e.preventDefault();
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      const newLayer = {
        id: Date.now(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'Nhập để sửa...',
        fontSize: 20,
        color: brushColor || '#333333', // Ưu tiên dùng màu vừa lấy được
        opacity: 0.75, // Mặc định ở mức giữa cho thật giấy
        blur: 0.5,    // Mặc định hơi nhòe nhẹ cho giống mực in
        bold: false,
        locked: false
      };
      layersRef.current = [...layersRef.current, newLayer];
      setSelectedId(newLayer.id);
      saveHistory();
      setRenderId(v => v + 1);
      setMode('pan');
    } else if (curMode === 'pencil') {
      e.preventDefault();
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      activeStrokeRef.current = { points: [pos], color: brushColor, size: brushSize };
    } else if (curMode === 'pan') {
      // Pan mode: check if hitting a layer
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      const hit = [...layersRef.current].reverse().find(l => {
        if (l.locked) return false;
        const margin = 10; // Easy hit
        if (l.type === 'image' || l.type === 'mask') {
          return pos.x >= l.x && pos.x <= l.x + l.w &&
                 pos.y >= l.y && pos.y <= l.y + l.h;
        }
        if (l.type === 'text') {
          // Approximate hit area for text
          const tw = (l.text.length * l.fontSize) * 0.6;
          const th = l.fontSize;
          return pos.x >= l.x && pos.x <= l.x + tw &&
                 pos.y >= l.y - th && pos.y <= l.y;
        }
        return false;
      });
      if (hit) {
        e.preventDefault();
        const r    = canvas.getBoundingClientRect();
        const { x: cx, y: cy } = getClientXY(e);
        setSelectedId(hit.id); // Select it while dragging
        dragRef.current = {
          id: hit.id,
          startCX: cx, startCY: cy,
          startLX: hit.x, startLY: hit.y,
          scaleX: 1 / zoomRef.current,
          scaleY: 1 / zoomRef.current,
          hasMoved: false,
        };
      } else {
        // If no layer hit in pan mode: deselect current layer
        setSelectedId(null);
        // do NOT call preventDefault → touch event propagates to parent scroll container naturally
      }
    } else if (curMode === 'eraser') {
      e.preventDefault();
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      const margin = Math.max(40, brushSize * 3);
      
      const remainingLayers = layersRef.current.filter(l => {
        let hit = false;
        if (l.type === 'image' || l.type === 'mask') {
          hit = pos.x >= l.x - margin && pos.x <= l.x + l.w + margin && 
                pos.y >= l.y - margin && pos.y <= l.y + l.h + margin;
        } else if (l.type === 'stroke') {
          hit = l.points.some(p => Math.sqrt(Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2)) < (brushSize + 30));
        }
        return !hit;
      });

      const erasedAnything = remainingLayers.length !== layersRef.current.length;
      
      activeStrokeRef.current = { 
        isEraser: true, 
        erased: erasedAnything, 
        points: [pos], 
        size: Math.max(30, brushSize * 2) 
      };

      if (erasedAnything) {
        layersRef.current = remainingLayers;
        saveHistory(); // Save immediately if deleted something
      }
      setRenderId(v => v + 1);
    }
  }, [brushColor, brushSize, saveHistory, setRenderId]);

  const handleMove = useCallback((e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const dist = getPinchDist(e);
      const { initialDist, initialZoom } = pinchRef.current;
      if (dist && initialDist && initialZoom) {
        let newZoom = initialZoom * (dist / initialDist);
        newZoom = Math.max(0.2, Math.min(newZoom, 15)); // mở rộng giới hạn zoom
        setZoom(newZoom);
      }
      return;
    }
    if (modeRef.current === 'marquee') {
      e.preventDefault();
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      
      if (dragRef.current && dragRef.current.type === 'marquee') {
        const m = marqueeRef.current;
        m.x = pos.x - dragRef.current.offsetX;
        m.y = pos.y - dragRef.current.offsetY;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => { drawOverlay(); rafRef.current = null; });
        }
        return;
      }

      if (marqueeRef.current && marqueeRef.current.isDrawing) {
        const m   = marqueeRef.current;
        m.x = Math.min(pos.x, m.x0);
        m.y = Math.min(pos.y, m.y0);
        m.w = Math.abs(pos.x - m.x0);
        m.h = Math.abs(pos.y - m.y0);
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => { drawOverlay(); rafRef.current = null; });
        }
      }
      return;
    }

    if (modeRef.current === 'pencil' && activeStrokeRef.current) {
      e.preventDefault();
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      const pts = activeStrokeRef.current.points;
      const last = pts[pts.length - 1];
      const dist = Math.sqrt(Math.pow(pos.x - last.x, 2) + Math.pow(pos.y - last.y, 2));
      if (dist > 2) {
        pts.push(pos);
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => { setRenderId(v => v + 1); rafRef.current = null; });
        }
      }
      return;
    }

    if (modeRef.current === 'eraser' && activeStrokeRef.current?.isEraser) {
      e.preventDefault();
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const pos = toPdfCoords(e, canvas, vpRef.current, zoomRef.current);
      activeStrokeRef.current.points = [pos];
      
      const margin = Math.max(40, brushSize * 3);
      const remainingLayers = layersRef.current.filter(l => {
        let hit = false;
        if (l.type === 'image' || l.type === 'mask') {
          hit = pos.x >= l.x - margin && pos.x <= l.x + l.w + margin && 
                pos.y >= l.y - margin && pos.y <= l.y + l.h + margin;
        } else if (l.type === 'stroke') {
          hit = l.points.some(p => Math.sqrt(Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2)) < (brushSize + 30));
        }
        return !hit;
      });
      
      if (remainingLayers.length !== layersRef.current.length) {
        layersRef.current = remainingLayers;
        activeStrokeRef.current.erased = true;
        // Throttled render for smoother visual on mobile
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setRenderId(v => v + 1);
            rafRef.current = null;
          });
        }
      } else {
        // Still need to update circle position even if nothing hit
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setRenderId(v => v + 1);
            rafRef.current = null;
          });
        }
      }
      return;
    }
    // Pan mode: chỉ prevent default khi đang kéo layer
    // Nếu không đang drag → buông tay để scroll container chạy bình thường
    if (dragRef.current) {
      e.preventDefault();
      const d   = dragRef.current;
      const { x: cx, y: cy } = getClientXY(e);
      const dx  = (cx - d.startCX) * d.scaleX;
      const dy  = (cy - d.startCY) * d.scaleY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        d.hasMoved = true;
        const lyr = layersRef.current.find(l => l.id === d.id);
        if (lyr) { lyr.x = d.startLX + dx; lyr.y = d.startLY + dy; }
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setRenderId(v => v + 1);
            rafRef.current = null;
          });
        }
      }
    }
    // Không có dragRef → không preventDefault, scroll tự hoạt động
  }, [brushSize, saveHistory, drawOverlay, setRenderId]);

  const handleUp = useCallback((e) => {
    if (!e.touches || e.touches.length < 2) {
      pinchRef.current = { initialDist: null, initialZoom: null };
    }
    if (modeRef.current === 'marquee') {
      if (dragRef.current && dragRef.current.type === 'marquee') {
        dragRef.current = null;
      } else if (!marqueeRef.current) {
        dragRef.current = null;
        return;
      }
      
      if (marqueeRef.current) {
        marqueeRef.current.isDrawing = false;
      }
      dragRef.current = null; // Always clear drag on up for marquee
      e.preventDefault();
      const m = marqueeRef.current;
      if (m.w > 1 || m.h > 1) {
        // Snap coords
        const finalRect = { x: m.x, y: m.y, w: m.w, h: m.h };
        setSelRect(finalRect);
        // Position context menu in FIXED viewport coords
        const canvas = bgCanvasRef.current;
        const r      = canvas.getBoundingClientRect();
        // Since we use CSS transform scale, 1 pixel in screen = 1/zoom units in base coordinates
        const invZoom = 1 / zoomRef.current;
        // Giới hạn để menu luôn nằm trong màn hình (ít nhất cách lề 140px để không mất chữ Copy)
        const menuX = r.left + (m.x + m.w / 2) * zoomRef.current;
        const safeX = Math.max(140, Math.min(window.innerWidth - 140, menuX));
        
        setContextMenu({
          x: safeX,
          y: r.top  + (m.y + m.h) * zoomRef.current + 14,
        });
      } else {
        marqueeRef.current = null;
        drawOverlay();
        setSelRect(null);
      }
      return;
    }

    if (modeRef.current === 'pencil' && activeStrokeRef.current) {
      e.preventDefault();
      const s = activeStrokeRef.current;
      if (s.points && s.points.length > 1) {
        const newLayer = {
          id: Date.now(),
          type: 'stroke',
          color: s.color,
          width: s.size,
          points: s.points
        };
        layersRef.current = [...layersRef.current, newLayer];
        saveHistory();
        setRenderId(v => v + 1);
      }
    }
    
    if (modeRef.current === 'eraser' && activeStrokeRef.current?.erased) {
      saveHistory();
    }

    activeStrokeRef.current = null;

    // Only mark layer as selected if it was a tap (no movement)
    if (dragRef.current && !dragRef.current.hasMoved) {
      setSelectedId(dragRef.current.id);
    }

    if (dragRef.current && dragRef.current.hasMoved) {
      saveHistory();
    }
    dragRef.current = null;
  }, [saveHistory, drawOverlay]);

  // Safari Gesture API (iPad/iPhone specific - extremely smooth)
  const handleGestureStart = useCallback((e) => {
    e.preventDefault();
    pinchRef.current = { initialDist: 1, initialZoom: zoomRef.current };
  }, []);

  const handleGestureChange = useCallback((e) => {
    e.preventDefault();
    if (pinchRef.current.initialZoom) {
      let newZoom = pinchRef.current.initialZoom * e.scale;
      newZoom = Math.max(0.2, Math.min(newZoom, 15));
      setZoom(newZoom);
    }
  }, []);

  // Keep handler refs always pointing to latest version
  useEffect(() => { handleDownRef.current = handleDown; }, [handleDown]);
  useEffect(() => { handleMoveRef.current = handleMove; }, [handleMove]);
  useEffect(() => { handleUpRef.current   = handleUp;   }, [handleUp]);

  // ── Callback ref: attaches events the moment canvas mounts ──
  // Uses STABLE wrapper functions → no stale closure bug
  const stableDown  = useCallback((e) => handleDownRef.current?.(e), []);
  const stableMove  = useCallback((e) => handleMoveRef.current?.(e), []);
  const stableUp    = useCallback((e) => handleUpRef.current?.(e),   []);

  const ovCallbackRef = useCallback((node) => {
    if (ovCanvasRef.current) {
      ovCanvasRef.current.removeEventListener('mousedown',  stableDown);
      ovCanvasRef.current.removeEventListener('mousemove',  stableMove);
      ovCanvasRef.current.removeEventListener('mouseup',    stableUp);
      ovCanvasRef.current.removeEventListener('touchstart', stableDown);
      ovCanvasRef.current.removeEventListener('touchmove',  stableMove);
      ovCanvasRef.current.removeEventListener('touchend',   stableUp);
      ovCanvasRef.current.removeEventListener('gesturestart',  handleGestureStart);
      ovCanvasRef.current.removeEventListener('gesturechange', handleGestureChange);
      ovCanvasRef.current.removeEventListener('gestureend',    stableUp);
    }
    ovCanvasRef.current = node;
    if (!node) return;
    node.addEventListener('mousedown',  stableDown, { passive: false });
    node.addEventListener('mousemove',  stableMove, { passive: false });
    node.addEventListener('mouseup',    stableUp,   { passive: false });
    node.addEventListener('touchstart', stableDown, { passive: false });
    node.addEventListener('touchmove',  stableMove, { passive: false });
    node.addEventListener('touchend',   stableUp,   { passive: false });
    node.addEventListener('gesturestart',  handleGestureStart, { passive: false });
    node.addEventListener('gesturechange', handleGestureChange,{ passive: false });
    node.addEventListener('gestureend',    stableUp,           { passive: false });
  }, [stableDown, stableMove, stableUp, handleGestureStart, handleGestureChange]);

  // ── PDF rendering ──
  // ── PDF rendering ──
  const renderPage = useCallback(async (pNum) => {
    if (!pdfDoc || !bgCanvasRef.current) return;
    const page      = await pdfDoc.getPage(pNum);
    const baseVp    = page.getViewport({ scale: 1.0 });
    const renderVp  = await renderPageToCanvas(page, bgCanvasRef.current, 2.5);
    vpRef.current   = { w: baseVp.width, h: baseVp.height };
    const oc = ovCanvasRef.current;
    if (oc) { oc.width = renderVp.width; oc.height = renderVp.height; }
    layersRef.current = [...(pageStore.current[pNum - 1] || [])];
    marqueeRef.current = null;
    setSelectedId(null);
    setSelRect(null);
    setContextMenu(null);
    // Reset history for the new page or start with current state
    historyRef.current = [[...layersRef.current]];
    historyIndexRef.current = 0;
    setHistoryStamp(Date.now());
    setRenderId(v => v + 1);
  }, [pdfDoc]);

  useEffect(() => { renderPage(pageNum); }, [pageNum, renderPage]);

  // ── File upload ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const doc = await loadPdf(file);
    setPdfFile(file);
    setPdfDoc(doc);
    setNumPages(doc.numPages);
    setPageNum(1);
    setPageNum(1);
    layersRef.current = [];
    pageStore.current = {};
    historyRef.current = [[]];
    historyIndexRef.current = 0;
    setHistoryStamp(Date.now());
    setRenderId(v => v + 1);
  };

  // ── Page nav ──
  const switchPage = (n) => {
    pageStore.current[pageNum - 1] = [...layersRef.current];
    marqueeRef.current = null;
    setSelRect(null);
    setContextMenu(null);
    setPageNum(n);
  };

  // ── Cut / Copy ──
  const executeCutCopy = (action) => {
    if (!selRect || !bgCanvasRef.current) return;
    const srcCanvas = bgCanvasRef.current;

    const scaleFactorX = srcCanvas.width  / vpRef.current.w;
    const scaleFactorY = srcCanvas.height / vpRef.current.h;

    const x0 = Math.max(0, Math.floor(selRect.x * scaleFactorX));
    const y0 = Math.max(0, Math.floor(selRect.y * scaleFactorY));
    const x1 = Math.min(srcCanvas.width,  Math.ceil((selRect.x + selRect.w) * scaleFactorX));
    const y1 = Math.min(srcCanvas.height, Math.ceil((selRect.y + selRect.h) * scaleFactorY));
    const w  = x1 - x0;
    const h  = y1 - y0;
    if (w < 1 || h < 1) return;

    const pixelData = srcCanvas.getContext('2d').getImageData(x0, y0, w, h);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(pixelData, 0, 0);

    const savedAction = action;
    const savedLX = selRect.x;
    const savedLY = selRect.y;
    const savedLW = selRect.w;
    const savedLH = selRect.h;
    
    marqueeRef.current = null;
    const oc = ovCanvasRef.current;
    if (oc) oc.getContext('2d').clearRect(0, 0, oc.width, oc.height);
    setSelRect(null);
    setContextMenu(null);
    setSelectedId(null);
    setMode('pan');

      tmp.toBlob((blob) => {
        if (!blob) return;
        const imgUrl = URL.createObjectURL(blob);
        const newImg = { id: Date.now(), type: 'image', x: savedLX, y: savedLY, w: savedLW, h: savedLH, dataUrl: imgUrl };

        if (savedAction === 'cut') {
          const maskLayer = { id: Date.now() + 1, type: 'mask', x: savedLX, y: savedLY, w: savedLW, h: savedLH, color: '#ffffff', locked: true };
          layersRef.current = [...layersRef.current, maskLayer, newImg];
        } else {
          layersRef.current = [...layersRef.current, newImg];
        }
        
        setSelectedId(newImg.id); // Tự động chọn layer vừa tạo để hiện viền
        const clipboardItem = { id: Date.now() + 2, w: savedLW, h: savedLH, dataUrl: imgUrl };
        setClipBin(prev => [...prev, clipboardItem]);
        saveHistory();
        setRenderId(v => v + 1);
      }, 'image/png');
  };

  const executeMask = () => {
    if (!selRect || !bgCanvasRef.current) return;
    const srcCanvas = bgCanvasRef.current;
    
    // Thuật toán "Mắt thần": Lấy màu giấy thực tế của PDF
    const scaleFactorX = srcCanvas.width  / vpRef.current.w;
    const scaleFactorY = srcCanvas.height / vpRef.current.h;
    const x = Math.max(0, Math.floor(selRect.x * scaleFactorX));
    const y = Math.max(0, Math.floor(selRect.y * scaleFactorY));
    const w = Math.max(1, Math.floor(selRect.w * scaleFactorX));
    const h = Math.max(1, Math.floor(selRect.h * scaleFactorY));

    let fillColor = '#ffffff';
    try {
      const gctx = srcCanvas.getContext('2d', { willReadFrequently: true });
      const data = gctx.getImageData(x, y, w, h).data;
      
      const counts = {};
      let maxCount = 0;
      let bestColor = [255, 255, 255];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Chỉ xét các vùng rất sáng (giấy nền)
        if (r + g + b > 600) {
          // Làm tròn màu để gom nhóm (mọi cụm 5 đơn vị màu coi là 1)
          const key = `${Math.floor(r/5)*5},${Math.floor(g/5)*5},${Math.floor(b/5)*5}`;
          counts[key] = (counts[key] || 0) + 1;
          if (counts[key] > maxCount) {
            maxCount = counts[key];
            bestColor = [r, g, b];
          }
        }
      }
      fillColor = `rgb(${bestColor[0]},${bestColor[1]},${bestColor[2]})`;
    } catch (err) { console.error("SmartColor error:", err); }

    const maskLayer = { 
      id: Date.now(), 
      type: 'mask',
      x: selRect.x,
      y: selRect.y,
      w: selRect.w,
      h: selRect.h,
      color: fillColor,
      locked: true 
    };

    // Smart Text Color Auto-detection
    let textCol = '#000000';
    try {
      const gctx = srcCanvas.getContext('2d', { willReadFrequently: true });
      const data = gctx.getImageData(x, y, w, h).data;
      let minB = 765, bestC = [0,0,0];
      for (let i=0; i<data.length; i+=4) {
        const b = data[i]+data[i+1]+data[i+2];
        if (b < minB && b > 20) { // Avoid pure black noise, find real ink
          minB = b; bestC = [data[i], data[i+1], data[i+2]];
        }
      }
      textCol = `rgb(${bestC[0]},${bestC[1]},${bestC[2]})`;
      setBrushColor(textCol); // Tự động ghi nhớ màu mực chữ vừa vá
    } catch(e){}
    maskLayer.detectedTextColor = textCol;
    
    layersRef.current = [...layersRef.current, maskLayer];
    marqueeRef.current = null;
    const oc = ovCanvasRef.current;
    if (oc) oc.getContext('2d').clearRect(0, 0, oc.width, oc.height);
    setSelRect(null);
    setContextMenu(null);
    saveHistory();
    setRenderId(v => v + 1);
  };

  const updateLayer = (id, props) => {
    layersRef.current = layersRef.current.map(l => l.id === id ? { ...l, ...props } : l);
    // Force immediate re-render
    setRenderId(Date.now());
    saveHistory();
  };

  const deleteLayer = (id) => {
    layersRef.current = layersRef.current.filter(l => l.id !== id);
    if (selectedId === id) setSelectedId(null);
    saveHistory();
    setRenderId(v => v + 1);
  };

  const toggleLock = (id) => {
    const l = layersRef.current.find(x => x.id === id);
    if (!l) return;
    l.locked = !l.locked;
    if (l.locked && selectedId === id) setSelectedId(null);
    saveHistory();
    setRenderId(v => v + 1);
  };

  const arrangeLayer = (id, direction) => {
    const list = layersRef.current;
    const idx = list.findIndex(l => l.id === id);
    if (idx === -1) return;
    const newList = [...list];
    const [item] = newList.splice(idx, 1);
    if (direction === 'up') newList.push(item);
    else newList.unshift(item);
    layersRef.current = newList;
    saveHistory();
    setRenderId(v => v + 1);
  };

  const scaleLayer = (id, factor) => {
    const l = layersRef.current.find(x => x.id === id);
    if (!l || l.type !== 'image') return;
    const nw = l.w * factor;
    const nh = l.h * factor;
    const nx = l.x - (nw - l.w) / 2;
    const ny = l.y - (nh - l.h) / 2;
    l.w = nw; l.h = nh; l.x = nx; l.y = ny;
    saveHistory();
    setRenderId(v => v + 1);
  };

  const handlePaste = (item) => {
    const vpw = vpRef.current ? vpRef.current.w : 500;
    const vph = vpRef.current ? vpRef.current.h : 700;
    const cx = Math.max(0, (vpw - item.w) / 2);
    const cy = Math.max(0, (vph - item.h) / 2);
    const newLayer = {
      id: Date.now(), type: 'image',
      x: cx, y: cy, w: item.w, h: item.h,
      dataUrl: item.dataUrl
    };
    layersRef.current = [...layersRef.current, newLayer];
    setSelectedId(newLayer.id);
    setMode('pan');
    setClipBinOpen(false);
    saveHistory();
    setRenderId(v => v + 1);
  };

  // ── Export ──
  const handleExport = async () => {
    if (!pdfFile) return;
    pageStore.current[pageNum - 1] = [...layersRef.current];
    const allData = {};
    Object.entries(pageStore.current).forEach(([idx, layers]) => {
      allData[idx] = {
        objects: layers.map(l => ({
          type: l.type,
          left: l.x, top: l.y, width: l.w, height: l.h,
          scaleX: 1, scaleY: 1,
          fill: l.type === 'mask' ? '#ffffff' : 'transparent',
          src: l.dataUrl || null,
          // Bổ sung dữ liệu cho nét vẽ
          points: l.points || null,
          color: l.color || '#000000',
          strokeWidth: l.width || 0,
          font: l.font || 'sans',
          opacity: l.opacity || 0.9,
          bold: l.bold || false
        })),
        viewportWidth:  vpRef.current.w,
        viewportHeight: vpRef.current.h,
      };
    });
    const bytes = await exportPdf(pdfFile, allData);
    const blob  = new Blob([bytes], { type: 'application/pdf' });
    const defaultName = `patched_${pdfFile.name}`;

    // Native OS File Picker (Chrome / Edge / Desktop)
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'Tài liệu PDF',
            accept: { 'application/pdf': ['.pdf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return; // Đã lưu thành công qua cửa sổ hệ thống
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // User Canceled
      console.warn('showSaveFilePicker error, falling back', err);
    }

    // Fallback cho Mobile / Firefox / Safari (Chỉ cho phép đổi tên)
    const link  = document.createElement('a');
    link.href   = URL.createObjectURL(blob);
    const userInput = window.prompt("Lưu file với tên (để trống sẽ dùng mặc định):", defaultName);
    if (userInput === null) return; // Canceled
    
    let finalName = userInput.trim() !== '' ? userInput.trim() : defaultName;
    if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';

    link.download = finalName;
    link.click();
  };

  const imageLayers = layersRef.current.filter(l => l.type === 'image');

  // ── Render ──────────────────────────────────────────────────────────────────
  if (authStatus === 'locked') {
    return <LoginGate onLogin={setAuthStatus} />;
  }

  if (authStatus === 'admin') {
    return <AdminDashboard onLogout={() => setAuthStatus('locked')} />;
  }

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:'var(--bg-color)', position:'relative' }}>

      {/* HEADER (Floating Islands) */}
      <div className="top-islands">
        {pdfFile ? (
          <div className="pill-island glass-panel">
            <button className="icon-btn" onClick={() => switchPage(pageNum-1)} disabled={pageNum<=1}><ChevronLeft size={18}/></button>
            <span style={{ fontSize:'13px', fontWeight:600 }}>{pageNum} / {numPages}</span>
            <button className="icon-btn" onClick={() => switchPage(pageNum+1)} disabled={pageNum>=numPages}><ChevronRight size={18}/></button>
            <div style={{ width:'1px', height:'20px', background:'var(--border-color)', margin:'0 4px' }}/>
            <label className="icon-btn" style={{ cursor:'pointer' }} title="Mở PDF Khác">
               <FolderOpen size={16}/>
               <input type="file" accept="application/pdf" style={{ display:'none' }} onChange={handleFileUpload}/>
            </label>
          </div>
        ) : (
          <div className="pill-island glass-panel" style={{ fontWeight:700, fontSize:'15px' }}>📄 Patcher</div>
        )}
        
        {pdfFile && (
          <button className="action-btn" onClick={handleExport}>
            <Download size={16}/> Lưu
          </button>
        )}
      </div>

      {pdfFile && (
        <div className="zoom-stick glass-panel">
          <ZoomOut size={14} style={{ color: '#666' }} />
          <input 
            type="range" 
            className="zoom-slider"
            min="0.5" max="8" step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <ZoomIn size={14} style={{ color: '#666' }} />
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      {/* SCROLL AREA */}
      <div className="scroll-area" style={{ touchAction: (mode==='marquee' || mode==='pencil' || mode==='eraser') ? 'none' : 'pan-x pan-y' }}>
        {!pdfFile && (
          <div className="upload-screen">
            <div style={{ fontSize:'56px' }}>📄</div>
            <h2 style={{ margin:'12px 0 8px', fontSize:'22px' }}>PDF Patcher</h2>
            <p style={{ color:'var(--text-muted)', marginBottom:'28px', fontSize:'14px' }}>
              Chọn tài liệu PDF từ thiết bị của bạn
            </p>
            <label className="upload-btn">
              Tải File Lên
              <input type="file" accept="application/pdf" style={{ display:'none' }} onChange={handleFileUpload}/>
            </label>
          </div>
        )}

        {pdfFile && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            minWidth: '100%',
            minHeight: '100%',
            padding: '40px',
            boxSizing: 'border-box'
          }}>
            {/* Size-sync container: This DIV has the REAL zoomed dimensions to provide scrollbars */}
            <div style={{
              width: `${vpRef.current.w * zoom}px`,
              height: `${vpRef.current.h * zoom}px`,
              position: 'relative'
            }}>
              {/* Scaling container: This DIV renders the PDF at 1.0x but scaled visually */}
              <div style={{
                position:'absolute', top:0, left:0,
                width: `${vpRef.current.w}px`,
                height: `${vpRef.current.h}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                background: 'white'
              }}>
            {/* PDF base render */}
            <canvas ref={bgCanvasRef} style={{ display:'block', width:'100%', height:'100%' }}/>

            {/* SVG composite layers */}
            <svg
              style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none' }}
              viewBox={`0 0 ${vpRef.current.w} ${vpRef.current.h}`}
              preserveAspectRatio="none"
            >
              {layersRef.current.map(l =>
                l.type === 'mask'
                  ? <rect key={l.id} x={l.x} y={l.y} width={l.w} height={l.h} fill={l.color || 'white'}/>
                  : l.type === 'text'
                  ? <text 
                      key={l.id} 
                      data-layer-id={l.id}
                      x={l.x} y={l.y} 
                      fontSize={l.fontSize} 
                      fill={l.color}
                      opacity={l.opacity || 0.9}
                      fontFamily={l.font === 'serif' ? 'serif' : 'sans-serif'}
                      style={{ 
                        userSelect: 'none', 
                        fontWeight: l.bold ? 'bold' : '500', 
                        filter: `blur(${l.blur || 0.3}px) ${selectedId===l.id ? 'drop-shadow(0 0 4px rgba(0,122,255,0.8))' : ''}`,
                        cursor: 'pointer'
                      }}
                    >
                      {l.text}
                    </text>
                  : l.type === 'image'
? <image key={l.id} href={l.dataUrl} x={l.x} y={l.y} width={l.w} height={l.h}
                      style={{ filter: selectedId===l.id ? 'drop-shadow(0 0 8px rgba(0,122,255,0.7))' : 'none' }}
                    />
                  : <path
                      key={l.id}
                      d={`M ${l.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke={l.color}
                      strokeWidth={l.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
              )}
              {/* Active stroke or Eraser preview */}
              {activeStrokeRef.current && activeStrokeRef.current.points && (
                activeStrokeRef.current.isEraser
                  ? <circle 
                      cx={activeStrokeRef.current.points[0].x} 
                      cy={activeStrokeRef.current.points[0].y} 
                      r={activeStrokeRef.current.size / 2} 
                      fill="rgba(255, 0, 0, 0.3)" 
                      stroke="red" 
                      strokeWidth="1"
                    />
                  : <path
                      d={`M ${activeStrokeRef.current.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke={activeStrokeRef.current.color}
                      strokeWidth={activeStrokeRef.current.size}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
              )}
              {/* Selected layer border */}
              {(() => {
                const l = layersRef.current.find(x => x.id === selectedId && (x.type === 'image' || x.type === 'text' || x.type === 'mask'));
                if (!l) return null;
                
                // Hiển thị khung bao quanh layer đang chọn để dễ nhận diện
                let x = l.x, y = l.y, w = l.w, h = l.h;
                if (l.type === 'text') {
                  const fontSize = l.fontSize || 16;
                  x = l.x - 5;
                  y = l.y - fontSize;
                  w = (l.text.length * fontSize) * 0.6 + 10;
                  h = fontSize + 10;
                }
                return <rect x={x} y={y} width={w} height={h} fill="none" stroke="#007AFF" strokeWidth="2" strokeDasharray="6 3" filter="drop-shadow(0 0 2px white)"/>;
              })()}
            </svg>

            {/* Overlay canvas — receives all touch/mouse events via callback ref */}
            <canvas
              ref={ovCallbackRef}
              style={{
                position:'absolute', top:0, left:0, width:'100%', height:'100%',
                cursor: mode==='marquee' ? 'crosshair' : 'default',
                // Chế độ Pan khi không chọn layer thì cho phép scroll trang tự nhiên
                touchAction: (mode === 'pan' && !selectedId) ? 'pan-x pan-y' : 'none',
              }}
            />

            {/* SELECTED LAYER CONTROLS (ZOOM) */}
            {selectedId && (() => {
              const l = layersRef.current.find(x => x.id === selectedId && x.type === 'image');
              if (!l || !vpRef.current) return null;
              const leftPercent = ((l.x + l.w/2) / vpRef.current.w) * 100;
              const topPercent  = (l.y / vpRef.current.h) * 100;
              return (
                <div className="context-menu glass-panel" style={{
                  position: 'absolute',
                  left: `${leftPercent}%`, 
                  top: `calc(${topPercent}% - 48px)`,
                  // Nghịch đảo tỉ lệ zoom để menu luôn giữ kích thước chuẩn (1.0x)
                  transform: `translateX(-50%) scale(${1 / zoom})`,
                  transformOrigin: 'bottom center',
                  zIndex: 1000
                }}>
                  <button className="ctx-btn" onClick={() => toggleLock(l.id)} title="Chốt chặt"><Lock size={16}/></button>
                  <div style={{ width:'1px', background:'var(--border-color)', margin:'6px 0' }}/>
                  <button className="ctx-btn" onClick={() => arrangeLayer(l.id, 'up')} title="Lên trên"><ArrowUpToLine size={16}/></button>
                  <button className="ctx-btn" onClick={() => arrangeLayer(l.id, 'down')} title="Xuống dưới"><ArrowDownToLine size={16}/></button>
                  <div style={{ width:'1px', background:'var(--border-color)', margin:'6px 0' }}/>
                  <button className="ctx-btn" onClick={() => scaleLayer(l.id, 1.05)} title="Lớn"><ZoomIn size={16}/></button>
                  <button className="ctx-btn" onClick={() => scaleLayer(l.id, 0.95)} title="Nhỏ"><ZoomOut size={16}/></button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    )}
      </div>


      {/* CONTEXT MENU – fixed to viewport so it never drifts */}
      {contextMenu && (
        <div
          className="context-menu glass-panel"
          style={{ position:'fixed', left:contextMenu.x, top:contextMenu.y, transform:'translateX(-50%)', zIndex:1000 }}
        >
          <button className="ctx-btn" onClick={() => executeCutCopy('copy')}><Copy size={15}/> Copy</button>
          <button className="ctx-btn ctx-cut" onClick={() => executeCutCopy('cut')}><Scissors size={15}/> Cut</button>
          <button 
            className="ctx-btn" 
            style={{ color: '#007AFF', fontWeight: 600 }} 
            onClick={executeMask}
          >
            <Sparkles size={15}/> Vá
          </button>
          <button className="ctx-btn" onClick={() => {
            marqueeRef.current=null; setSelRect(null); setContextMenu(null); drawOverlay();
          }}><X size={14}/></button>
        </div>
      )}

      {/* LAYER PANEL */}
      {pdfFile && (
        <div className={`layer-panel glass-panel ${layerPanelOpen ? 'open' : ''}`}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <span style={{ fontWeight:600, fontSize:'13px' }}>Lớp ghép ({imageLayers.length})</span>
            <button onClick={() => setLayerPanelOpen(false)} className="icon-btn" style={{ width:28, height:28 }}><X size={14}/></button>
          </div>
          {imageLayers.length===0 && <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>Chưa có lớp nào.</p>}
          {imageLayers.map((l, i) => (
            <div key={l.id} className="layer-item"
              onClick={() => { if (!l.locked) { setSelectedId(l.id); setLayerPanelOpen(false); } }}
              style={{ background: selectedId===l.id ? 'rgba(0,122,255,0.1)' : 'rgba(0,0,0,0.03)', opacity: l.locked ? 0.6 : 1 }}>
              <img src={l.dataUrl} alt="" style={{ width:36, height:36, objectFit:'cover', borderRadius:'4px', flexShrink:0, border:'1px solid rgba(0,0,0,0.1)' }}/>
              <span style={{ fontSize:13, flex:1, marginLeft:10, fontWeight:500 }}>Lớp {i+1}</span>
              <button onClick={(e)=>{ e.stopPropagation(); toggleLock(l.id); }}
                style={{ background:'none', border:'none', color:'var(--text-color)', cursor:'pointer', padding:'4px', marginRight:'4px' }}>
                {l.locked ? <Lock size={16}/> : <Unlock size={16}/>}
              </button>
              <button onClick={(e)=>{ e.stopPropagation(); deleteLayer(l.id); }}
                style={{ background:'none', border:'none', color:'var(--red-text)', cursor:'pointer', padding:'4px' }}>
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CLIP BIN PANEL */}
      {pdfFile && (
        <div className={`layer-panel glass-panel ${clipBinOpen ? 'open' : ''}`}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <span style={{ fontWeight:600, fontSize:'13px' }}>Khay chứa ({clipBin.length})</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setClipBin([])} className="icon-btn" style={{ width:28, height:28, color:'var(--red-text)' }} title="Xóa sạch"><Trash2 size={14}/></button>
              <button onClick={() => setClipBinOpen(false)} className="icon-btn" style={{ width:28, height:28 }}><X size={14}/></button>
            </div>
          </div>
          {clipBin.length===0 && <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>Mảnh cắt sẽ lưu ở đây.</p>}
          {clipBin.map((item, i) => (
            <div key={item.id} className="layer-item"
              onClick={() => handlePaste(item)}
              style={{ background: 'rgba(0,0,0,0.03)' }}>
              <img src={item.dataUrl} alt="" style={{ width:36, height:36, objectFit:'cover', borderRadius:'4px', flexShrink:0, border:'1px solid rgba(0,0,0,0.1)' }}/>
              <span style={{ fontSize:13, flex:1, marginLeft:10, fontWeight:500 }}>Bản {i+1}</span>
              <button onClick={(e)=>{ e.stopPropagation(); setClipBin(prev => prev.filter(x => x.id !== item.id)); }}
                style={{ background:'none', border:'none', color:'var(--red-text)', cursor:'pointer', padding:'4px' }}>
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BRUSH SETTINGS (SUB-TOOLBAR) */}
      {pdfFile && mode === 'pencil' && (
        <div className="sub-pill glass-panel" style={{
          position: 'fixed', bottom: 'calc(138px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Size</span>
            <input 
              type="range" min="1" max="50" value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{ width: '80px', height: '4px', accentColor: 'var(--primary-color)' }}
            />
            <span style={{ fontSize: '11px', width: '20px' }}>{brushSize}</span>
          </div>
          
          {mode === 'pencil' && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }}/>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#000000', '#ffffff', '#FF3B30', '#007AFF'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setBrushColor(c)}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%', background: c,
                      border: brushColor === c ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
                      boxShadow: brushColor === c ? '0 0 0 2px white' : 'none',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* BOTTOM TOOL PILL */}
      {pdfFile && (
        <div className="bottom-pill glass-panel">
          <button className={`toolbar-btn ${mode==='pan' ? 'active' : ''}`} onClick={() => setMode('pan')}>
            <Hand size={20}/>
          </button>
          <button className={`toolbar-btn ${mode==='marquee' ? 'active' : ''}`} onClick={() => setMode('marquee')}>
            <Square size={20}/>
          </button>
          {/* Pencil, Eraser & Text tạm ẩn — uncomment để bật lại
          <button className={`toolbar-btn ${mode==='pencil' ? 'active' : ''}`} onClick={() => setMode('pencil')}>
            <Pencil size={20}/>
          </button>
          <button className={`toolbar-btn ${mode==='eraser' ? 'active' : ''}`} onClick={() => setMode('eraser')}>
            <Eraser size={20}/>
          </button>
          <button className={`toolbar-btn ${mode==='text' ? 'active' : ''}`} onClick={() => setMode('text')}>
            <Type size={20}/>
          </button>
          */}
          <button className="toolbar-btn" onClick={() => { setClipBinOpen(false); setLayerPanelOpen(p => !p); }}>
            <Layers size={20}/>
          </button>
          <button className={`toolbar-btn ${clipBinOpen ? 'active' : ''}`} onClick={() => { setLayerPanelOpen(false); setClipBinOpen(p => !p); }}>
            <Briefcase size={20}/>
          </button>
          {selectedId && (
            <button className="toolbar-btn" onClick={() => deleteLayer(selectedId)} style={{ color:'var(--red-text)' }}>
              <Trash2 size={20}/>
            </button>
          )}
          <div style={{ width:'1px', height:'24px', background:'var(--border-color)', margin:'0 4px' }}/>
          <button 
            className="toolbar-btn" 
            onClick={undo} 
            disabled={historyIndexRef.current <= 0}
            style={{ opacity: historyIndexRef.current <= 0 ? 0.3 : 1 }}
          >
            <Undo2 size={20}/>
          </button>
          <button 
            className="toolbar-btn" 
            onClick={redo} 
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            style={{ opacity: historyIndexRef.current >= historyRef.current.length - 1 ? 0.3 : 1 }}
          >
            <Redo2 size={20}/>
          </button>
        </div>
      )}
      {/* TEXT EDITOR FLOATING PILL - MOVED TO ROOT FOR ROBUSTNESS */}
      {(() => {
        const l = layersRef.current.find(x => x.id === selectedId && x.type === 'text');
        if (!l) return null;
        
        const canvasRect = bgCanvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return null;
        
        const top  = canvasRect.top  + (l.y * zoom);
        const left = canvasRect.left + (l.x * zoom);

        return (
          <div 
            className="glass-panel text-editor-pill"
            onPointerDown={(e) => e.stopPropagation()} 
            style={{ 
              position:'fixed', top: top - 50, left, 
              zIndex: 3000, display: 'flex', gap: '4px', padding: '6px 12px',
              transform: 'translateX(-20%)',
              pointerEvents: 'auto'
            }}
          >
            <input 
              type="text" 
              value={l.text}
              autoFocus
              onChange={(e) => updateLayer(l.id, { text: e.target.value })}
              style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', padding: '4px 8px', width: '130px', outline: 'none', fontSize: '13px' }}
            />
            <div style={{ display:'flex', alignItems:'center', borderLeft:'1px solid #ddd', paddingLeft:4 }}>
              <button className="icon-btn" onClick={() => updateLayer(l.id, { fontSize: l.fontSize + 1 })}><Plus size={14}/></button>
              <button className="icon-btn" onClick={() => updateLayer(l.id, { fontSize: Math.max(6, l.fontSize - 1) })}><Minus size={14}/></button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:2, borderLeft:'1px solid #ddd', paddingLeft:4 }}>
              <button className={`text-btn ${l.font==='serif' ? 'active' : ''}`} style={{ fontFamily: 'serif' }} onClick={() => updateLayer(l.id, { font: 'serif' })}>T</button>
              <button className={`text-btn ${l.font==='sans' ? 'active' : ''}`} style={{ fontFamily: 'sans-serif' }} onClick={() => updateLayer(l.id, { font: 'sans' })}>A</button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:4, borderLeft:'1px solid #ddd', paddingLeft:4 }}>
              <button 
                className="icon-btn" 
                style={{ color: l.color }}
                onClick={() => {
                  try {
                    const canvas = bgCanvasRef.current;
                    if (!canvas) return;
                    
                    const layerEl = document.querySelector(`[data-layer-id="${l.id}"]`);
                    const canvasRect = canvas.getBoundingClientRect();
                    const layerRect  = layerEl ? layerEl.getBoundingClientRect() : null;
                    
                    if (!canvasRect || !layerRect) return;

                    const scX = canvas.width / canvasRect.width;
                    const scY = canvas.height / canvasRect.height;
                    
                    // Lấy điểm ở giữa đoạn chữ
                    const px = (layerRect.left + (layerRect.width / 2) - canvasRect.left) * scX;
                    const py = (layerRect.top + (layerRect.height / 2) - canvasRect.top) * scY;

                    const gctx = canvas.getContext('2d', { willReadFrequently: true });
                    const data = gctx.getImageData(Math.floor(px - 10), Math.floor(py - 10), 20, 20).data;
                    
                    let minB = 765, bestC = [0,0,0], tr=0, tg=0, tb=0, count=0;
                    for (let i=0; i<data.length; i+=4) {
                      const br = data[i] + data[i+1] + data[i+2];
                      if (br < minB) { minB = br; bestC = [data[i], data[i+1], data[i+2]]; }
                      tr+=data[i]; tg+=data[i+1]; tb+=data[i+2]; count++;
                    }
                    const resC = (minB < 680) ? bestC : [Math.round(tr/count), Math.round(tg/count), Math.round(tb/count)];
                    updateLayer(l.id, { color: `rgb(${resC[0]},${resC[1]},${resC[2]})` });
                    setBrushColor(`rgb(${resC[0]},${resC[1]},${resC[2]})`);
                  } catch(e) { console.error("Pipette error:", e); }
                }}
              ><Pipette size={14}/></button>
              <input type="color" value={rgb2hex(l.color)} onChange={(e) => updateLayer(l.id, { color: e.target.value })} style={{ width: 20, height: 20, cursor: 'pointer', border:'none', padding:0 }} />
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:4, borderLeft:'1px solid #ddd', paddingLeft:4 }}>
              <input type="range" min="0.1" max="1" step="0.01" value={l.opacity} onChange={(e) => updateLayer(l.id, { opacity: parseFloat(e.target.value) })} style={{ width: 40 }} />
            </div>
            <button className="icon-btn" style={{ color: 'red' }} onClick={() => deleteLayer(l.id)}><Trash2 size={14}/></button>
          </div>
        );
      })()}
    </div>
  );
}
