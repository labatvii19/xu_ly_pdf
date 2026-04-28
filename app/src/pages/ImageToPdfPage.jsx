import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ImageToPdfPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleAdd = (e) => {
    const files = Array.from(e.target.files || []).filter(f => ACCEPTED.includes(f.type));
    setImages(prev => [...prev, ...files]);
    setSuccess(''); setError('');
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => ACCEPTED.includes(f.type));
    if (files.length) setImages(prev => [...prev, ...files]);
  };

  const handleRemove = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
  const handleUp = (idx) => {
    if (idx === 0) return;
    setImages(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
  };
  const handleDown = (idx) => {
    setImages(prev => {
      if (idx === prev.length - 1) return prev;
      const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a;
    });
  };

  const handleConvert = async () => {
    if (!images.length) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const pdf = await PDFDocument.create();
      for (const file of images) {
        const bytes = await file.arrayBuffer();
        let img;
        if (file.type === 'image/png') img = await pdf.embedPng(bytes);
        else img = await pdf.embedJpg(bytes);
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'images-to-pdf.pdf'; a.click();
      URL.revokeObjectURL(url);
      setSuccess(`✅ Đã chuyển ${images.length} ảnh thành PDF thành công!`);
    } catch (err) {
      setError('Lỗi khi chuyển đổi: ' + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-color)', display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', maxWidth:'560px', marginBottom:'32px' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'14px' }}>← Quay lại</button>
        <div style={{ width:1, height:18, background:'var(--border-color)' }} />
        <span style={{ fontSize:'18px', fontWeight:700 }}>🖼️ Ảnh → PDF</span>
      </div>

      <div className="glass-panel" style={{ width:'100%', maxWidth:'560px', padding:'28px', display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          style={{ border:'2px dashed var(--border-color)', borderRadius:'12px', padding:'32px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#007AFF'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display:'none' }} onChange={handleAdd} />
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>🖼️</div>
          <p style={{ color:'var(--text-muted)', margin:0, fontSize:'14px' }}>Bấm hoặc kéo thả ảnh vào đây (JPG, PNG, WEBP)</p>
        </div>

        {/* Image list */}
        {images.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <p style={{ fontSize:'13px', fontWeight:600, margin:0 }}>Danh sách ({images.length} ảnh) — mỗi ảnh = 1 trang PDF:</p>
            {images.map((f, idx) => (
              <div key={idx} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'var(--bg-panel)', borderRadius:'8px', border:'1px solid var(--border-color)' }}>
                <img src={URL.createObjectURL(f)} alt="" style={{ width:40, height:40, objectFit:'cover', borderRadius:4 }} />
                <span style={{ flex:1, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                <button onClick={() => handleUp(idx)} disabled={idx===0} style={{ background:'none', border:'none', cursor: idx===0?'default':'pointer', opacity: idx===0?0.3:1 }}>↑</button>
                <button onClick={() => handleDown(idx)} disabled={idx===images.length-1} style={{ background:'none', border:'none', cursor: idx===images.length-1?'default':'pointer', opacity: idx===images.length-1?0.3:1 }}>↓</button>
                <button onClick={() => handleRemove(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red-text)', fontSize:'16px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color:'var(--red-text)', fontSize:'13px', margin:0 }}>{error}</p>}
        {success && <p style={{ color:'#34C759', fontSize:'13px', margin:0 }}>{success}</p>}

        <button onClick={handleConvert} disabled={loading || !images.length} className="action-btn"
          style={{ justifyContent:'center', padding:'14px', fontSize:'15px', opacity:(!images.length||loading)?0.5:1 }}>
          {loading ? 'Đang xử lý...' : `🖼️ Chuyển ${images.length} ảnh → PDF`}
        </button>
      </div>
    </div>
  );
}
