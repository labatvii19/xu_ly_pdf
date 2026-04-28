import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadPdf, renderPageToCanvas } from '../services/pdfService';
import JSZip from 'jszip';

export default function PdfToImagePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg'
  const [scale, setScale] = useState(2.0);    // render scale (quality)
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setSuccess(''); setProgress('');
    try {
      const doc = await loadPdf(f);
      setFile(f); setNumPages(doc.numPages);
    } catch { setError('Không thể đọc file PDF.'); }
  };

  const renderPageToBlob = (page, sc, fmt) => new Promise(async (resolve) => {
    const canvas = document.createElement('canvas');
    await renderPageToCanvas(page, canvas, sc);
    canvas.toBlob(resolve, fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
  });

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const pdfDoc = await loadPdf(file);
      const zip = new JSZip();
      const folder = zip.folder('images');

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProgress(`Đang xử lý trang ${i}/${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(i);
        const blob = await renderPageToBlob(page, scale, format);
        folder.file(`trang-${String(i).padStart(3,'0')}.${format}`, blob);
      }

      setProgress('Đang nén file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a'); a.href = url; a.download = `pdf-to-images.zip`; a.click();
      URL.revokeObjectURL(url);
      setSuccess(`✅ Đã chuyển ${pdfDoc.numPages} trang → ${pdfDoc.numPages} ảnh ${format.toUpperCase()} (file .zip)!`);
    } catch (err) {
      setError('Lỗi: ' + err.message);
    } finally { setLoading(false); setProgress(''); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-color)', display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', maxWidth:'560px', marginBottom:'32px' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'14px' }}>← Quay lại</button>
        <div style={{ width:1, height:18, background:'var(--border-color)' }} />
        <span style={{ fontSize:'18px', fontWeight:700 }}>📸 PDF → Ảnh</span>
      </div>

      <div className="glass-panel" style={{ width:'100%', maxWidth:'560px', padding:'28px', display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border:'2px dashed var(--border-color)', borderRadius:'12px', padding:'32px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s', background: file?'rgba(52,199,89,0.05)':'transparent' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#34C759'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display:'none' }} onChange={handleFile} />
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>{file ? '📄' : '📂'}</div>
          {file ? (
            <><p style={{ fontWeight:600, margin:'0 0 4px' }}>{file.name}</p>
              <p style={{ color:'var(--text-muted)', fontSize:'13px', margin:0 }}>Tổng: <strong>{numPages} trang</strong></p></>
          ) : <p style={{ color:'var(--text-muted)', margin:0 }}>Bấm để chọn file PDF</p>}
        </div>

        {/* Options */}
        {file && (
          <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'8px' }}>
              <label style={{ fontSize:'13px', fontWeight:600 }}>Định dạng ảnh</label>
              <div style={{ display:'flex', gap:'8px' }}>
                {['png','jpeg'].map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    style={{ flex:1, padding:'10px', borderRadius:'8px', border:`1.5px solid ${format===f?'#007AFF':'var(--border-color)'}`, background: format===f?'rgba(0,122,255,0.08)':'var(--bg-panel)', fontWeight:600, cursor:'pointer', color: format===f?'#007AFF':'var(--text-color)', fontSize:'13px' }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'8px' }}>
              <label style={{ fontSize:'13px', fontWeight:600 }}>Chất lượng: <strong>{scale}×</strong></label>
              <input type="range" min="1" max="4" step="0.5" value={scale} onChange={e => setScale(parseFloat(e.target.value))}
                style={{ width:'100%', accentColor:'#007AFF' }} />
              <p style={{ fontSize:'11px', color:'var(--text-muted)', margin:0 }}>Cao = ảnh nét hơn, file lớn hơn</p>
            </div>
          </div>
        )}

        {error && <p style={{ color:'var(--red-text)', fontSize:'13px', margin:0 }}>{error}</p>}
        {progress && <p style={{ color:'var(--primary-color)', fontSize:'13px', margin:0 }}>⏳ {progress}</p>}
        {success && <p style={{ color:'#34C759', fontSize:'13px', margin:0 }}>{success}</p>}

        {file && (
          <button onClick={handleConvert} disabled={loading} className="action-btn"
            style={{ justifyContent:'center', padding:'14px', fontSize:'15px', opacity:loading?0.5:1, background:'#34C759', borderColor:'#34C759' }}>
            {loading ? 'Đang xử lý...' : `📸 Chuyển ${numPages} trang → Ảnh (ZIP)`}
          </button>
        )}
      </div>
    </div>
  );
}
