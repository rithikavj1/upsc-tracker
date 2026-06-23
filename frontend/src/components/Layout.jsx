import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { path: '/daily', label: 'Daily Tracker', icon: '📅' },
  { path: '/weekly', label: 'Weekly Tracker', icon: '📆' },
  { path: '/monthly', label: 'Monthly Overview', icon: '📊' },
  { path: '/topics', label: 'Subject Hours Log', icon: '📚' },
  { path: '/targets', label: 'Targets & Settings', icon: '🎯' },
  { path: '/subscription', label: 'Subscription ⭐', icon: '💳' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.body.classList.toggle('light', !isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initials = (user.name || 'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed',
        height: '100vh', zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>U</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>UPSC Tracker</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Civil Services Prep</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, fontSize: 13,
              background: isActive ? 'var(--purple-dim)' : 'transparent',
              color: isActive ? 'var(--purple)' : 'var(--text2)',
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.15s',
              border: isActive ? '1px solid rgba(124,111,255,0.2)' : '1px solid transparent',
              textDecoration: 'none',
            })}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Buttons */}
        <div style={{ padding: '0 12px' }}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'Aspirant'}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            </div>

            {/* Dark / Light toggle */}
            <button onClick={() => setIsDark(d => !d)} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, marginBottom: 6,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text3)', fontSize: 12, textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              {isDark ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>

            {/* Logout */}
            <button onClick={handleLogout} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text3)', fontSize: 12, textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh', overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}