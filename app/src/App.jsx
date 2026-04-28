import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import HomePage from './pages/HomePage';
import EditPage from './pages/EditPage';
import SplitPage from './pages/SplitPage';
import MergePage from './pages/MergePage';
import ImageToPdfPage from './pages/ImageToPdfPage';
import PdfToImagePage from './pages/PdfToImagePage';
import PdfToWordPage from './pages/PdfToWordPage';
import WordToPdfPage from './pages/WordToPdfPage';
import './index.css';


// ─── Login Gate ──────────────────────────────────────────────────────────────
const LoginGate = ({ onLogin }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode === 'plpl12345') {
      const ua = navigator.userAgent;
      let os = 'Unknown';
      if (ua.indexOf('Win') !== -1) os = 'Windows';
      else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
      else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
      else if (ua.indexOf('Android') !== -1) os = 'Android';
      const deviceType = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ? 'Mobile' : 'Desktop';
      let browser = 'Unknown';
      if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
      else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
      try {
        await supabase.from('visit_logs').insert([{ device_type: deviceType, os, browser, user_agent: ua }]);
      } catch (err) { console.warn('Log failed', err); }
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
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>PDF Toolkit</h2>
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

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
const AdminDashboard = ({ onLogout }) => {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.from('visit_logs').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLogs(data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={24} style={{ color: 'var(--primary-color)' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Admin Dashboard</h1>
        </div>
        <button className="action-btn" onClick={onLogout} style={{ background: 'var(--bg-panel)' }}>
          <LogOut size={16} /> Thoát
        </button>
      </div>
      <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Tổng lượt truy cập: {logs.length}</h3>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>Thời gian</th>
                <th style={{ padding: '8px' }}>Hệ điều hành</th>
                <th style={{ padding: '8px' }}>Trình duyệt</th>
                <th style={{ padding: '8px' }}>Thiết bị</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '10px 8px' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '10px 8px' }}>{log.os}</td>
                  <td style={{ padding: '10px 8px' }}>{log.browser}</td>
                  <td style={{ padding: '10px 8px' }}>{log.device_type}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có lượt truy cập nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [authStatus, setAuthStatus] = useState('locked'); // 'locked' | 'user' | 'admin'

  if (authStatus === 'locked') return <LoginGate onLogin={setAuthStatus} />;
  if (authStatus === 'admin') return <AdminDashboard onLogout={() => setAuthStatus('locked')} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/split" element={<SplitPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
        <Route path="/pdf-to-image" element={<PdfToImagePage />} />
        <Route path="/pdf-to-word" element={<PdfToWordPage />} />
        <Route path="/word-to-pdf" element={<WordToPdfPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
