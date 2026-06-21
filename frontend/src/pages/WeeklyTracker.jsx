import { useState, useEffect } from 'react';
import api from '../api';

const SUBJECT_COLORS = {
  'Polity':'#7C6FFF','History':'#2DD4BF','Geography':'#378ADD','Economics':'#F59E0B',
  'Environment':'#22D3A0','Science & Tech':'#D4537E','Current Affairs':'#639922','CSAT':'#888780',
  'Ethics':'#FB923C','Art & Culture':'#A78BFA','Ancient India':'#60A5FA','Medieval India':'#F87171',
  'Modern India':'#34D399','Physical Geo':'#FBBF24','Indian Geo':'#E879F9',
};
const getColor = s => SUBJECT_COLORS[s] || '#7C6FFF';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EXAM_TYPES = ['Prelims','Mains','CSAT'];
const PAPERS = ['GS1','GS2','GS3','GS4','CSAT','Essay','Optionals'];
const RESOURCE_TYPES = ['PDF','Book','Video','Notes','Online','Practice Set'];
const DEFAULT_SLOTS = ['Morning (5-8 AM)','Pre-noon (9-11:30 AM)','Afternoon (2-5 PM)','Evening (7-9 PM)'];
const DEFAULT_SESSIONS = ['Morning','Pre-noon','Afternoon','Evening'];

function getWeekDates(month, year, weekNum) {
  const firstDay = new Date(year, month - 1, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const lastDay = new Date(year, month, 0);
  if (end > lastDay) end.setDate(lastDay.getDate());
  return { start, end };
}

function fmtDisplay(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
}

function fmtSlotLabel(sl) {
  try {
    const fmt = t => {
      const [h,m] = t.split(':');
      const hr = parseInt(h);
      return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}`;
    };
    return `${sl.label} (${fmt(sl.start)}-${fmt(sl.end)})`;
  } catch(e) { return sl.label; }
}

function DonutChart({ data, total, size=150 }) {
  const r=55, cx=size/2, cy=size/2;
  let offset = -Math.PI/2;
  const paths = data.map(s => {
    const frac = total > 0 ? s.hours/total : 0;
    const angle = frac * 2 * Math.PI;
    const x1=cx+r*Math.cos(offset), y1=cy+r*Math.sin(offset);
    const x2=cx+r*Math.cos(offset+angle), y2=cy+r*Math.sin(offset+angle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    offset += angle;
    return { d, color: getColor(s.subject), subject: s.subject, hours: s.hours };
  });
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {total === 0
          ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14"/>
          : paths.map((p,i) => <path key={i} d={p.d} stroke={p.color} strokeWidth="14" fill="none" strokeLinecap="butt"/>)
        }
      </svg>
      <div style={{ position:'absolute', textAlign:'center' }}>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, fontWeight:600 }}>{total.toFixed(0)}h</div>
        <div style={{ fontSize:9, color:'var(--text3)' }}>total</div>
      </div>
    </div>
  );
}

function AddSessionModal({ onClose, onSave, weekNum, savedSubjects, savedSlots }) {
  const slotOptions = (savedSlots && savedSlots.length > 0)
    ? savedSlots.map(sl => fmtSlotLabel(sl))
    : DEFAULT_SLOTS;
  const sessionOptions = (savedSlots && savedSlots.length > 0)
    ? savedSlots.map(sl => sl.label)
    : DEFAULT_SESSIONS;
  const subjectList = (savedSubjects && savedSubjects.length > 0)
    ? savedSubjects.map(s => s.name)
    : Object.keys(SUBJECT_COLORS);

  const [form, setForm] = useState({
    session_date:'', block_type:'Weekday',
    time_slot: slotOptions[0] || '',
    session_name: sessionOptions[0] || 'Morning',
    exam_type:'Prelims', paper:'GS1',
    subject: subjectList[0] || 'Polity',
    module:'', topic:'', sub_topic:'',
    resource_type:'PDF', resource_name:'', hours:'2', notes:'',
  });

  const inp = { width:'100%', background:'#1C2030', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, padding:'8px 10px', fontSize:12, color:'#F1F3F9', outline:'none', fontFamily:'inherit' };
  const lbl = { display:'block', fontSize:10, color:'#555D75', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };
  const row2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 };

  const handleSave = () => {
    if (!form.session_date) { alert('Please select a date!'); return; }
    if (!form.subject) { alert('Please select a subject!'); return; }
    onSave(form);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#14171F', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:28, width:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:600 }}>Add Session — Week {weekNum}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8B91A8', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <div style={row2}>
          <div><label style={lbl}>Date</label>
            <input type="date" value={form.session_date} onChange={e=>setForm(f=>({...f,session_date:e.target.value}))} style={inp}/>
          </div>
          <div><label style={lbl}>Block type</label>
            <select value={form.block_type} onChange={e=>setForm(f=>({...f,block_type:e.target.value}))} style={inp}>
              <option>Weekday</option>
              <option>Weekend</option>
            </select>
          </div>
        </div>

        <div style={row2}>
          <div><label style={lbl}>Time slot</label>
            <select value={form.time_slot} onChange={e=>setForm(f=>({...f,time_slot:e.target.value}))} style={inp}>
              {slotOptions.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Session</label>
            <select value={form.session_name} onChange={e=>setForm(f=>({...f,session_name:e.target.value}))} style={inp}>
              {sessionOptions.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={row2}>
          <div><label style={lbl}>Exam type</label>
            <select value={form.exam_type} onChange={e=>setForm(f=>({...f,exam_type:e.target.value}))} style={inp}>
              {EXAM_TYPES.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Paper</label>
            <select value={form.paper} onChange={e=>setForm(f=>({...f,paper:e.target.value}))} style={inp}>
              {PAPERS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={row2}>
          <div><label style={lbl}>Subject</label>
            <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} style={inp}>
              {subjectList.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Hours</label>
            <input type="number" min="0.5" max="8" step="0.5" value={form.hours} onChange={e=>setForm(f=>({...f,hours:e.target.value}))} style={inp}/>
          </div>
        </div>

        <div style={{ marginBottom:10 }}><label style={lbl}>Module</label>
          <input value={form.module} onChange={e=>setForm(f=>({...f,module:e.target.value}))} placeholder="e.g. Ancient India" style={inp}/>
        </div>
        <div style={{ marginBottom:10 }}><label style={lbl}>Topic</label>
          <input value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))} placeholder="e.g. Indus Valley Civilisation" style={inp}/>
        </div>
        <div style={{ marginBottom:10 }}><label style={lbl}>Sub-topic</label>
          <input value={form.sub_topic} onChange={e=>setForm(f=>({...f,sub_topic:e.target.value}))} placeholder="e.g. Harappa & Mohenjo-daro" style={inp}/>
        </div>

        <div style={row2}>
          <div><label style={lbl}>Resource type</label>
            <select value={form.resource_type} onChange={e=>setForm(f=>({...f,resource_type:e.target.value}))} style={inp}>
              {RESOURCE_TYPES.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Resource name / file</label>
            <input value={form.resource_name} onChange={e=>setForm(f=>({...f,resource_name:e.target.value}))} placeholder="e.g. Spectrum_Ch1.pdf" style={inp}/>
          </div>
        </div>

        <div style={{ marginBottom:20 }}><label style={lbl}>Notes</label>
          <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes..." style={inp}/>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#8B91A8', fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:2, padding:'10px', background:'#7C6FFF', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Add Session</button>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyTracker() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeWeek, setActiveWeek] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [savedSlots, setSavedSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sess, settings] = await Promise.all([
        api.get(`/weekly?month=${month}&year=${year}`),
        api.get('/targets/settings'),
      ]);
      setSessions(sess.data || []);
      if (settings.data?.subjects) setSavedSubjects(settings.data.subjects);
      if (settings.data?.slots) setSavedSlots(settings.data.slots.filter(sl => sl.enabled));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const addSession = async (form) => {
    try {
      await api.post('/weekly', { ...form, week_number: activeWeek });
      setShowModal(false);
      load();
    } catch(e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
  };

  const toggleComplete = async (id) => {
    await api.patch(`/weekly/${id}/complete`);
    load();
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    await api.delete(`/weekly/${id}`);
    load();
  };

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const weekSessions = sessions.filter(s => s.week_number === activeWeek);
  const totalHours = weekSessions.reduce((a,s)=>a+parseFloat(s.hours||0),0);
  const weekdayHours = weekSessions.filter(s=>s.block_type==='Weekday').reduce((a,s)=>a+parseFloat(s.hours||0),0);
  const weekendHours = weekSessions.filter(s=>s.block_type==='Weekend').reduce((a,s)=>a+parseFloat(s.hours||0),0);
  const completedCount = weekSessions.filter(s=>s.completed).length;

  const subjectMap = {};
  weekSessions.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject]||0) + parseFloat(s.hours||0); });
  const subjectData = Object.entries(subjectMap).map(([subject,hours])=>({subject,hours})).sort((a,b)=>b.hours-a.hours);
  const maxHrs = Math.max(...subjectData.map(s=>s.hours), 1);

  const { start, end } = getWeekDates(month, year, activeWeek);
  const card = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 };
  const secTitle = { fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 };

  return (
    <div style={{ padding:'28px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px' }}>Weekly Tracker</h1>
          <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Plan and track your weekly study schedule</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 12px' }}>
            <button onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>←</button>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, minWidth:120, textAlign:'center' }}>{MONTHS[month-1]} {year}</span>
            <button onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>→</button>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background:'#7C6FFF', color:'#fff', border:'none', borderRadius:9, padding:'10px 20px', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            + Add Session
          </button>
        </div>
      </div>

      {/* Week tabs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
        {[1,2,3,4].map(w => {
          const {start:ws, end:we} = getWeekDates(month, year, w);
          const wSess = sessions.filter(s=>s.week_number===w);
          const wHrs = wSess.reduce((a,s)=>a+parseFloat(s.hours||0),0);
          return (
            <button key={w} onClick={()=>setActiveWeek(w)} style={{
              padding:'12px', borderRadius:10, cursor:'pointer', textAlign:'left',
              background: activeWeek===w ? 'var(--purple)' : 'var(--surface)',
              border:`1px solid ${activeWeek===w?'var(--purple)':'var(--border)'}`,
              color: activeWeek===w ? '#fff' : 'var(--text2)',
            }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>Week {w}</div>
              <div style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', opacity:0.8 }}>{fmtDisplay(ws)} – {fmtDisplay(we)}</div>
              <div style={{ fontSize:11, marginTop:4 }}>{wHrs.toFixed(1)}h · {wSess.length} sessions</div>
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { l:'Total hours', v:`${totalHours.toFixed(1)}h`, s:`Week ${activeWeek}`, c:'var(--purple)' },
          { l:'Weekday hours', v:`${weekdayHours.toFixed(1)}h`, s:`${weekSessions.filter(s=>s.block_type==='Weekday').length} sessions`, c:'var(--teal)' },
          { l:'Weekend hours', v:`${weekendHours.toFixed(1)}h`, s:`${weekSessions.filter(s=>s.block_type==='Weekend').length} sessions`, c:'var(--amber)' },
          { l:'Completed', v:`${completedCount}/${weekSessions.length}`, s:`${weekSessions.length>0?Math.round(completedCount/weekSessions.length*100):0}% done`, c:'var(--green)' },
        ].map(m => (
          <div key={m.l} style={{ ...card, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:m.c }}></div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{m.l}</div>
            <div style={{ fontSize:22, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:m.c }}>{m.v}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:16, marginBottom:16 }}>

        {/* Sessions table */}
        <div style={card}>
          <div style={secTitle}>Week {activeWeek} — {fmtDisplay(start)} to {fmtDisplay(end)}</div>
          {loading && <div style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Loading...</div>}
          {!loading && weekSessions.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--text3)' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📅</div>
              <div style={{ fontSize:14, marginBottom:4 }}>No sessions for Week {activeWeek}</div>
              <div style={{ fontSize:12 }}>Click "+ Add Session" to plan your week</div>
            </div>
          )}
          {weekSessions.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border2)' }}>
                    {['Date','Type','Slot','Subject','Topic','Resource','Hrs','✓'].map(h => (
                      <th key={h} style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', padding:'0 8px 10px 0', textAlign:'left', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekSessions.map(s => {
                    const color = getColor(s.subject);
                    const isWE = s.block_type==='Weekend';
                    const dateStr = s.session_date ? s.session_date.slice(8,10)*1+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(s.session_date.slice(5,7))-1] : '—';
                    return (
                      <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', opacity:s.completed?0.6:1 }}>
                        <td style={{ padding:'8px 8px 8px 0', whiteSpace:'nowrap' }}>
                          <div style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--text2)' }}>{dateStr}</div>
                          <div style={{ fontSize:9, marginTop:2, color:isWE?'var(--amber)':'var(--teal)', background:isWE?'rgba(245,158,11,0.1)':'rgba(45,212,191,0.1)', padding:'1px 5px', borderRadius:4, display:'inline-block' }}>{s.block_type}</div>
                        </td>
                        <td style={{ padding:'8px 8px 8px 0' }}>
                          <span style={{ fontSize:10, color:s.exam_type==='Prelims'?'var(--purple)':'var(--teal)', background:s.exam_type==='Prelims'?'var(--purple-dim)':'var(--teal-dim)', padding:'2px 6px', borderRadius:5 }}>{s.exam_type}</span>
                        </td>
                        <td style={{ padding:'8px 8px 8px 0', maxWidth:120 }}>
  <div style={{ fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }} title={s.time_slot}>{s.time_slot}</div>
</td>
                        <td style={{ padding:'8px 8px 8px 0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }}></div>
                            <span style={{ fontSize:12, whiteSpace:'nowrap' }}>{s.subject}</span>
                          </div>
                          {s.module && <div style={{ fontSize:10, color:'var(--text3)' }}>{s.module}</div>}
                        </td>
                        <td style={{ padding:'8px 8px 8px 0', maxWidth:140 }}>
                          <div style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.topic}</div>
                          {s.sub_topic && <div style={{ fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.sub_topic}</div>}
                        </td>
                       <td style={{ padding:'8px 8px 8px 0', maxWidth:120 }}>
  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
    {s.resource_type && (
      <span style={{ fontSize:9, color:'var(--purple)', background:'var(--purple-dim)', padding:'1px 6px', borderRadius:4, display:'inline-block', width:'fit-content' }}>
        {s.resource_type}
      </span>
    )}
    {s.resource_name && (
      <div style={{ fontSize:10, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }} title={s.resource_name}>
        {s.resource_name}
      </div>
    )}
    {!s.resource_name && !s.resource_type && (
      <span style={{ fontSize:10, color:'var(--text3)' }}>—</span>
    )}
  </div>
</td>
                        <td style={{ padding:'8px 8px 8px 0', fontFamily:'JetBrains Mono,monospace', fontSize:12, color, fontWeight:500 }}>{s.hours}h</td>
                        <td style={{ padding:'8px 0' }}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={()=>toggleComplete(s.id)} style={{ background:s.completed?'var(--green-dim)':'transparent', border:`1px solid ${s.completed?'var(--green)':'var(--border2)'}`, borderRadius:5, width:24, height:24, cursor:'pointer', fontSize:11, color:s.completed?'var(--green)':'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {s.completed?'✓':'○'}
                            </button>
                            <button onClick={()=>deleteSession(s.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:13 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={card}>
            <div style={secTitle}>Subject distribution</div>
            <DonutChart data={subjectData} total={totalHours} size={150}/>
            <div style={{ marginTop:12 }}>
              {subjectData.map(s => (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:getColor(s.subject), flexShrink:0 }}></div>
                  <div style={{ flex:1, fontSize:11 }}>{s.subject}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace' }}>{totalHours>0?Math.round(s.hours/totalHours*100):0}%</div>
                  <div style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:getColor(s.subject), minWidth:28, textAlign:'right' }}>{s.hours}h</div>
                </div>
              ))}
              {subjectData.length===0 && <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>No sessions yet</p>}
            </div>
          </div>

          <div style={card}>
            <div style={secTitle}>Hours per subject</div>
            {subjectData.map(s => (
              <div key={s.subject} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'var(--text2)' }}>{s.subject}</span>
                  <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:getColor(s.subject) }}>{s.hours}h</span>
                </div>
                <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.round(s.hours/maxHrs*100)}%`, background:getColor(s.subject), borderRadius:3, transition:'width 0.5s' }}></div>
                </div>
              </div>
            ))}
            {subjectData.length===0 && <p style={{ fontSize:12, color:'var(--text3)' }}>No sessions this week</p>}
          </div>
        </div>
      </div>

      {/* All 4 weeks overview */}
      <div style={card}>
        <div style={secTitle}>Monthly breakdown — all 4 weeks</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[1,2,3,4].map(w => {
            const {start:ws, end:we} = getWeekDates(month, year, w);
            const wSess = sessions.filter(s=>s.week_number===w);
            const wHrs = wSess.reduce((a,s)=>a+parseFloat(s.hours||0),0);
            const wDone = wSess.filter(s=>s.completed).length;
            const wWD = wSess.filter(s=>s.block_type==='Weekday').reduce((a,s)=>a+parseFloat(s.hours||0),0);
            const wWE = wSess.filter(s=>s.block_type==='Weekend').reduce((a,s)=>a+parseFloat(s.hours||0),0);
            const wSubs = [...new Set(wSess.map(s=>s.subject))];
            return (
              <div key={w} onClick={()=>setActiveWeek(w)} style={{
                background: activeWeek===w?'rgba(124,111,255,0.1)':'var(--surface2)',
                border:`1px solid ${activeWeek===w?'rgba(124,111,255,0.4)':'rgba(255,255,255,0.05)'}`,
                borderRadius:12, padding:14, cursor:'pointer',
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:activeWeek===w?'var(--purple)':'var(--text)', marginBottom:4 }}>Week {w}</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace', marginBottom:8 }}>{fmtDisplay(ws)} – {fmtDisplay(we)}</div>
                <div style={{ fontSize:20, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--purple)', marginBottom:6 }}>{wHrs.toFixed(1)}h</div>
                <div style={{ fontSize:10, color:'var(--teal)', marginBottom:3 }}>📅 {wWD.toFixed(0)}h weekday</div>
                <div style={{ fontSize:10, color:'var(--amber)', marginBottom:6 }}>🏖 {wWE.toFixed(0)}h weekend</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6 }}>{wSess.length} sessions · {wDone} done</div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {wSubs.slice(0,6).map(s=><div key={s} title={s} style={{ width:8, height:8, borderRadius:'50%', background:getColor(s) }}></div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <AddSessionModal
          weekNum={activeWeek}
          savedSubjects={savedSubjects}
          savedSlots={savedSlots}
          onClose={() => setShowModal(false)}
          onSave={addSession}
        />
      )}
    </div>
  );
}