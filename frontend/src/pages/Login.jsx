import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));

// Check if user has active subscription or trial
const status = data.user?.subscription_status;
const trialEnd = data.user?.trial_end ? new Date(data.user.trial_end) : null;
const now = new Date();
const trialActive = status === 'trial' && trialEnd && now < trialEnd;
const isPro = status === 'active';

if (trialActive || isPro) {
  navigate('/dashboard');
} else {
  // Trial expired or no subscription — go to subscription page
  navigate('/subscription');
}
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--text)',
    outline: 'none', marginTop: 6, display: 'block',
  };
  const lbl = { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#fff',
          }}>U</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }}>UPSC Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Civil Services Preparation</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{isRegister ? 'Create Account' : 'Welcome back'}</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
            {isRegister ? 'Start tracking your UPSC preparation' : 'Log in to continue your study streak'}
          </p>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            {isRegister && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Full Name</label>
                <input style={inp} type="text" name="name" placeholder="Rithika Sri Reddy" value={form.name} onChange={handle} required />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Password</label>
              <input style={inp} type="password" name="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', background: loading ? '#4a4580' : 'var(--purple)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Login')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text3)' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsRegister(r => !r); setError(''); }} style={{
              background: 'none', border: 'none', color: 'var(--purple)', fontWeight: 500, fontSize: 13, cursor: 'pointer',
            }}>
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
