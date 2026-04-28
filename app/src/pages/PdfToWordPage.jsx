import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadPdf, renderPageToCanvas } from '../services/pdfService';
import {
  Document, Packer, Paragraph, ImageRun, PageOrientation,
} from 'docx';

// Convert canvas to ArrayBuffer (PNG)
const canvasToArrayBuffer = (canvas) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => {
      blob.arrayBuffer().then(resolve);
    }, 'image/png', 1.0);
  });

export default function PdfToWordPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scale] = useState(2.0);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setSuccess('');
    try {
      const doc = await loadPdf(f);
      setFile(f); setNumPages(doc.numPages);
    } catch { setError('Không thể đọc file PDF.'); }
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const pdfDoc = await loadPdf(file);
      const sections = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        setProgress(`Đang render trang ${i}/${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        await renderPageToCanvas(page, canvas, scale);

        const imgBuffer = await canvasToArrayBuffer(canvas);

        // Word page dimensions in EMU (1 inch = 914400 EMU)
        // A4: 8.27 x 11.69 inches → 7559055 x 10692144 EMU (with margins)
        const pageWidthEMU  = Math.round(viewport.width  * scale * 9144); // px * scale * EMU per px(96dpi)
        const pageHeightEMU = Math.round(viewport.height * scale * 9144);

        sections.push({
          properties: {
            page: {
              size: {
                width: pageWidthEMU,
                height: pageHeightEMU,
                orientation: viewport.width > viewport.height
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
              },
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
            },
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: {
                    width: Math.round(viewport.width  * scale),
                    height: Math.round(viewport.height * scale),
                  },
                  type: 'png',
                }),
              ],
              spacing: { before: 0, after: 0 },
            }),
          ],
        });
      }

      setProgress('Đang tạo file Word...');
      const doc = new Document({ sections });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf', '')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`✅ Đã chuyển ${pdfDoc.numPages} trang PDF → file Word thành công!`);
    } catch (err) {
      setError('Lỗi: ' + err.message);
      console.error(err);
    } finally { setLoading(false); setProgress(''); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-color)', display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%', maxWidth:'560px', marginBottom:'32px' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'14px' }}>← Quay lại</button>
        <div style={{ width:1, height:18, background:'var(--border-color)' }} />
        <span style={{ fontSize:'18px', fontWeight:700 }}>📝 PDF → Word</span>
      </div>

      <div className="glass-panel" style={{ width:'100%', maxWidth:'560px', padding:'28px', display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Note */}
        <div style={{ background:'rgba(255,149,0,0.08)', border:'1px solid rgba(255,149,0,0.3)', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#996300', lineHeight:1.6 }}>
          <strong>📌 Lưu ý:</strong> Mỗi trang PDF sẽ được chuyển thành <strong>1 ảnh</strong> trong Word. File Word trông y hệt PDF nhưng <strong>không chỉnh sửa được text</strong>.
        </div>

        {/* Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border:'2px dashed var(--border-color)', borderRadius:'12px', padding:'32px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s', background: file?'rgba(52,199,89,0.05)':'transparent' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#5856D6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display:'none' }} onChange={handleFile} />
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>{file ? '📄' : '📂'}</div>
          {file ? (
            <><p style={{ fontWeight:600, margin:'0 0 4px' }}>{file.name}</p>
              <p style={{ color:'var(--text-muted)', fontSize:'13px', margin:0 }}>Tổng: <strong>{numPages} trang</strong> → {numPages} ảnh trong Word</p></>
          ) : <p style={{ color:'var(--text-muted)', margin:0 }}>Bấm để chọn file PDF</p>}
        </div>

        {error && <p style={{ color:'var(--red-text)', fontSize:'13px', margin:0 }}>{error}</p>}
        {progress && <p style={{ color:'var(--primary-color)', fontSize:'13px', margin:0 }}>⏳ {progress}</p>}
        {success && <p style={{ color:'#34C759', fontSize:'13px', margin:0 }}>{success}</p>}

        {file && (
          <button onClick={handleConvert} disabled={loading} className="action-btn"
            style={{ justifyContent:'center', padding:'14px', fontSize:'15px', opacity:loading?0.5:1, background:'#5856D6', borderColor:'#5856D6' }}>
            {loading ? 'Đang xử lý...' : `📝 Chuyển ${numPages} trang → Word (.docx)`}
          </button>
        )}
      </div>
    </div>
  );
}
