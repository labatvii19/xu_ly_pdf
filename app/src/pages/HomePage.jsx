import React from 'react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    icon: '🖌️',
    title: 'Vá & Sửa PDF',
    desc: 'Che phủ, cắt dán, chỉnh sửa trực tiếp trên mặt giấy PDF.',
    path: '/edit',
    accent: '#007AFF',
  },
  {
    icon: '✂️',
    title: 'Tách PDF',
    desc: 'Trích xuất một hoặc nhiều trang từ file PDF thành file mới.',
    path: '/split',
    accent: '#34C759',
  },
  {
    icon: '🔗',
    title: 'Gộp PDF',
    desc: 'Nối nhiều file PDF khác nhau thành một file duy nhất.',
    path: '/merge',
    accent: '#FF9500',
  },
  {
    icon: '🖼️',
    title: 'Ảnh → PDF',
    desc: 'Chuyển một hoặc nhiều ảnh (JPG, PNG) thành file PDF.',
    path: '/image-to-pdf',
    accent: '#FF2D55',
  },
  {
    icon: '📸',
    title: 'PDF → Ảnh',
    desc: 'Xuất từng trang PDF thành ảnh PNG hoặc JPEG (file ZIP).',
    path: '/pdf-to-image',
    accent: '#5AC8FA',
  },
  {
    icon: '📝',
    title: 'PDF → Word',
    desc: 'Chuyển PDF thành file Word (.docx) — mỗi trang là 1 ảnh trong Word.',
    path: '/pdf-to-word',
    accent: '#5856D6',
  },
  {
    icon: '📄',
    title: 'Word → PDF',
    desc: 'Chuyển file Word (.docx) thành file PDF để chia sẻ dễ dàng.',
    path: '/word-to-pdf',
    accent: '#30B0C7',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '52px', marginBottom: '12px' }}>📄</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>PDF Toolkit</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>Chọn công cụ bạn muốn sử dụng</p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        width: '100%',
        maxWidth: '760px',
      }}>
        {modules.map((mod) => (
          <button
            key={mod.path}
            onClick={() => navigate(mod.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '24px 20px',
              background: 'var(--bg-panel)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.12)`;
              e.currentTarget.style.borderColor = mod.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: '12px' }}>{mod.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-color)' }}>{mod.title}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{mod.desc}</span>
            <div style={{ marginTop: '16px', fontSize: '12px', fontWeight: 600, color: mod.accent }}>
              Mở →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
