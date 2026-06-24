import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/dashboard',    label: 'Dashboard',         icon: '⊞' },
  { path: '/daily',        label: 'Daily Tracker',     icon: '📅' },
  { path: '/weekly',       label: 'Weekly Tracker',    icon: '📆' },
  { path: '/monthly',      label: 'Monthly Overview',  icon: '📊' },
  { path: '/topics',       label: 'Subject Hours Log', icon: '📚' },
  { path: '/targets',      label: 'Targets & Settings',icon: '🎯' },
  { path: '/habits',       label: 'Habit Tracker',     icon: '🏃' },
  { path: '/subscription', label: 'Subscription',      icon: '⭐' },
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

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 232,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 10,
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #7C6FFF, #2DD4BF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(124,111,255,0.35)',
            }}>U</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.3px' }}>UPSC Tracker</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, letterSpacing: '.3px' }}>Civil Services Prep</div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Navigation</div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? 'var(--purple-dim)' : 'transparent',
              color: isActive ? 'var(--purple)' : 'var(--text2)',
              border: isActive ? '1px solid rgba(124,111,255,0.18)' : '1px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              position: 'relative',
            })}>
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, borderRadius: '0 3px 3px 0',
                      background: 'var(--purple)',
                    }} />
                  )}
                  <span style={{
                    fontSize: 15,
                    width: 22,
                    textAlign: 'center',
                    flexShrink: 0,
                    filter: isActive ? 'none' : 'grayscale(0.3)',
                  }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.path === '/subscription' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px',
                      borderRadius: 20, background: 'var(--amber-dim)',
                      color: 'var(--amber)', letterSpacing: '.4px',
                    }}>PRO</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          {/* User card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            marginBottom: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C6FFF, #2DD4BF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Aspirant'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Toggle + Logout row */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setIsDark(d => !d)} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button onClick={handleLogout} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: 232,
        minHeight: '100vh',
        background: 'var(--bg)',
        overflow: 'auto',
      }}>
        <Outlet />
      </main>
    </div>
  );
}