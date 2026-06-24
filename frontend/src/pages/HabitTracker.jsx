import { useState, useEffect, useRef } from 'react';
import api from '../api';

const DEFAULT_ACTS = [
  { name: 'Entertainment', icon: '🎬', color: '#bb8fce' },
  { name: 'Movie Time',    icon: '🍿', color: '#ff6b6b' },
  { name: 'Family Time',  icon: '👨‍👩‍👧', color: '#82e0aa' },
  { name: 'Exercise',     icon: '🏃', color: '#4ecdc4' },
  { name: 'Social Media', icon: '📱', color: '#85c1e9' },
  { name: 'Other',        icon: '🎯', color: '#f7dc6f' },
];

function fmtMins(m) {
  if (!m) return '0m';
  const h = Math.floor(m / 60), min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h) return `${h}h`;
  return `${min}m`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function WeeklyChart({ days, logs, categories }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.offsetWidth - 32;
    const H = canvas.height = 160;
    ctx.clearRect(0, 0, W, H);
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c.color; });
    catMap['Study'] = '#7C6FFF';
    const stacks = days.map(d => {
      const key = dateKey(d);
      const dayLogs = logs.filter(l => l.date?.slice(0, 10) === key);
      const s = {};
      dayLogs.forEach(l => { s[l.category_name] = (s[l.category_name] || 0) + l.duration_minutes; });
      return s;
    });
    const maxTotal = Math.max(...stacks.map(s => Object.values(s).reduce((a, b) => a + b, 0)), 60);
    const pad = { l: 32, r: 8, t: 8, b: 24 };
    const bw = (W - pad.l - pad.r) / days.length;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const y = pad.t + (H - pad.t - pad.b) * (1 - f);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(fmtMins(Math.round(maxTotal * f)), pad.l - 4, y + 3);
    });
    stacks.forEach((s, i) => {
      let y = H - pad.b;
      Object.entries(s).forEach(([name, mins]) => {
        if (!mins) return;
        const bh = (mins / maxTotal) * (H - pad.t - pad.b);
        y -= bh;
        ctx.fillStyle = catMap[name] || '#888';
        ctx.beginPath();
        ctx.roundRect(pad.l + i * bw + bw * 0.15, y, bw * 0.7, bh, [3]);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(dayNames[days[i].getDay()], pad.l + i * bw + bw / 2, H - 4);
    });
  }, [days, logs, categories]);
  return <canvas ref={ref} style={{ width: '100%', display: 'block' }} />;
}

function DonutChart({ data, total }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 120; canvas.width = canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, r = 50, ir = 28;
    if (!total) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); return;
    }
    let start = -Math.PI / 2;
    data.forEach(({ color, mins }) => {
      if (!mins) return;
      const angle = (mins / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill(); start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2);
    ctx.fillStyle = '#17171f'; ctx.fill();
  }, [data, total]);
  return <canvas ref={ref} style={{ width: 120, height: 120 }} />;
}

export default function HabitTracker() {
  const [tab, setTab] = useState('today');
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedCat, setSelectedCat] = useState(null);
  const [duration, setDuration] = useState('');
  const [logDate, setLogDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0);
  const timerRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '🎯', color: '#7C6FFF' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([api.get('/habits/categories'), api.get('/habits/logs')]);
      setCategories(cRes.data); setLogs(lRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const fmtTimer = (s) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const stopTimer = () => { setTimerRunning(false); const m = Math.round(timerSecs/60); if (m>0) setDuration(String(m)); setTimerSecs(0); };
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const addDefaultCat = async (cat) => {
    try { const r = await api.post('/habits/categories', cat); setCategories(p => [...p, r.data]); }
    catch (e) { flash('❌ ' + e.message); }
  };

  const submitLog = async () => {
    if (!selectedCat || !duration) { flash('❌ Select a category and enter duration'); return; }
    setSubmitting(true);
    try {
      const r = await api.post('/habits/logs', { category_id: selectedCat.id, date: logDate, duration_minutes: parseInt(duration), notes });
      setLogs(p => [{ ...r.data, category_name: selectedCat.name, icon: selectedCat.icon, color: selectedCat.color }, ...p]);
      setDuration(''); setNotes(''); setSelectedCat(null); flash('✅ Logged!');
    } catch (e) { flash('❌ ' + (e.response?.data?.error || e.message)); } finally { setSubmitting(false); }
  };

  const deleteLog = async (id) => {
    try { await api.delete(`/habits/logs/${id}`); setLogs(p => p.filter(l => l.id !== id)); }
    catch (e) { flash('❌ ' + e.message); }
  };

  const addCat = async () => {
    if (!newCat.name) { flash('❌ Name required'); return; }
    try {
      const r = await api.post('/habits/categories', newCat);
      setCategories(p => [...p, r.data]); setNewCat({ name: '', icon: '🎯', color: '#7C6FFF' }); setShowAdd(false); flash('✅ Added!');
    } catch (e) { flash('❌ ' + e.message); }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete category and all its logs?')) return;
    try { await api.delete(`/habits/categories/${id}`); setCategories(p => p.filter(c => c.id !== id)); setLogs(p => p.filter(l => l.category_id !== id)); }
    catch (e) { flash('❌ ' + e.message); }
  };

  const getWeekDays = () => {
    const now = new Date(); const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  };
  const weekDays = getWeekDays();
  const weekLabel = `${weekDays[0].toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${weekDays[6].toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;

  const getMonthTarget = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1); };
  const monthTarget = getMonthTarget();
  const daysInMonth = new Date(monthTarget.getFullYear(), monthTarget.getMonth() + 1, 0).getDate();
  const monthLogs = logs.filter(l => l.date?.slice(0, 7) === `${monthTarget.getFullYear()}-${String(monthTarget.getMonth()+1).padStart(2,'0')}`);
  const monthTotals = {}; categories.forEach(c => { monthTotals[c.name] = 0; });
  monthLogs.forEach(l => { monthTotals[l.category_name] = (monthTotals[l.category_name] || 0) + l.duration_minutes; });
  const monthGrand = Object.values(monthTotals).reduce((a, b) => a + b, 0);
  const monthMax = Math.max(...Object.values(monthTotals), 1);

  const todayLogs = logs.filter(l => l.date?.slice(0, 10) === todayStr());
  const todayTotal = todayLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const catLogged = new Set(todayLogs.map(l => l.category_name));

  const renderCalendar = () => {
    const firstDay = (new Date(monthTarget.getFullYear(), monthTarget.getMonth(), 1).getDay() + 6) % 7;
    const cells = [];
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(h => cells.push(
      <div key={h} style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,.25)', padding:'6px 0', fontWeight:600 }}>{h}</div>
    ));
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    const td = todayStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${monthTarget.getFullYear()}-${String(monthTarget.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayLogs = logs.filter(l => l.date?.slice(0,10) === key);
      const isToday = key === td;
      const topLog = [...dayLogs].sort((a,b)=>b.duration_minutes-a.duration_minutes)[0];
      const accent = topLog?.color;
      cells.push(
        <div key={d} style={{ textAlign:'center', padding:'6px 2px', borderRadius:8, background: accent ? `${accent}22` : 'transparent', border: isToday ? '1px solid #7C6FFF' : accent ? `1px solid ${accent}44` : '1px solid transparent', fontSize:12, color: isToday ? '#7C6FFF' : 'rgba(255,255,255,.7)' }}>
          {d}
          {accent && <div style={{ width:4, height:4, borderRadius:'50%', background:accent, margin:'2px auto 0' }} />}
        </div>
      );
    }
    return cells;
  };

  const s = {
    card: { background:'#1e1e28', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:20 },
    inp: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--text,#e8e8f0)', width:'100%', boxSizing:'border-box', outline:'none' },
    label: { fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6, display:'block', fontWeight:600 },
    tabBtn: (a) => ({ background: a ? '#7C6FFF' : 'rgba(255,255,255,.04)', color: a ? '#fff' : 'rgba(255,255,255,.4)', border: a ? 'none' : '1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }),
    btn: (bg, col='#fff') => ({ background:bg, color:col, border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }),
    sec: { fontWeight:700, fontSize:11, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 },
    navBtn: { background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.5)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'7px 16px', fontSize:12, fontWeight:600, cursor:'pointer' },
  };

  if (loading) return <div style={{ padding:40, color:'rgba(255,255,255,.3)' }}>Loading...</div>;

  return (
    <div style={{ padding:'32px 40px', maxWidth:960, margin:'0 auto', fontFamily:'system-ui,sans-serif', color:'#e8e8f0' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.5px', marginBottom:4 }}>Habit Tracker</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.35)' }}>Track your non-study time · compare with study hours</p>
      </div>

      {msg && <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:13, background: msg.startsWith('✅') ? 'rgba(34,211,160,.1)' : 'rgba(239,68,68,.1)', color: msg.startsWith('✅') ? '#22D3A0' : '#EF4444', border:`1px solid ${msg.startsWith('✅') ? 'rgba(34,211,160,.2)' : 'rgba(239,68,68,.2)'}` }}>{msg}</div>}

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['today','📅 Today'],['weekly','📊 Weekly'],['monthly','📆 Monthly'],['manage','⚙️ Manage']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={s.tabBtn(tab===k)}>{l}</button>
        ))}
      </div>

      {/* ── TODAY ── */}
      {tab === 'today' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={s.card}>
              <div style={s.sec}>Pick Activity</div>
              {categories.length === 0 ? (
                <div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.3)', marginBottom:14 }}>Add your first categories:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {DEFAULT_ACTS.map(c => <button key={c.name} onClick={() => addDefaultCat(c)} style={{ ...s.btn(c.color), fontSize:12, padding:'7px 14px' }}>{c.icon} {c.name}</button>)}
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {categories.map(c => {
                    const sel = selectedCat?.id === c.id;
                    const todayMins = todayLogs.filter(l=>l.category_name===c.name).reduce((s,l)=>s+l.duration_minutes,0);
                    return (
                      <div key={c.id} onClick={() => setSelectedCat(sel ? null : c)} style={{ padding:'16px 10px', borderRadius:14, border:`1.5px solid ${sel ? c.color : 'rgba(255,255,255,.07)'}`, background: sel ? `${c.color}18` : 'rgba(255,255,255,.03)', cursor:'pointer', textAlign:'center', position:'relative', transition:'all .15s' }}>
                        {(sel || catLogged.has(c.name)) && <div style={{ position:'absolute', top:8, right:8, width:7, height:7, borderRadius:'50%', background:c.color, opacity: sel ? 1 : .5 }} />}
                        <div style={{ fontSize:26, marginBottom:6 }}>{c.icon}</div>
                        <div style={{ fontSize:12, fontWeight:600, color: sel ? c.color : 'rgba(255,255,255,.8)' }}>{c.name}</div>
                        {todayMins > 0 && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3 }}>{fmtMins(todayMins)} today</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCat && (
              <div style={s.card}>
                <div style={s.sec}>Log Session</div>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:`1px solid ${selectedCat.color}44`, marginBottom:16 }}>
                  <span style={{ fontSize:22 }}>{selectedCat.icon}</span>
                  <span style={{ fontWeight:600, color:selectedCat.color }}>{selectedCat.name}</span>
                </div>
                <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:14, marginBottom:14, textAlign:'center' }}>
                  <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:700, letterSpacing:2, color: timerRunning ? selectedCat.color : 'rgba(255,255,255,.8)', marginBottom:10 }}>{fmtTimer(timerSecs)}</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                    {!timerRunning
                      ? <button onClick={() => setTimerRunning(true)} style={{ ...s.btn(selectedCat.color), padding:'7px 18px', fontSize:12 }}>▶ Start Timer</button>
                      : <button onClick={stopTimer} style={{ ...s.btn('#EF4444'), padding:'7px 18px', fontSize:12 }}>⏹ Stop & Use</button>}
                    {timerSecs > 0 && !timerRunning && <button onClick={() => setTimerSecs(0)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.3)', borderRadius:10, padding:'7px 14px', fontSize:12, cursor:'pointer' }}>Reset</button>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label style={s.label}>Duration (mins)</label><input type='number' min='1' placeholder='e.g. 90' value={duration} onChange={e=>setDuration(e.target.value)} style={s.inp} /></div>
                  <div><label style={s.label}>Date</label><input type='date' value={logDate} onChange={e=>setLogDate(e.target.value)} style={s.inp} /></div>
                </div>
                <div style={{ marginBottom:14 }}><label style={s.label}>Notes (optional)</label><input type='text' placeholder='What did you watch / do?' value={notes} onChange={e=>setNotes(e.target.value)} style={s.inp} /></div>
                <button onClick={submitLog} disabled={submitting} style={{ ...s.btn(selectedCat.color), width:'100%' }}>{submitting ? 'Logging...' : '+ Log Activity'}</button>
              </div>
            )}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ ...s.card, textAlign:'center' }}>
              <div style={s.sec}>Today</div>
              <div style={{ fontSize:36, fontWeight:800, color:'#7C6FFF', letterSpacing:'-1px' }}>{fmtMins(todayTotal)}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:4 }}>non-study time logged</div>
            </div>
            <div style={s.card}>
              <div style={s.sec}>Today's Log</div>
              {todayLogs.length === 0
                ? <div style={{ fontSize:13, color:'rgba(255,255,255,.25)', textAlign:'center', padding:'20px 0' }}>Nothing logged yet</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {todayLogs.map(l => (
                      <div key={l.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.03)', borderLeft:`3px solid ${l.color}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:16 }}>{l.icon}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{l.category_name}</div>
                            {l.notes && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{l.notes}</div>}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:l.color }}>{fmtMins(l.duration_minutes)}</span>
                          <button onClick={() => deleteLog(l.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.2)', cursor:'pointer', fontSize:14 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        </div>
      )}

      {/* ── WEEKLY ── */}
      {tab === 'weekly' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => setWeekOffset(p=>p-1)} style={s.navBtn}>← Prev</button>
            <span style={{ fontSize:13, fontWeight:600 }}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(p=>p+1)} style={s.navBtn}>Next →</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
            {weekDays.map(d => {
              const key = dateKey(d); const isToday = key === todayStr();
              const dayLogs = logs.filter(l => l.date?.slice(0,10) === key);
              const total = dayLogs.reduce((s,l) => s+l.duration_minutes, 0);
              const dots = [...new Set(dayLogs.map(l => l.color))].slice(0,3);
              return (
                <div key={key} style={{ ...s.card, padding:'14px 10px', textAlign:'center', border: isToday ? '1px solid #7C6FFF44' : '1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:600, marginBottom:4 }}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</div>
                  <div style={{ fontSize:16, fontWeight:700, color: isToday ? '#7C6FFF' : 'rgba(255,255,255,.8)', marginBottom:8 }}>{d.getDate()}</div>
                  <div style={{ display:'flex', gap:3, justifyContent:'center', marginBottom:6 }}>
                    {dots.length > 0 ? dots.map((c,i) => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:c }} />) : <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.1)' }} />}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color: total ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)' }}>{total ? fmtMins(total) : '—'}</div>
                </div>
              );
            })}
          </div>
          <div style={s.card}>
            <div style={s.sec}>Daily Activity Chart</div>
            <WeeklyChart days={weekDays} logs={logs} categories={categories} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:14 }}>
              {categories.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(255,255,255,.4)' }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c.color }} />{c.icon} {c.name}
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sec}>Activity Breakdown</div>
            {categories.map(c => {
              const mins = weekDays.reduce((s,d) => s + logs.filter(l=>l.date?.slice(0,10)===dateKey(d)&&l.category_name===c.name).reduce((a,l)=>a+l.duration_minutes,0), 0);
              const wMax = Math.max(...categories.map(cat => weekDays.reduce((s,d)=>s+logs.filter(l=>l.date?.slice(0,10)===dateKey(d)&&l.category_name===cat.name).reduce((a,l)=>a+l.duration_minutes,0),0)), 1);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <span style={{ width:24, fontSize:16 }}>{c.icon}</span>
                  <span style={{ width:130, fontSize:13, color:'rgba(255,255,255,.6)' }}>{c.name}</span>
                  <div style={{ flex:1, height:8, background:'rgba(255,255,255,.05)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(mins/wMax)*100}%`, background:c.color, borderRadius:4 }} />
                  </div>
                  <span style={{ width:50, textAlign:'right', fontSize:13, fontWeight:700, color:c.color }}>{fmtMins(mins)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MONTHLY ── */}
      {tab === 'monthly' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => setMonthOffset(p=>p-1)} style={s.navBtn}>← Prev</button>
            <span style={{ fontSize:14, fontWeight:700 }}>{monthTarget.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</span>
            <button onClick={() => setMonthOffset(p=>p+1)} style={s.navBtn}>Next →</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20 }}>
            <div style={s.card}>
              <div style={s.sec}>{monthTarget.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>{renderCalendar()}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ ...s.card, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={s.sec}>Month Total</div>
                <DonutChart data={categories.map(c=>({color:c.color,mins:monthTotals[c.name]||0}))} total={monthGrand} />
                <div style={{ fontSize:28, fontWeight:800, color:'#7C6FFF', marginTop:12 }}>{fmtMins(monthGrand)}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:4 }}>across {[...new Set(monthLogs.map(l=>l.date?.slice(0,10)))].length} days</div>
              </div>
              <div style={s.card}>
                {categories.map(c => {
                  const mins = monthTotals[c.name]||0;
                  const pct = monthGrand ? ((mins/monthGrand)*100) : 0;
                  return (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }} />
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', flex:1 }}>{c.icon} {c.name}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:c.color }}>{Math.round(pct)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sec}>Activity Breakdown</div>
            {categories.map(c => {
              const mins = monthTotals[c.name]||0;
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <span style={{ width:24, fontSize:16 }}>{c.icon}</span>
                  <span style={{ width:130, fontSize:13, color:'rgba(255,255,255,.6)' }}>{c.name}</span>
                  <div style={{ flex:1, height:8, background:'rgba(255,255,255,.05)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(mins/monthMax)*100}%`, background:c.color, borderRadius:4 }} />
                  </div>
                  <span style={{ width:50, textAlign:'right', fontSize:13, fontWeight:700, color:c.color }}>{fmtMins(mins)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MANAGE ── */}
      {tab === 'manage' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Your Categories</div>
            <button onClick={() => setShowAdd(p=>!p)} style={s.btn('#7C6FFF')}>{showAdd ? '✕ Cancel' : '+ New Category'}</button>
          </div>
          {showAdd && (
            <div style={{ ...s.card, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:2, minWidth:150 }}><label style={s.label}>Name</label><input placeholder='e.g. Gaming' value={newCat.name} onChange={e=>setNewCat(p=>({...p,name:e.target.value}))} style={s.inp} /></div>
              <div><label style={s.label}>Icon</label>
                <select value={newCat.icon} onChange={e=>setNewCat(p=>({...p,icon:e.target.value}))} style={{ ...s.inp, width:80 }}>
                  {['🎬','🍿','👨‍👩‍👧','🏃','📚','📱','🎮','🎵','🍳','✈️','😴','🎨','🏋️','🧘','🛍️','🎯','⚽','🎲'].map(i=><option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Color</label><input type='color' value={newCat.color} onChange={e=>setNewCat(p=>({...p,color:e.target.value}))} style={{ ...s.inp, width:60, padding:4, cursor:'pointer' }} /></div>
              <button onClick={addCat} style={{ ...s.btn('#22D3A0'), whiteSpace:'nowrap' }}>✓ Add</button>
            </div>
          )}
          {categories.length === 0 && (
            <div style={s.card}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginBottom:12 }}>Quick add defaults:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {DEFAULT_ACTS.map(c => <button key={c.name} onClick={() => addDefaultCat(c)} style={{ ...s.btn(c.color), fontSize:12, padding:'7px 16px' }}>{c.icon} {c.name}</button>)}
              </div>
            </div>
          )}
          {categories.map(c => (
            <div key={c.id} style={{ ...s.card, display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft:`3px solid ${c.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:22 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:2 }}>{logs.filter(l=>l.category_id==c.id).length} sessions · {fmtMins(logs.filter(l=>l.category_id==c.id).reduce((s,l)=>s+l.duration_minutes,0))} total</div>
                </div>
              </div>
              <button onClick={() => deleteCat(c.id)} style={{ background:'none', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.3)', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}