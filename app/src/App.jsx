import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPdf, renderPageToCanvas } from './services/pdfService';
import { exportPdf } from './services/exportService';
import {
  Hand, Square, Download, Trash2, Layers,
  Copy, Scissors, ChevronLeft, ChevronRight, X, FolderOpen, Briefcase, ZoomIn, ZoomOut, ArrowUpToLine, ArrowDownToLine, Lock, Unlock, Undo2, Redo2
} from 'lucide-react';
import './index.css';

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

function toPdfCoords(e, canvas, vp) {
  const r   = canvas.getBoundingClientRect();
  const { x: cx, y: cy } = getClientXY(e);
  return {
    // Map CSS pixels directly to PDF points (base viewport size)
    x: (cx - r.left) * (vp.w / r.width),
    y: (cy - r.top)  * (vp.h / r.height),
  };
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
  const historyRef   = useRef([]); // Array of snapshots
  const historyIndexRef = useRef(-1);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

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
    setHistoryStamp(Date.now());
  }, []);

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
      const pos = toPdfCoords(e, canvas, vpRef.current);
      const m = marqueeRef.current;
      
      // Hit test existing marquee
      if (m && m.w > 0 && m.h > 0 && pos.x >= m.x && pos.x <= m.x + m.w && pos.y >= m.y && pos.y <= m.y + m.h) {
        dragRef.current = { type: 'marquee', offsetX: pos.x - m.x, offsetY: pos.y - m.y };
        setContextMenu(null);
        return;
      }

      // Draw new marquee
      marqueeRef.current = { x: pos.x, y: pos.y, w: 0, h: 0, x0: pos.x, y0: pos.y };
      setContextMenu(null);
      setSelRect(null);
    } else {
      // Pan mode: check if hitting a layer
      const pos = toPdfCoords(e, canvas, vpRef.current);
      const hit = [...layersRef.current].reverse().find(l =>
        l.type === 'image' &&
        !l.locked &&
        pos.x >= l.x && pos.x <= l.x + l.w &&
        pos.y >= l.y && pos.y <= l.y + l.h
      );
      if (hit) {
        e.preventDefault();
        const r    = canvas.getBoundingClientRect();
        const { x: cx, y: cy } = getClientXY(e);
        dragRef.current = {
          id: hit.id,
          startCX: cx, startCY: cy,
          startLX: hit.x, startLY: hit.y,
          scaleX: vpRef.current.w / r.width,
          scaleY: vpRef.current.h / r.height,
          hasMoved: false,
        };
        // don't select yet — only select when drag released without movement
      } else {
        // If no layer hit in pan mode: deselect current layer
        setSelectedId(null);
        // do NOT call preventDefault → touch event propagates to parent scroll container naturally
      }
    }
  }, []);

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
      const pos = toPdfCoords(e, canvas, vpRef.current);
      
      if (dragRef.current && dragRef.current.type === 'marquee') {
        const m = marqueeRef.current;
        m.x = pos.x - dragRef.current.offsetX;
        m.y = pos.y - dragRef.current.offsetY;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => { drawOverlay(); rafRef.current = null; });
        }
        return;
      }

      if (marqueeRef.current) {
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
  }, [drawOverlay, setRenderId]);

  const handleUp = useCallback((e) => {
    if (!e.touches || e.touches.length < 2) {
      pinchRef.current = { initialDist: null, initialZoom: null };
    }
    if (modeRef.current === 'marquee') {
      if (dragRef.current && dragRef.current.type === 'marquee') {
        dragRef.current = null;
      } else if (!marqueeRef.current) {
        return;
      }
      
      e.preventDefault();
      const m = marqueeRef.current;
      if (m.w > 10 && m.h > 10) {
        // Snap coords
        const finalRect = { x: m.x, y: m.y, w: m.w, h: m.h };
        setSelRect(finalRect);
        // Position context menu in FIXED viewport coords
        const canvas = bgCanvasRef.current;
        const r      = canvas.getBoundingClientRect();
        const sx     = r.width  / vpRef.current.w;
        const sy     = r.height / vpRef.current.h;
        setContextMenu({
          x: r.left + (m.x + m.w / 2) * sx,
          y: r.top  + (m.y + m.h) * sy + 14,
        });
      } else {
        marqueeRef.current = null;
        drawOverlay();
        setSelRect(null);
      }
      return;
    }
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

  // ── Callback ref: attaches events the moment canvas mounts ──
  const ovCallbackRef = useCallback((node) => {
    if (ovCanvasRef.current) {
      // Cleanup old
      ovCanvasRef.current.removeEventListener('mousedown',  handleDown);
      ovCanvasRef.current.removeEventListener('mousemove',  handleMove);
      ovCanvasRef.current.removeEventListener('mouseup',    handleUp);
      ovCanvasRef.current.removeEventListener('touchstart', handleDown);
      ovCanvasRef.current.removeEventListener('touchmove',  handleMove);
      ovCanvasRef.current.removeEventListener('touchend',   handleUp);
      ovCanvasRef.current.removeEventListener('gesturestart',  handleGestureStart);
      ovCanvasRef.current.removeEventListener('gesturechange', handleGestureChange);
      ovCanvasRef.current.removeEventListener('gestureend',    handleUp);
    }
    ovCanvasRef.current = node;
    if (!node) return;
    node.addEventListener('mousedown',  handleDown,               { passive: false });
    node.addEventListener('mousemove',  handleMove,               { passive: false });
    node.addEventListener('mouseup',    handleUp,                 { passive: false });
    node.addEventListener('touchstart', handleDown,               { passive: false });
    node.addEventListener('touchmove',  handleMove,               { passive: false });
    node.addEventListener('touchend',   handleUp,                 { passive: false });
    node.addEventListener('gesturestart',  handleGestureStart,    { passive: false });
    node.addEventListener('gesturechange', handleGestureChange,   { passive: false });
    node.addEventListener('gestureend',    handleUp,              { passive: false });
  }, [handleDown, handleMove, handleUp, handleGestureStart, handleGestureChange]);

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

    // Tạo snapshot pixel data ĐỒNG BỘ ngay lập tức trước mọi thứ khác
    // Đảm bảo dù sau này canvas có bị re-render thì data cũng đã an toàn
    // Ánh xạ tọa độ 1.0x sang pixel thực tế của Canvas (scale 2.5)
    const scaleFactorX = srcCanvas.width  / vpRef.current.w;
    const scaleFactorY = srcCanvas.height / vpRef.current.h;

    const x0 = Math.max(0, Math.floor(selRect.x * scaleFactorX));
    const y0 = Math.max(0, Math.floor(selRect.y * scaleFactorY));
    const x1 = Math.min(srcCanvas.width,  Math.ceil((selRect.x + selRect.w) * scaleFactorX));
    const y1 = Math.min(srcCanvas.height, Math.ceil((selRect.y + selRect.h) * scaleFactorY));
    const w  = x1 - x0;
    const h  = y1 - y0;
    if (w <= 0 || h <= 0) return;

    // ✔ Lấy pixel data SYNCHRONOUSLY
    const pixelData = srcCanvas.getContext('2d').getImageData(x0, y0, w, h);

    // Tạo canvas tạm để tạo Blob
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(pixelData, 0, 0);

    // Quy đổi ngược lại tọa độ PDF Points để lưu layer
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

    // Async phần: tạo Blob và URL (không nhạy cảm với render mới nữa)
    tmp.toBlob((blob) => {
      if (!blob) return;
      const imgUrl = URL.createObjectURL(blob);
      const newImg = { id: Date.now(), type: 'image', x: savedLX, y: savedLY, w: savedLW, h: savedLH, dataUrl: imgUrl };

      if (savedAction === 'cut') {
        const maskLayer = { id: Date.now() + 1, type: 'mask', x: savedLX, y: savedLY, w: savedLW, h: savedLH };
        layersRef.current = [...layersRef.current, maskLayer, newImg];
      } else {
        layersRef.current = [...layersRef.current, newImg];
      }
      const clipboardItem = { id: Date.now() + 2, w: savedLW, h: savedLH, dataUrl: imgUrl };
      setClipBin(prev => [...prev, clipboardItem]);
      saveHistory(); // SAVE after cut/copy creates layers
      setRenderId(v => v + 1);
    }, 'image/png');
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
          type: l.type === 'image' ? 'image' : 'rect',
          left: l.x, top: l.y, width: l.w, height: l.h,
          scaleX: 1, scaleY: 1,
          fill: l.type === 'mask' ? '#ffffff' : 'transparent',
          src: l.dataUrl || null,
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

      {/* ZOOM STICK */}
      {pdfFile && (
        <div className="zoom-stick glass-panel">
          <button className="zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.5, 10))} title="Zoom In">+</button>
          <div className="zoom-divider"/>
          <button className="zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))} title="Zoom Out">-</button>
        </div>
      )}

      {/* SCROLL AREA */}
      <div className="scroll-area" style={{ touchAction: mode==='marquee' ? 'none' : 'pan-x pan-y' }}>
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
            position:'relative', 
            // text-align center normally centers inline-blocks. If wider than screen, it clips left.
            // Using a flex wrapper instead allows safe scrolling. But we also just use display block with margin auto.
            display: 'block', 
            margin: '12px auto',
            width: `${Math.floor(vpRef.current.w * zoom)}px`,
            height: `${Math.floor(vpRef.current.h * zoom)}px`,
            maxWidth: 'none'
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
                  ? <rect key={l.id} x={l.x} y={l.y} width={l.w} height={l.h} fill="white"/>
                  : <image key={l.id} href={l.dataUrl} x={l.x} y={l.y} width={l.w} height={l.h}
                      style={{ filter: selectedId===l.id ? 'drop-shadow(0 0 8px rgba(0,122,255,0.7))' : 'none' }}
                    />
              )}
              {/* Selected layer border */}
              {(() => {
                const l = layersRef.current.find(x => x.id === selectedId && x.type === 'image');
                return l ? <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="none" stroke="#007AFF" strokeWidth="3" strokeDasharray="7 3"/> : null;
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
                  transform: 'translateX(-50%)',
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

      {/* BOTTOM TOOL PILL */}
      {pdfFile && (
        <div className="bottom-pill glass-panel">
          <button className={`toolbar-btn ${mode==='pan' ? 'active' : ''}`} onClick={() => setMode('pan')}>
            <Hand size={20}/>
          </button>
          <button className={`toolbar-btn ${mode==='marquee' ? 'active' : ''}`} onClick={() => setMode('marquee')}>
            <Square size={20}/>
          </button>
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
    </div>
  );
}
