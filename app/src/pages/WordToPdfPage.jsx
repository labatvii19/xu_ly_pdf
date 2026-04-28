import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function WordToPdfPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const previewRef = useRef(null);
  const [file, setFile] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setSuccess(''); setHtmlContent('');
    setLoading(true);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setFile(f);
      setHtmlContent(result.value);
    } catch (err) {
      setError('Không thể đọc file Word: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!htmlContent || !previewRef.current) return;
    setConverting(true); setError(''); setSuccess('');
    try {
      // Render the preview div to canvas
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 width in points (72dpi): 595.28 x 841.89
      const pdfWidth = 595.28;
      const pdfHeight = (imgHeight / imgWidth) * pdfWidth;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'pt',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // If content is taller than one A4 page, split into pages
      const a4Height = 841.89;
      if (pdfHeight > a4Height) {
        // Multi-page: slice canvas into A4 pages
        const pageCount = Math.ceil(pdfHeight / a4Height);
        const sliceHeight = Math.floor(canvas.height / pageCount);

        const pdf2 = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        for (let i = 0; i < pageCount; i++) {
          if (i > 0) pdf2.addPage();
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(sliceHeight, canvas.height - i * sliceHeight);
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, i * sliceHeight, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceH = (sliceCanvas.height / canvas.width) * pdfWidth;
          pdf2.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, sliceH);
        }
        pdf2.save(`${file.name.replace(/\.docx?$/i, '')}.pdf`);
      } else {
        pdf.save(`${file.name.replace(/\.docx?$/i, '')}.pdf`);
      }

      setSuccess('✅ Đã chuyển file Word sang PDF thành công!');
    } catch (err) {
      setError('Lỗi khi chuyển đổi: ' + err.message);
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '680px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>← Quay lại</button>
        <div style={{ width: 1, height: 18, background: 'var(--border-color)' }} />
        <span style={{ fontSize: '18px', fontWeight: 700 }}>📄 Word → PDF</span>
      </div>

      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Note */}
        <div style={{ background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.3)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#996300', lineHeight: 1.6 }}>
          <strong>📌 Lưu ý:</strong> Hỗ trợ tốt với tài liệu có văn bản, tiêu đề, danh sách. Bảng phức tạp hoặc ảnh nhúng trong Word có thể bị lệch nhẹ.
        </div>

        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: file ? 'rgba(88,86,214,0.05)' : 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#5856D6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <input ref={fileRef} type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={handleFile} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{file ? '📝' : '📂'}</div>
            {loading ? <p style={{ color: 'var(--text-muted)', margin: 0 }}>⏳ Đang đọc file...</p>
              : file ? <><p style={{ fontWeight: 600, margin: '0 0 4px' }}>{file.name}</p><p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Bấm để chọn file khác</p></>
              : <p style={{ color: 'var(--text-muted)', margin: 0 }}>Bấm để chọn file Word (.docx)</p>}
          </div>

          {error && <p style={{ color: 'var(--red-text)', fontSize: '13px', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#34C759', fontSize: '13px', margin: 0 }}>{success}</p>}

          {htmlContent && (
            <button onClick={handleConvert} disabled={converting} className="action-btn"
              style={{ justifyContent: 'center', padding: '14px', fontSize: '15px', opacity: converting ? 0.5 : 1, background: '#5856D6', borderColor: '#5856D6' }}>
              {converting ? '⏳ Đang chuyển đổi...' : '📄 Chuyển sang PDF & Tải về'}
            </button>
          )}
        </div>

        {/* Preview */}
        {htmlContent && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>Xem trước nội dung:</p>
            <div
              ref={previewRef}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                background: '#ffffff',
                padding: '48px',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: 1.7,
                color: '#1a1a1a',
                fontFamily: 'Georgia, "Times New Roman", serif',
                maxHeight: '500px',
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
