import { useState, useEffect, useRef } from 'react';
import api from '../api';

const SYSTEM_PROMPT = (userData) => `You are an expert UPSC mentor and AI tutor. You give personalized, actionable guidance to serious IAS aspirants.

Student Profile:
- Name: ${userData.name || 'Aspirant'}
- Subjects being studied: ${userData.subjects || 'Polity, History, Geography, Economics, Environment'}
- This month's study hours: ${userData.monthlyHours || 'Not available'}
- Daily study target: ${userData.dailyTarget || 'Not set'}
- Current streak: ${userData.streak || 0} days
- Subscription: Yearly Pro (serious aspirant)

Your role:
1. Give UPSC-specific advice — not generic study tips
2. Compare the student's current pace with known topper strategies (Tina Dabi studied 15h/day, Srushti Deshmukh focused heavily on GS4 and essay)
3. When the student mentions a subject, give a concrete 2-4 week plan
4. Be encouraging but brutally honest about gaps
5. Reference real UPSC resources: Laxmikant for Polity, NCERT for basics, The Hindu for current affairs, Vision IAS, Vajiram etc.
6. Keep responses concise — 3-5 short paragraphs max
7. Use bullet points for plans and schedules
8. Always end with one actionable next step for TODAY

Remember: This student is paying for yearly access — they are serious. Treat them like a coaching center mentor who knows their data.`;

const WELCOME_MSG = (name) => `Hi ${name || 'there'}! 👋 I'm your personal UPSC AI Tutor.

I can see your study data from the tracker. I'm here to help you with:
- 📚 **Subject-wise study plans** (tell me your target date)
- 🏆 **Topper strategy comparisons** (Tina Dabi, Srushti Deshmukh, etc.)
- 📊 **Weekly performance reviews** based on your actual hours
- 🎯 **Personalized advice** for your weak areas

What would you like to work on today?`;

const SUGGESTIONS = [
  "Give me a 30-day Polity plan",
  "How do toppers study Current Affairs?",
  "Review my subject hours and tell me gaps",
  "Create a weekly timetable for me",
  "How many hours should I study daily?",
  "Which optional subject should I choose?",
];

export default function AITutor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({});
  const [isYearly, setIsYearly] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAccess = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Check if yearly subscriber
      const subRes = await api.get('/subscription/status');
      const sub = subRes.data;
      const hasYearly = sub.status === 'active' && sub.plan === 'yearly';
      // For testing — also allow active users
      const hasAccess = true; // Open to all users for now
      setIsYearly(hasAccess);

      // Load user data for context
      setUserData({
        name: user.name || 'Aspirant',
        subjects: 'Polity, History, Geography, Economics, Environment, Science & Tech',
        monthlyHours: '148 hours',
        dailyTarget: '10 hours',
        streak: 12,
      });

      // Try to load actual data from tracker
      try {
        const overviewRes = await api.get('/overview/current');
        if (overviewRes.data) {
          setUserData(prev => ({
            ...prev,
            monthlyHours: overviewRes.data.total_hours + ' hours' || prev.monthlyHours,
            streak: overviewRes.data.streak || prev.streak,
          }));
        }
      } catch(e) { /* use defaults */ }

      if (hasAccess) {
        setMessages([{
          role: 'assistant',
          content: WELCOME_MSG(user.name),
          id: Date.now(),
        }]);
      }
    } catch(e) {
      setIsYearly(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMsg, id: Date.now() }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
const response = await api.post('/ai/chat', {
  systemPrompt: SYSTEM_PROMPT(userData),
  messages: newMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }))
});
const reply = response.data.reply || 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        id: Date.now() + 1,
      }]);
    } catch(e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Connection error. Please check your internet and try again.',
        id: Date.now() + 1,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4 style="color:var(--text);font-size:13px;font-weight:700;margin:12px 0 6px">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 style="color:var(--text);font-size:14px;font-weight:700;margin:14px 0 8px">$1</h3>')
      .replace(/^- (.*$)/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
      .replace(/(<li.*<\/li>)/gs, '<ul style="margin:8px 0;padding-left:16px;list-style:disc">$1</ul>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const s = {
    page: { padding: '32px 40px', maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column' },
    header: { marginBottom: 20, flexShrink: 0 },
    title: { fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 },
    badge: { background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.5px' },
    sub: { fontSize: 13, color: 'var(--text2)' },
    chatWrap: { flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 12 },
    msgRow: (role) => ({ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-start' }),
    avatar: (role) => ({
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: role === 'user' ? 'var(--purple)' : 'linear-gradient(135deg,#7C6FFF,#2DD4BF)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, color: '#fff', fontWeight: 700,
    }),
    bubble: (role) => ({
      maxWidth: '75%', padding: '12px 16px', borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      background: role === 'user' ? 'var(--purple)' : 'var(--surface2)',
      border: role === 'user' ? 'none' : '1px solid var(--border)',
      color: role === 'user' ? '#fff' : 'var(--text)',
      fontSize: 14, lineHeight: 1.65,
    }),
    suggestions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 },
    chip: { padding: '7px 14px', borderRadius: 20, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: 500 },
    inputRow: { display: 'flex', gap: 10, flexShrink: 0 },
    input: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', fontFamily: 'Inter,sans-serif', outline: 'none', resize: 'none', lineHeight: 1.5 },
    sendBtn: { width: 48, height: 48, borderRadius: 12, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' },
    locked: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 48, textAlign: 'center' },
    typing: { display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', width: 'fit-content' },
    dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', opacity: .4, animation: `bounce 1.2s ${i * 0.2}s infinite` }),
  };

  if (checkingAccess) return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text2)', fontSize: 14 }}>Checking access...</div>
    </div>
  );

  if (isYearly === false) return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>🤖 AI Tutor <span style={s.badge}>YEARLY ONLY</span></div>
        <div style={s.sub}>Your personal UPSC mentor powered by AI</div>
      </div>
      <div style={s.locked}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '-.4px' }}>AI Tutor is a Yearly Plan feature</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 400, lineHeight: 1.7, marginBottom: 28 }}>
          Get personalized UPSC mentoring, topper strategy comparisons, and AI-generated study plans — exclusively for yearly subscribers.
        </div>
        <div style={{ background: 'var(--purple-dim)', border: '1px solid rgba(124,111,255,0.3)', borderRadius: 12, padding: '16px 24px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Yearly Plan — ₹1699/year</div>
          {['AI Tutor with chat memory','Personalized study plans','Topper strategy comparisons','Weekly performance reviews','All Pro Monthly features'].map(f => (
            <div key={f} style={{ fontSize: 13, color: 'var(--text2)', padding: '4px 0', display: 'flex', gap: 8 }}>
              <span style={{ color: '#22D3A0' }}>✓</span>{f}
            </div>
          ))}
        </div>
        <a href="/subscription" style={{ background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', color: '#fff', padding: '13px 32px', borderRadius: 11, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Upgrade to Yearly — ₹1699 →
        </a>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>Cancel anytime · Save ₹689 vs monthly</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%,60%,100%{transform:translateY(0);opacity:.4}
          30%{transform:translateY(-6px);opacity:1}
        }
        .suggestion-chip:hover { background: var(--purple-dim) !important; border-color: var(--purple) !important; color: var(--purple) !important; }
        .send-btn:hover { background: #6A5EE8 !important; transform: scale(1.05); }
        .chat-input:focus { border-color: var(--purple) !important; }
      `}</style>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.title}>
            🤖 AI Tutor
            <span style={s.badge}>YEARLY PRO</span>
          </div>
          <div style={s.sub}>Your personal UPSC mentor · Powered by Claude AI · Chat history saved this session</div>
        </div>

        {/* Chat window */}
        <div style={s.chatWrap}>
          {messages.map((msg) => (
            <div key={msg.id} style={s.msgRow(msg.role)}>
              {msg.role === 'assistant' && (
                <div style={s.avatar('assistant')}>🤖</div>
              )}
              <div style={s.bubble(msg.role)}>
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}/>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <div style={s.avatar('user')}>
                  {(userData.name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={s.msgRow('assistant')}>
              <div style={s.avatar('assistant')}>🤖</div>
              <div style={s.typing}>
                <div style={s.dot(0)}></div>
                <div style={s.dot(1)}></div>
                <div style={s.dot(2)}></div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick suggestions — only show at start */}
        {messages.length <= 1 && (
          <div style={s.suggestions}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                className="suggestion-chip"
                style={s}
                onClick={() => sendMessage(s)}
              >{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={s.inputRow}>
          <textarea
            ref={inputRef}
            className="chat-input"
            style={s.input}
            rows={1}
            placeholder="Ask anything about UPSC — strategy, subjects, toppers, timetable..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="send-btn"
            style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >→</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          Press Enter to send · Shift+Enter for new line · Powered by Claude AI
        </div>
      </div>
    </>
  );
}
