import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { loadPdf } from '../services/pdfService';

function parseRanges(input, maxPages) {
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  const pages = new Set();
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) pages.add(i);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= maxPages) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

export default function SplitPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [rangeInput, setRangeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(''); setSuccess(''); setRangeInput('');
    try {
      const doc = await loadPdf(f);
      setFile(f);
      setNumPages(doc.numPages);
    } catch (err) {
      setError('Không thể đọc file PDF. Vui lòng thử file khác.');
    }
  };

  const handleSplit = async () => {
    if (!file || !rangeInput.trim()) return;
    const pages = parseRanges(rangeInput, numPages);
    if (pages.length === 0) { setError('Không có trang nào hợp lệ trong dải đã nhập.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes);
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, pages.map(p => p - 1));
      copied.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trang-${rangeInput.replace(/\s/g,'')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`✅ Đã xuất ${pages.length} trang thành công!`);
    } catch (err) {
      setError('Có lỗi xảy ra khi tách PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '560px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', padding: '4px 0' }}>
          ← Quay lại
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border-color)' }} />
        <span style={{ fontSize: '18px', fontWeight: 700 }}>✂️ Tách PDF</span>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: file ? 'rgba(52,199,89,0.05)' : 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#34C759'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>{file ? '📄' : '📂'}</div>
          {file ? (
            <>
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{file.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Tổng số trang: <strong>{numPages}</strong></p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Bấm để chọn file PDF</p>
          )}
        </div>

        {/* Range input */}
        {file && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Dải trang muốn trích xuất</label>
            <input
              type="text"
              value={rangeInput}
              onChange={e => { setRangeInput(e.target.value); setError(''); setSuccess(''); }}
              placeholder={`VD: 1-3, 5, 7-${numPages}`}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '15px', background: 'var(--bg-panel)', color: 'var(--text-color)' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Nhập số trang hoặc dải trang, ngăn cách bằng dấu phẩy. VD: <code>1-3, 5, 8</code></p>
          </div>
        )}

        {error && <p style={{ color: 'var(--red-text)', fontSize: '13px', margin: 0 }}>{error}</p>}
        {success && <p style={{ color: '#34C759', fontSize: '13px', margin: 0 }}>{success}</p>}

        {/* Action */}
        {file && (
          <button
            onClick={handleSplit}
            disabled={loading || !rangeInput.trim()}
            className="action-btn"
            style={{ justifyContent: 'center', padding: '14px', fontSize: '15px', opacity: (!rangeInput.trim() || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Đang xử lý...' : '✂️ Tách & Tải về'}
          </button>
        )}
      </div>
    </div>
  );
}
