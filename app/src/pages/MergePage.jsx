import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';

export default function MergePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dragOverIdx = useRef(null);

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); setSuccess('');
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setSuccess('');
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setFiles(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const handleMoveDown = (idx) => {
    setFiles(prev => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) { setError('Cần ít nhất 2 file PDF để gộp.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const mergedDoc = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      }
      const bytes = await mergedDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gop-pdf.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`✅ Đã gộp ${files.length} file thành công!`);
    } catch (err) {
      setError('Có lỗi xảy ra khi gộp PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop upload
  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (dropped.length) setFiles(prev => [...prev, ...dropped]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '560px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', padding: '4px 0' }}>
          ← Quay lại
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border-color)' }} />
        <span style={{ fontSize: '18px', fontWeight: 700 }}>🔗 Gộp PDF</span>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#FF9500'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <input ref={fileRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={handleAddFiles} />
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Bấm hoặc kéo thả các file PDF vào đây</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Danh sách ({files.length} file) — Sắp xếp theo thứ tự gộp:</p>
            {files.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '16px' }}>📄</span>
                <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: '14px' }}>↑</button>
                <button onClick={() => handleMoveDown(idx)} disabled={idx === files.length - 1} style={{ background: 'none', border: 'none', cursor: idx === files.length - 1 ? 'default' : 'pointer', opacity: idx === files.length - 1 ? 0.3 : 1, fontSize: '14px' }}>↓</button>
                <button onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-text)', fontSize: '16px', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color: 'var(--red-text)', fontSize: '13px', margin: 0 }}>{error}</p>}
        {success && <p style={{ color: '#34C759', fontSize: '13px', margin: 0 }}>{success}</p>}

        {/* Action */}
        <button
          onClick={handleMerge}
          disabled={loading || files.length < 2}
          className="action-btn"
          style={{ justifyContent: 'center', padding: '14px', fontSize: '15px', opacity: (files.length < 2 || loading) ? 0.5 : 1, background: '#FF9500', borderColor: '#FF9500' }}
        >
          {loading ? 'Đang gộp...' : `🔗 Gộp ${files.length} file & Tải về`}
        </button>

        {files.length < 2 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>Cần ít nhất 2 file để gộp.</p>
        )}
      </div>
    </div>
  );
}
