import { useState, useEffect, useRef } from 'react';
import api from '../api';

const CHAT_STORAGE_KEY = 'upsc_ai_chat_history';

const WELCOME_MSG = (name) => `Hi ${name || 'there'}! 👋 I'm your personal UPSC AI Tutor.

I have access to your real study data and can search the web for UPSC resources, topper answer copies, articles, and study material.

I can help you with:
- 📊 **Today's performance review** based on your actual sessions
- 📚 **Subject resources** — articles, PDFs, topper copies with real links
- 🏆 **Topper strategy** comparisons with your current pace
- 🎯 **Personalized plans** based on your weak subjects

What would you like to work on today?`;

const SUGGESTIONS = [
  "Review my study progress today",
  "Find topper answer copies for Mains",
  "NCERT PDF links for Geography",
  "Which subject needs more attention?",
  "Give me a 30-day Polity plan",
  "Current affairs resources and links",
];

// ── Download AI response as PDF ───────────────────────────────────────────
const downloadAsPDF = (content, title = 'UPSC AI Tutor Response') => {
  const clean = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1 ($2)')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\n/g, '\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
  h1 { color: #7C6FFF; border-bottom: 2px solid #7C6FFF; padding-bottom: 10px; }
  h2 { color: #555; margin-top: 20px; }
  .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
  pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
  a { color: #7C6FFF; }
</style>
</head>
<body>
<h1>🤖 UPSC AI Tutor</h1>
<div class="meta">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
<pre>${clean}</pre>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPSC-AI-Tutor-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AITutor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [checkingAccess, setCheckingAccess] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { init(); }, []);

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
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) { setMessages(parsed); setCheckingAccess(false); return; }
      }
      setMessages([{ role: 'assistant', content: WELCOME_MSG(user.name), id: Date.now() }]);
    } catch(e) { console.error(e); }
    finally { setCheckingAccess(false); }
  };

  const clearChat = () => {
    if (!confirm('Clear chat history?')) return;
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setMessages([{ role: 'assistant', content: WELCOME_MSG(user.name), id: Date.now() }]);
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
        messages: newMessages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
      });
      const { reply, links } = response.data;
      setMessages(prev => [...prev, { role: 'assistant', content: reply, links: links || [], id: Date.now() + 1 }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.', links: [], id: Date.now() + 1 }]);
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
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--purple);text-decoration:underline;word-break:break-all">$1 ↗</a>')
      .replace(/^### (.*$)/gm, '<h4 style="color:var(--text);font-size:13px;font-weight:700;margin:12px 0 6px">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 style="color:var(--text);font-size:14px;font-weight:700;margin:14px 0 8px">$1</h3>')
      .replace(/^- (.*$)/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
      .replace(/(<li.*<\/li>)/gs, '<ul style="margin:8px 0;padding-left:16px;list-style:disc">$1</ul>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const st = {
    page: { padding: '32px 40px', maxWidth: 920, margin: '0 auto', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column' },
    header: { marginBottom: 16, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 },
    badge: { background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.5px' },
    sub: { fontSize: 13, color: 'var(--text2)' },
    chatWrap: { flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 12 },
    msgRow: (role) => ({ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-start' }),
    avatar: (role) => ({ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: role === 'user' ? 'var(--purple)' : 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }),
    bubble: (role) => ({ maxWidth: '78%', padding: '12px 16px', borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: role === 'user' ? 'var(--purple)' : 'var(--surface2)', border: role === 'user' ? 'none' : '1px solid var(--border)', color: role === 'user' ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.65 }),
    suggestions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 },
    chip: { padding: '7px 14px', borderRadius: 20, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: 500 },
    inputRow: { display: 'flex', gap: 10, flexShrink: 0 },
    input: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', fontFamily: 'Sora,sans-serif', outline: 'none', resize: 'none', lineHeight: 1.5 },
    sendBtn: { width: 48, height: 48, borderRadius: 12, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-6px);opacity:1} }
        .suggestion-chip:hover { background: var(--purple-dim) !important; border-color: var(--purple) !important; color: var(--purple) !important; }
        .chat-input:focus { border-color: var(--purple) !important; }
        .link-btn:hover { background: var(--purple-dim) !important; border-color: var(--purple) !important; }
        .clear-btn:hover { color: var(--red) !important; border-color: var(--red) !important; }
      `}</style>
      <div style={st.page}>
        <div style={st.header}>
          <div>
            <div style={st.title}>🤖 AI Tutor <span style={st.badge}>PRO</span></div>
            <div style={st.sub}>Reads your real study data · Web search for resources · Powered by LLaMA 3.3</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{messages.length > 1 ? `${messages.length - 1} messages` : ''}</span>
            <button className="clear-btn" onClick={clearChat} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}>🗑 Clear</button>
          </div>
        </div>

        <div style={st.chatWrap}>
          {messages.map((msg) => (
            <div key={msg.id} style={st.msgRow(msg.role)}>
              {msg.role === 'assistant' && <div style={st.avatar('assistant')}>🤖</div>}
              <div style={{ maxWidth: '78%' }}>
                <div style={st.bubble(msg.role)}>
                  {msg.role === 'assistant'
                    ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}/>
                    : msg.content}
                </div>

                {/* Resource links */}
                {msg.role === 'assistant' && msg.links && msg.links.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>📎 Resources & Links</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {msg.links.slice(0, 8).map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="link-btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', textDecoration: 'none', transition: 'all .15s', cursor: 'pointer' }}>
                          🔗 {link.title.length > 40 ? link.title.slice(0, 40) + '...' : link.title}
                        </a>
                      ))}
                    </div>

                    {/* Download as PDF button */}
                    <button
                      onClick={() => downloadAsPDF(msg.content)}
                      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 12, background: 'var(--teal-dim)', border: '1px solid rgba(45,212,191,0.3)', color: 'var(--teal)', cursor: 'pointer', marginTop: 2, transition: 'all .15s' }}>
                      ⬇️ Download as PDF
                    </button>
                  </div>
                )}

                {/* Download button for any long AI response */}
                {msg.role === 'assistant' && (!msg.links || msg.links.length === 0) && msg.content.length > 300 && (
                  <button
                    onClick={() => downloadAsPDF(msg.content)}
                    style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer' }}>
                    ⬇️ Download response
                  </button>
                )}
              </div>
              {msg.role === 'user' && <div style={st.avatar('user')}>{(userName || 'U')[0].toUpperCase()}</div>}
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

        {messages.length <= 1 && (
          <div style={st.suggestions}>
            {SUGGESTIONS.map(suggestion => (
              <button key={suggestion} className="suggestion-chip" style={st.chip} onClick={() => sendMessage(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}

        <div style={st.inputRow}>
          <textarea
            ref={inputRef} className="chat-input" style={st.input} rows={1}
            placeholder="Ask anything — resources, topper copies, study plans, subject advice..."
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          />
          <button style={{ ...st.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }} onClick={() => sendMessage()} disabled={loading || !input.trim()}>→</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          Press Enter to send · Chat history saved · Web search enabled for resources & links
        </div>
      </div>
    </>
  );
}