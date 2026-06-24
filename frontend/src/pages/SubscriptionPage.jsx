import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function SubscriptionPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStatus();
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await api.get('/subscription/status');
      setStatus(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startSubscription = async () => {
    setProcessing(true);
    setMsg('');
    try {
      const res = await api.post('/subscription/create', { plan: 'monthly' });
      const { subscription_id, razorpay_key, user_name, user_email } = res.data;

      const options = {
        key: razorpay_key,
        subscription_id,
        name: 'UPSC Tracker',
        description: '₹1 registration + ₹299/month after 30 days',
        image: '',
        prefill: { name: user_name, email: user_email },
        theme: { color: '#7C6FFF' },
        handler: async (response) => {
          try {
            await api.post('/subscription/verify', response);
            setMsg('✅ Subscription activated! You now have Pro access.');
            loadStatus();
          } catch(e) {
            setMsg('❌ Verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setMsg('Payment cancelled. You can try again anytime.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch(e) {
      setMsg('❌ Error: ' + (e.response?.data?.error || e.message));
      setProcessing(false);
    }
  };

  const pauseSubscription = async () => {
    if (!confirm('Pause your subscription? You can resume anytime.')) return;
    setProcessing(true);
    try {
      await api.post('/subscription/pause');
      setMsg('⏸ Subscription paused. No charges until you resume.');
      loadStatus();
    } catch(e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
    finally { setProcessing(false); }
  };

  const resumeSubscription = async () => {
    setProcessing(true);
    try {
      await api.post('/subscription/resume');
      setMsg('✅ Subscription resumed!');
      loadStatus();
    } catch(e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
    finally { setProcessing(false); }
  };

  const cancelSubscription = async () => {
    if (!confirm('Cancel your subscription? This cannot be undone.')) return;
    setProcessing(true);
    try {
      await api.post('/subscription/cancel');
      setMsg('Subscription cancelled. You can resubscribe anytime.');
      loadStatus();
    } catch(e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
    finally { setProcessing(false); }
  };

  const card = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:28 };
  const btn = (bg, color='#fff') => ({ background:bg, color, border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:600, cursor:'pointer', opacity:processing?0.7:1 });

  if (loading) return <div style={{ padding:40, color:'var(--text3)' }}>Loading...</div>;

  return (
    <div style={{ padding:'40px 48px', maxWidth:720, margin:'0 auto' }}>
      <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-.5px', marginBottom:6 }}>Subscription</h1>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:32 }}>Manage your UPSC Tracker plan</p>

      {msg && (
        <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:20, fontSize:13,
          background: msg.startsWith('✅') ? 'var(--green-dim)' : msg.startsWith('⏸') ? 'var(--purple-dim)' : 'var(--red-dim)',
          color: msg.startsWith('✅') ? 'var(--green)' : msg.startsWith('⏸') ? 'var(--purple)' : 'var(--red)',
          border: `1px solid ${msg.startsWith('✅') ? 'var(--green)' : 'var(--border)'}` }}>
          {msg}
        </div>
      )}

      {/* Current Plan Card */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>Current plan</div>
            <div style={{ fontSize:22, fontWeight:700 }}>
              {status?.status === 'trial' ? '🎉 Free Trial' :
               status?.status === 'active' ? '⭐ Pro Plan' :
               status?.status === 'cancelled' ? '❌ Cancelled' : 'No active plan'}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:24, fontWeight:700,
              color: status?.status === 'active' ? 'var(--purple)' : status?.status === 'trial' ? 'var(--teal)' : 'var(--text3)' }}>
              {status?.status === 'trial' ? '₹0' : status?.status === 'active' ? '₹299' : '—'}
            </div>
            {status?.status === 'active' && <div style={{ fontSize:11, color:'var(--text3)' }}>per month</div>}
          </div>
        </div>

        {status?.status === 'trial' && (
          <div style={{ background:'var(--surface2)', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:6 }}>
              🕐 Trial ends in <strong style={{ color:'var(--teal)' }}>{status.trial_days_left} days</strong>
            </div>
            <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round((1 - status.trial_days_left/30)*100)}%`, background:'var(--teal)', borderRadius:3 }}></div>
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>After trial, subscribe for ₹299/month to keep access</div>
          </div>
        )}

        {status?.is_paused && (
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:'var(--amber)' }}>
            ⏸ Subscription is paused — no charges until you resume
          </div>
        )}

        {status?.status === 'active' && (
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
            Next billing: <strong style={{ color:'var(--text)' }}>
              {status.subscription_end ? new Date(status.subscription_end).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : '—'}
            </strong>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ ...card, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:18 }}>Actions</div>

        {(status?.status === 'trial' || status?.status === 'cancelled' || !status?.status) && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Subscribe to Pro</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14, lineHeight:1.6 }}>
              Pay ₹1 now to set up auto-pay. After your 30-day trial ends, ₹299/month will be auto-debited.
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:14, padding:'14px 18px', background:'var(--purple-dim)', borderRadius:10, border:'1px solid rgba(124,111,255,0.2)' }}>
              <div style={{ fontSize:24 }}>💳</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--purple)' }}>₹1 today → ₹299/month after 30 days</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>UPI · Debit/Credit card · Net banking · Wallets</div>
              </div>
            </div>
            <button onClick={startSubscription} disabled={processing} style={btn('#7C6FFF')}>
              {processing ? 'Opening payment...' : '⭐ Subscribe — ₹1 now'}
            </button>
          </div>
        )}

        {status?.status === 'active' && !status?.is_paused && (
          <div style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Pause subscription</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Stop auto-debit temporarily. Resume anytime — no charges while paused.</div>
            <button onClick={pauseSubscription} disabled={processing} style={btn('transparent', 'var(--amber)') }>
              ⏸ Pause subscription
            </button>
          </div>
        )}

        {status?.is_paused && (
          <div style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Resume subscription</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Resume your Pro access and monthly billing.</div>
            <button onClick={resumeSubscription} disabled={processing} style={btn('#22D3A0')}>
              ▶ Resume subscription
            </button>
          </div>
        )}

        {(status?.status === 'active' || status?.is_paused) && (
          <div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Cancel subscription</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Cancel anytime. You keep access until end of current billing period.</div>
            <button onClick={cancelSubscription} disabled={processing} style={{ ...btn('transparent', 'var(--red)'), border:'1px solid rgba(220,38,38,0.3)' }}>
              ✕ Cancel subscription
            </button>
          </div>
        )}
      </div>

      {/* Plan details */}
      <div style={card}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:18 }}>Pro plan includes</div>
        {[
          'All 6 tracker pages — Daily, Weekly, Monthly, Topics, Dashboard, Targets',
          'Unlimited session logging — no history limit',
          'Pomodoro timer integrated with session tracking',
          'Subject-wise analytics with donut charts and bar charts',
          'Heatmap calendar with month navigation',
          'Exam countdown tracker with auto-progress bars',
          'Dark + light mode with saved preference',
          'Priority email support from the founder',
        ].map(f => (
          <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text2)' }}>
            <span style={{ color:'var(--green)', flexShrink:0, marginTop:1 }}>✓</span>{f}
          </div>
        ))}
        <div style={{ marginTop:16, fontSize:12, color:'var(--text3)' }}>
          Questions? Email <a href="mailto:rithikavj1@gmail.com" style={{ color:'var(--purple)' }}>rithikavj1@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
