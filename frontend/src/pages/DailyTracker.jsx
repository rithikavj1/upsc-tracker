import { useState, useEffect, useRef } from 'react';
import api from '../api';

const DEFAULT_SUBJECTS = ['Polity','History','Geography','Economics','Environment','Science & Tech','Current Affairs','CSAT'];
const SLOTS = ['Morning (5–8 AM)','Pre-noon (9–11:30 AM)','Afternoon (2–5 PM)','Evening (7–9 PM)'];
const DEFAULT_SLOTS = ['Morning (5–8 AM)','Pre-noon (9–11:30 AM)','Afternoon (2–5 PM)','Evening (7–9 PM)'];
const ACTIVITIES = ['Reading / Notes','MCQ Practice','Revision','Previous Year Questions','Mock Test','Newspaper Reading'];
const SUBJECT_COLORS = { 'Polity':'#7C6FFF','History':'#2DD4BF','Geography':'#378ADD','Economics':'#F59E0B','Environment':'#22D3A0','Science & Tech':'#D4537E','Current Affairs':'#639922','CSAT':'#888780' };
const POMO_MODES = { study: 25*60, short: 5*60, long: 15*60 };

export default function DailyTracker() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({ daily_hour_target: 8 });
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [slotHours, setSlotHours] = useState({});
  const [form, setForm] = useState({ subject: 'Polity', hours: '2', slot: SLOTS[0], activity_type: ACTIVITIES[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Pomodoro state
  const [pomoMode, setPomoMode] = useState('study');
  const [pomoTime, setPomoTime] = useState(25*60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoCount, setPomoCount] = useState(0);
  const timerRef = useRef(null);

  const load = async () => {
    const [d, s] = await Promise.all([
      api.get(`/overview/daily?date=${date}`),
      api.get('/targets/settings'),
    ]);
    setData(d.data);
    setSettings(s.data);
    if (s.data?.subjects && s.data.subjects.length > 0) {
      setSubjects(s.data.subjects.map(sub => sub.name));
    }
    if (s.data?.slots && s.data.slots.length > 0) {
      const enabledSlots = s.data.slots.filter(sl => sl.enabled);
      const slotLabels = enabledSlots.map(sl => {
        const fmt = t => {
          const [h,m] = t.split(':');
          const hr = parseInt(h);
          return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}`;
        };
        return `${sl.label} (${fmt(sl.start)}–${fmt(sl.end)})`;
      });
      setSlots(slotLabels);
      const hoursMap = {};
      enabledSlots.forEach((sl, i) => {
        const [sh,sm] = sl.start.split(':').map(Number);
        const [eh,em] = sl.end.split(':').map(Number);
        const hrs = ((eh*60+em)-(sh*60+sm))/60;
        hoursMap[slotLabels[i]] = hrs;
      });
      setSlotHours(hoursMap);
    }
  };

  useEffect(() => { load(); }, [date]);

  // Pomodoro timer effect
  useEffect(() => {
    if (pomoRunning) {
      timerRef.current = setInterval(() => {
        setPomoTime(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setPomoRunning(false);
            if (pomoMode === 'study') {
              setPomoCount(c => {
                const newCount = c + 1;
                const nextMode = newCount % 4 === 0 ? 'long' : 'short';
                setPomoMode(nextMode);
                setPomoTime(POMO_MODES[nextMode]);
                return newCount;
              });
            } else {
              setPomoMode('study');
              setPomoTime(POMO_MODES.study);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [pomoRunning, pomoMode]);

  const fmtPomo = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const submit = async e => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      await api.post('/sessions', { ...form, date, hours: parseFloat(form.hours) });
      setMsg('✅ Session logged!'); setForm(f => ({ ...f, notes: '' }));
      load();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Error')); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    await api.delete(`/sessions/${id}`); load();
  };

  const totalHours = parseFloat(data?.summary?.total_hours || 0);
  const target = parseFloat(settings?.daily_hour_target || 8);
  const pct = Math.min(100, Math.round((totalHours / target) * 100));

  const pomoColor = pomoMode==='study' ? 'var(--purple)' : pomoMode==='short' ? 'var(--teal)' : 'var(--green)';
  const pomoDots = pomoCount % 4 || (pomoCount > 0 && pomoCount % 4 === 0 ? 4 : 0);

  const inp = { width:'100%', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--text)', outline:'none' };
  const lbl = { display:'block', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 };

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px' }}>Daily Tracker</h1>
          <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Log your study sessions for the day</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inp, width:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:12 }} />
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Hours logged', v:`${totalHours}`, s:`of ${target} hrs target`, c:'var(--purple)' },
          { l:'Sessions done', v:`${data?.summary?.session_count || 0}`, s:'today', c:'var(--teal)' },
          { l:'Subjects covered', v:`${data?.bySubject?.length || 0}`, s:'different topics', c:'var(--amber)' },
          { l:'Completion', v:`${pct}%`, s:pct >= 100 ? 'Target achieved! 🎉' : 'Keep going!', c:'var(--green)' },
        ].map(m => (
          <div key={m.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{m.l}</div>
            <div style={{ fontSize:22, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:m.c }}>{m.v}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{m.s}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16, marginBottom:16 }}>
        {/* Sessions list */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Today's sessions</div>
          {data?.sessions?.length === 0 && (
            <p style={{ fontSize:13, color:'var(--text3)', padding:'20px 0' }}>No sessions logged yet. Add one below!</p>
          )}
          {(data?.sessions || []).map(s => (
            <div key={s.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:SUBJECT_COLORS[s.subject]||'#7C6FFF', flexShrink:0 }}></div>
                  <span style={{ fontSize:13, fontWeight:500 }}>{s.subject}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, marginLeft:16 }}>{s.slot} · {s.activity_type}</div>
                {s.notes && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, marginLeft:16 }}>{s.notes}</div>}
              </div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text2)' }}>{s.hours}h</div>
              <select
                value={s.status || 'Done'}
                onChange={async (e) => {
                  await api.patch(`/sessions/${s.id}/status`, { status: e.target.value });
                  load();
                }}
                style={{
                  background: s.status==='Pending' ? 'rgba(245,158,11,0.15)' : s.status==='Carry Forward' ? 'rgba(124,111,255,0.15)' : 'rgba(34,211,160,0.15)',
                  color: s.status==='Pending' ? '#F59E0B' : s.status==='Carry Forward' ? '#7C6FFF' : '#22D3A0',
                  border: `1px solid ${s.status==='Pending' ? 'rgba(245,158,11,0.3)' : s.status==='Carry Forward' ? 'rgba(124,111,255,0.3)' : 'rgba(34,211,160,0.3)'}`,
                  borderRadius:8, padding:'4px 6px', fontSize:11, cursor:'pointer', outline:'none', fontWeight:500,
                }}
              >
                <option value="Done">✅ Done</option>
                <option value="Pending">⏳ Pending</option>
                <option value="Carry Forward">➡️ Carry Forward</option>
              </select>
              <button onClick={() => deleteSession(s.id)} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:14, cursor:'pointer', padding:4 }}>✕</button>
            </div>
          ))}
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Daily target</span>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text3)' }}>{totalHours} / {target} hrs</span>
            </div>
            <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--purple)', borderRadius:3, transition:'width 0.5s' }}></div>
            </div>
          </div>
        </div>

        {/* Subject breakdown */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Subject breakdown</div>
          {data?.bySubject?.length === 0 && <p style={{ fontSize:13, color:'var(--text3)' }}>No data yet</p>}
          {(data?.bySubject || []).map(s => {
            const maxH = Math.max(...(data?.bySubject || []).map(x => parseFloat(x.hours)), 1);
            const w = Math.round((parseFloat(s.hours) / maxH) * 100);
            const color = SUBJECT_COLORS[s.subject] || '#7C6FFF';
            return (
              <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}></div>
                <div style={{ flex:1, fontSize:12 }}>{s.subject}</div>
                <div style={{ width:80, height:4, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${w}%`, background:color, borderRadius:2 }}></div>
                </div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text2)', minWidth:30, textAlign:'right' }}>{s.hours}h</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log form + Pomodoro */}
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Log a study session</div>
          {msg && <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:16, fontSize:13, background: msg.startsWith('✅') ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
          <form onSubmit={submit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Subject</label>
                <select style={inp} value={form.subject} onChange={e => setForm(f => ({...f, subject:e.target.value}))}>
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Hours spent</label>
                <div style={{ ...inp, color:'var(--teal)', fontFamily:'JetBrains Mono,monospace', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                  ⏱ {form.hours} hrs
                  <span style={{ fontSize:10, color:'var(--text3)', fontWeight:400 }}>(auto from slot)</span>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Slot</label>
                <select style={inp} value={form.slot} onChange={e => setForm(f => ({
                  ...f, slot: e.target.value, hours: String(slotHours[e.target.value] || 2)
                }))}>
                  {slots.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Activity</label>
                <select style={inp} value={form.activity_type} onChange={e => setForm(f => ({...f, activity_type:e.target.value}))}>
                  {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Notes (optional)</label>
              <input style={inp} type="text" placeholder="e.g. Completed Ch.12, solved 30 MCQs" value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} />
            </div>
            <button type="submit" disabled={saving} style={{ width:'100%', background:'var(--purple)', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:500, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Saving...' : '+ Log Session'}
            </button>
          </form>
        </div>

        {/* 🍅 Pomodoro Timer */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>

          {/* Mode tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {[['study','🍅 Focus','25m'],['short','☕ Break','5m'],['long','🛌 Long','15m']].map(([mode,label,dur]) => (
              <button key={mode} onClick={() => {
                setPomoMode(mode);
                setPomoTime(POMO_MODES[mode]);
                setPomoRunning(false);
              }} style={{
                padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
                background: pomoMode===mode ? (mode==='study'?'var(--purple)':mode==='short'?'var(--teal)':'var(--green)') : 'var(--surface2)',
                border:`1px solid ${pomoMode===mode?(mode==='study'?'var(--purple)':mode==='short'?'var(--teal)':'var(--green)'):'var(--border2)'}`,
                color: pomoMode===mode ? '#fff' : 'var(--text3)',
                fontWeight: pomoMode===mode ? 500 : 400,
              }}>{label} {dur}</button>
            ))}
          </div>

          {/* Mode label */}
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
            {pomoMode==='study' ? 'Focus Time' : pomoMode==='short' ? 'Short Break' : 'Long Break'}
          </div>

          {/* Timer display */}
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:56, fontWeight:600, letterSpacing:4, marginBottom:8, color:pomoColor }}>
            {fmtPomo(pomoTime)}
          </div>

          {/* Subject */}
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>{form.subject}</div>

          {/* Pomodoro dots */}
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                width:10, height:10, borderRadius:'50%',
                background: i <= pomoDots ? 'var(--purple)' : 'var(--surface2)',
                border:'1px solid var(--border2)',
              }}/>
            ))}
            <span style={{ fontSize:10, color:'var(--text3)', marginLeft:4 }}>#{Math.floor(pomoCount)+1}</span>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <button onClick={() => setPomoRunning(r => !r)} style={{
              padding:'10px 22px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', color:'#fff', background:pomoColor,
            }}>
              {pomoRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button onClick={() => { setPomoRunning(false); setPomoTime(POMO_MODES[pomoMode]); }} style={{
              padding:'10px 14px', borderRadius:8, fontSize:13, background:'var(--surface2)', border:'1px solid var(--border2)', color:'var(--text)', cursor:'pointer'
            }}>Reset</button>
            <button onClick={() => {
              const studiedSecs = pomoCount * 25 * 60 + (pomoMode==='study' ? POMO_MODES.study - pomoTime : 0);
              const hrs = Math.round(studiedSecs / 3600 * 2) / 2 || 0.5;
              setForm(f => ({...f, hours: String(hrs)}));
            }} style={{
              padding:'10px 14px', borderRadius:8, fontSize:13, background:'var(--surface2)', border:'1px solid var(--border2)', color:'var(--green)', cursor:'pointer'
            }}>✓ Use</button>
          </div>

          <div style={{ fontSize:10, color:'var(--text3)' }}>
            {pomoCount} pomodoros · {(pomoCount * 25 / 60).toFixed(1)}h studied
          </div>
        </div>
      </div>
    </div>
  );
}