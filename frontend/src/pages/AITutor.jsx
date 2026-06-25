import { useState, useEffect, useRef } from 'react';
import api from '../api';

const CHAT_STORAGE_KEY = 'upsc_ai_chat_history';

const WELCOME_MSG = (name) => `Hi ${name || 'there'}! 👋 I'm your personal UPSC AI Tutor.

I have access to your real study data — your sessions, pending tasks, subject hours, and habit tracker. I'll give you advice based on YOUR actual progress, not generic tips.

I can help you with:
- 📊 **Today's performance review** based on your actual completed/pending sessions
- 📚 **Subject-wise study plans** tailored to your weak areas
- 🏆 **Topper strategy comparisons** with your current pace
- 🎯 **Personalized recovery plans** for pending sessions

What would you like to work on today?`;

const SUGGESTIONS = [
  "Review my study progress today",
  "Which subject needs more attention?",
  "Give me a 30-day Polity plan",
  "How do I catch up on pending sessions?",
  "Compare my pace with toppers",
  "Create a weekly timetable for me",
];

export default function AITutor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [checkingAccess, setCheckingAccess] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { init(); }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const init = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserName(user.name || 'Aspirant');

      // Load saved chat history
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          setCheckingAccess(false);
          return;
        }
      }

      // No saved history — show welcome message
      setMessages([{
        role: 'assistant',
        content: WELCOME_MSG(user.name),
        id: Date.now(),
      }]);
    } catch(e) {
      console.error(e);
    } finally {
      setCheckingAccess(false);
    }
  };

  const clearChat = () => {
    if (!confirm('Clear chat history? This cannot be undone.')) return;
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setMessages([{
      role: 'assistant',
      content: WELCOME_MSG(user.name),
      id: Date.now(),
    }]);
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMsg, id: Date.now() }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        messages: newMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content }))
      });
      const reply = response.data.reply || 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1 }]);
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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

  const st = {
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
      maxWidth: '75%', padding: '12px 16px',
      borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      background: role === 'user' ? 'var(--purple)' : 'var(--surface2)',
      border: role === 'user' ? 'none' : '1px solid var(--border)',
      color: role === 'user' ? '#fff' : 'var(--text)',
      fontSize: 14, lineHeight: 1.65,
    }),
    suggestions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 },
    chip: { padding: '7px 14px', borderRadius: 20, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: 500 },
    inputRow: { display: 'flex', gap: 10, flexShrink: 0 },
    input: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', fontFamily: 'Sora,sans-serif', outline: 'none', resize: 'none', lineHeight: 1.5 },
    sendBtn: { width: 48, height: 48, borderRadius: 12, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' },
    typing: { display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', width: 'fit-content' },
    dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', opacity: .4, animation: `bounce 1.2s ${i * 0.2}s infinite` }),
  };

  if (checkingAccess) return (
    <div style={{ ...st.page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading AI Tutor...</div>
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
        .send-btn:hover { opacity: 0.85; }
        .chat-input:focus { border-color: var(--purple) !important; }
        .clear-btn:hover { background: var(--red-dim) !important; color: var(--red) !important; border-color: var(--red) !important; }
      `}</style>
      <div style={st.page}>
        {/* Header */}
        <div style={{ ...st.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={st.title}>
              🤖 AI Tutor
              <span style={st.badge}>PRO</span>
            </div>
            <div style={st.sub}>Your personal UPSC mentor · Reads your real study data · Powered by LLaMA 3.3</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {messages.length - 1 > 0 ? `${messages.length - 1} messages` : ''}
            </div>
            <button
              className="clear-btn"
              onClick={clearChat}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}
            >
              🗑 Clear chat
            </button>
          </div>
        </div>

        {/* Chat window */}
        <div style={st.chatWrap}>
          {messages.map((msg) => (
            <div key={msg.id} style={st.msgRow(msg.role)}>
              {msg.role === 'assistant' && <div style={st.avatar('assistant')}>🤖</div>}
              <div style={st.bubble(msg.role)}>
                {msg.role === 'assistant'
                  ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}/>
                  : msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={st.avatar('user')}>{(userName || 'U')[0].toUpperCase()}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={st.msgRow('assistant')}>
              <div style={st.avatar('assistant')}>🤖</div>
              <div style={st.typing}>
                <div style={st.dot(0)}></div>
                <div style={st.dot(1)}></div>
                <div style={st.dot(2)}></div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Suggestions — only show when chat is fresh */}
        {messages.length <= 1 && (
          <div style={st.suggestions}>
            {SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                className="suggestion-chip"
                style={st.chip}
                onClick={() => sendMessage(suggestion)}
              >{suggestion}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={st.inputRow}>
          <textarea
            ref={inputRef}
            className="chat-input"
            style={st.input}
            rows={1}
            placeholder="Ask anything — I know your study data, subjects, pending sessions..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="send-btn"
            style={{ ...st.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >→</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          Press Enter to send · Shift+Enter for new line · Chat history saved automatically
        </div>
      </div>
    </>
  );
}