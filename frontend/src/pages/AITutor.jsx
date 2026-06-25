import { useState, useEffect, useRef } from 'react';
import api from '../api';

const CHAT_STORAGE_KEY = 'upsc_ai_chat_history';

const WELCOME_MSG = (name) => `Hi ${name || 'there'}! 👋 I'm your personal UPSC AI Tutor.

I have access to your real study data and a curated database of verified UPSC resources.

Ask me for:
- 📊 **Today's performance review** based on your actual sessions
- 📚 **Study resources** — monthly magazines, topper copies, NCERT PDFs with working links
- 🏆 **Topper strategies** — Tina Dabi, Srushti Deshmukh, Kanishak Kataria
- 🎯 **Personalized plans** based on your weak subjects

What would you like to work on today?`;

const SUGGESTIONS = [
  "Review my study progress today",
  "Monthly current affairs magazine links",
  "UPSC topper answer copies",
  "Which subject needs more attention?",
  "NCERT PDF download links",
  "Previous year question papers",
];

// ── Real PDF download using browser print ────────────────────────────────
const downloadAsPDF = (content, links = []) => {
  const clean = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1 → $2')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n');

  const linksHtml = links.length > 0
    ? `<div class="links-section">
        <h3>📎 Resources & Links</h3>
        ${links.map(l => `<a href="${l.url}" target="_blank">${l.title}</a>`).join('')}
       </div>`
    : '';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>UPSC AI Tutor — ${new Date().toLocaleDateString('en-IN')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 32px; color: #1a1a2e; line-height: 1.7; }
  .header { background: linear-gradient(135deg, #7C6FFF, #2DD4BF); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header .meta { font-size: 12px; opacity: 0.85; margin-top: 4px; }
  .content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
  .links-section { margin-top: 24px; padding: 16px; background: #f0efff; border-radius: 8px; border-left: 3px solid #7C6FFF; }
  .links-section h3 { font-size: 13px; color: #7C6FFF; margin-bottom: 12px; font-weight: 700; }
  .links-section a { display: block; color: #7C6FFF; text-decoration: none; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #e0deff; }
  .links-section a:last-child { border-bottom: none; }
  .footer { margin-top: 24px; font-size: 11px; color: #888; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <h1>🤖 UPSC AI Tutor Response</h1>
  <div class="meta">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · UPSC Tracker</div>
</div>
<div class="content">${clean}</div>
${linksHtml}
<div class="footer">UPSC Tracker · AI-powered personalized mentoring · upsc-tracker-ochre.vercel.app</div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
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
    if (messages.length > 0) localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
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
      setMessages([{ role: 'assistant', content: WELCOME_MSG(user.name), id: Date.now(), links: [] }]);
    } catch(e) { console.error(e); }
    finally { setCheckingAccess(false); }
  };

  const clearChat = () => {
    if (!confirm('Clear chat history?')) return;
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setMessages([{ role: 'assistant', content: WELCOME_MSG(user.name), id: Date.now(), links: [] }]);
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg, id: Date.now(), links: [] }];
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
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#7C6FFF;text-decoration:underline;font-weight:500">$1 ↗</a>')
      .replace(/^### (.*$)/gm, '<h4 style="color:var(--text);font-size:13px;font-weight:700;margin:12px 0 6px">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 style="color:var(--text);font-size:14px;font-weight:700;margin:14px 0 8px">$1</h3>')
      .replace(/^- (.*$)/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="margin:8px 0;padding-left:18px;list-style:disc">$1</ul>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const st = {
    page: { padding: '28px 40px', maxWidth: 920, margin: '0 auto', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' },
    title: { fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 },
    badge: { background: 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
    chatWrap: { flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 12 },
    msgRow: (role) => ({ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-start' }),
    avatar: (role) => ({ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: role === 'user' ? 'var(--purple)' : 'linear-gradient(135deg,#7C6FFF,#2DD4BF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }),
    bubble: (role) => ({ maxWidth: '78%', padding: '12px 16px', borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: role === 'user' ? 'var(--purple)' : 'var(--surface2)', border: role === 'user' ? 'none' : '1px solid var(--border)', color: role === 'user' ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.7 }),
    chip: { padding: '7px 14px', borderRadius: 20, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontWeight: 500 },
    input: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', fontFamily: 'Sora,sans-serif', outline: 'none', resize: 'none', lineHeight: 1.5 },
    sendBtn: { width: 48, height: 48, borderRadius: 12, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    typing: { display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', width: 'fit-content' },
    dot: (i) => ({ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', opacity: .4, animation: `bounce 1.2s ${i*0.2}s infinite` }),
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
        .s-chip:hover { background:var(--purple-dim)!important; border-color:var(--purple)!important; color:var(--purple)!important; }
        .chat-input:focus { border-color:var(--purple)!important; }
        .res-link:hover { background:var(--purple-dim)!important; border-color:var(--purple)!important; color:var(--purple)!important; }
        .dl-btn:hover { opacity:0.8; }
      `}</style>
      <div style={st.page}>
        {/* Header */}
        <div style={{ marginBottom: 16, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={st.title}>🤖 AI Tutor <span style={st.badge}>PRO</span></div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Real study data · Verified UPSC links · Powered by LLaMA 3.3</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {messages.length > 1 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{messages.length - 1} messages</span>}
            <button onClick={clearChat} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>🗑 Clear</button>
          </div>
        </div>

        {/* Chat */}
        <div style={st.chatWrap}>
          {messages.map((msg) => (
            <div key={msg.id} style={st.msgRow(msg.role)}>
              {msg.role === 'assistant' && <div style={st.avatar('assistant')}>🤖</div>}
              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Message bubble */}
                <div style={st.bubble(msg.role)}>
                  {msg.role === 'assistant'
                    ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}/>
                    : msg.content}
                </div>

                {/* Resource links panel */}
                {msg.role === 'assistant' && msg.links && msg.links.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
                      📎 Resources & Links ({msg.links.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {msg.links.slice(0, 10).map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="res-link"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 13, transition: 'all .15s', cursor: 'pointer' }}
                        >
                          <span style={{ flex: 1 }}>🔗 {link.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--purple)', marginLeft: 8, flexShrink: 0 }}>Open ↗</span>
                        </a>
                      ))}
                    </div>
                    <button
                      className="dl-btn"
                      onClick={() => downloadAsPDF(msg.content, msg.links)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--purple)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s' }}
                    >
                      ⬇️ Download as PDF
                    </button>
                  </div>
                )}

                {/* Download for long responses without links */}
                {msg.role === 'assistant' && (!msg.links || msg.links.length === 0) && msg.content.length > 400 && (
                  <button
                    className="dl-btn"
                    onClick={() => downloadAsPDF(msg.content, [])}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
                  >
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
                <div style={st.dot(0)}/><div style={st.dot(1)}/><div style={st.dot(2)}/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="s-chip" style={st.chip} onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <textarea
            ref={inputRef} className="chat-input" style={st.input} rows={1}
            placeholder="Ask for resources, topper copies, magazines, study plans..."
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          />
          <button style={{ ...st.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }} onClick={() => sendMessage()} disabled={loading || !input.trim()}>→</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          Enter to send · Chat saved · Verified UPSC links database
        </div>
      </div>
    </>
  );
}