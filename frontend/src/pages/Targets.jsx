import { useState, useEffect } from 'react';
import api from '../api';

const PRESET_COLORS = [
  '#7C6FFF','#2DD4BF','#378ADD','#F59E0B','#22D3A0',
  '#D4537E','#639922','#888780','#F87171','#FB923C',
  '#A78BFA','#34D399','#60A5FA','#FBBF24','#E879F9',
];

const DEFAULT_SUBJECTS = [
  { name:'Polity', color:'#7C6FFF', target:'' },
  { name:'History', color:'#2DD4BF', target:'' },
  { name:'Geography', color:'#378ADD', target:'' },
  { name:'Economics', color:'#F59E0B', target:'' },
  { name:'Environment', color:'#22D3A0', target:'' },
  { name:'Science & Tech', color:'#D4537E', target:'' },
  { name:'Current Affairs', color:'#639922', target:'' },
  { name:'CSAT', color:'#888780', target:'' },
];

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      width:42, height:24, borderRadius:12,
      background: checked ? '#7C6FFF' : 'var(--surface2)',
      position:'relative', cursor:'pointer', flexShrink:0, transition:'background 0.2s',
      border:'1px solid var(--border)',
    }}>
      <div style={{
        position:'absolute', width:18, height:18, background:'#fff',
        borderRadius:'50%', top:2, left: checked ? 20 : 2, transition:'left 0.2s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
      }}></div>
    </div>
  );
}

function ColorDot({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div onClick={() => setOpen(o=>!o)} style={{
        width:14, height:14, borderRadius:'50%', background:value,
        cursor:'pointer', border:'2px solid var(--border2)', marginTop:1
      }}/>
      {open && (
        <div style={{
          position:'absolute', top:20, left:0, zIndex:99,
          background:'var(--surface)', border:'1px solid var(--border2)',
          borderRadius:10, padding:10, width:160,
          boxShadow:'0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5, marginBottom:8 }}>
            {PRESET_COLORS.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); }} style={{
                width:22, height:22, borderRadius:4, background:c, cursor:'pointer',
                border: value===c ? '2px solid var(--text)' : '2px solid transparent'
              }}/>
            ))}
          </div>
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ width:'100%', height:28, border:'none', borderRadius:4, cursor:'pointer', background:'none' }}/>
        </div>
      )}
    </div>
  );
}

export default function Targets() {
  const now = new Date();
  const month = now.getMonth()+1, year = now.getFullYear();

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [done, setDone] = useState({});
  const [newSub, setNewSub] = useState({ name:'', color:'#7C6FFF' });

  const [slots, setSlots] = useState([
    { id:1, label:'Morning slot', start:'05:00', end:'08:00', enabled:true },
    { id:2, label:'Pre-noon slot', start:'09:00', end:'11:30', enabled:true },
    { id:3, label:'Afternoon slot', start:'14:00', end:'17:00', enabled:true },
    { id:4, label:'Evening slot', start:'19:00', end:'21:00', enabled:true },
  ]);
  const [newSlot, setNewSlot] = useState({ label:'', start:'06:00', end:'08:00' });
  const [showNewSlot, setShowNewSlot] = useState(false);

  const [monthlyGoals, setMonthlyGoals] = useState({ studyDays:26, restDays:5 });

  const [examDates, setExamDates] = useState([
    { id:1, label:'UPSC Prelims', date:'2026-05-25' },
    { id:2, label:'UPSC Mains', date:'2026-09-01' },
  ]);
  const [newExam, setNewExam] = useState({ label:'', date:'' });
  const [showNewExam, setShowNewExam] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/targets?month=${month}&year=${year}`),
      api.get('/targets/settings'),
      api.get(`/overview/monthly?month=${month}&year=${year}`),
    ]).then(([t, s, o]) => {
      const tmap = {};
      t.data.forEach(x => { tmap[x.subject] = x.target_hours; });
      if (s.data?.subjects && s.data.subjects.length > 0) {
        setSubjects(s.data.subjects.map(sub => ({
          ...sub,
          target: tmap[sub.name] !== undefined ? tmap[sub.name] : (sub.target || '')
        })));
      } else {
        setSubjects(DEFAULT_SUBJECTS.map(sub => ({ ...sub, target: tmap[sub.name] || '' })));
      }
      if (s.data?.slots_json) {
        try { setSlots(JSON.parse(s.data.slots_json)); } catch(e) {}
      }
      if (s.data?.exam_dates && s.data.exam_dates.length > 0) {
        setExamDates(s.data.exam_dates);
      }
      const dmap = {};
      (o.data?.bySubject || []).forEach(x => { dmap[x.subject] = parseFloat(x.hours); });
      setDone(dmap);
    }).catch(console.error);
  }, []);

  const dur = (s, e) => {
    const [sh,sm]=s.split(':').map(Number),[eh,em]=e.split(':').map(Number);
    const d=(((eh*60+em)-(sh*60+sm))/60);
    return d > 0 ? d : 0;
  };

  const totalSlotHours = slots
    .filter(sl => sl.enabled)
    .reduce((a, sl) => a + dur(sl.start, sl.end), 0);

  const countdown = d => {
    const diff = Math.ceil((new Date(d)-now)/(1000*60*60*24));
    if (diff<0) return 'Passed'; if (diff===0) return 'Today!';
    if (diff<30) return `${diff} days`; if (diff<365) return `~${Math.round(diff/30)} months`;
    return `~${Math.round(diff/365)}y`;
  };

  const saveAll = async () => {
    setSaving(true); setMsg('');
    try {
      await api.post('/targets', subjects.map(s => ({
        month, year, subject: s.name, target_hours: parseFloat(s.target||0)
      })));
      await api.put('/targets/settings', {
        daily_hour_target: totalSlotHours,
        morning_slot: slots[0]?.enabled ?? true,
        prenoon_slot: slots[1]?.enabled ?? true,
        afternoon_slot: slots[2]?.enabled ?? true,
        evening_slot: slots[3]?.enabled ?? true,
        subjects: subjects.map(s => ({ name:s.name, color:s.color, target:s.target })),
        slots: slots,
        exam_dates: examDates,
      });
      setMsg('✅ All changes saved!');
    } catch(e) {
      setMsg('❌ Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false); setTimeout(()=>setMsg(''),3000);
    }
  };

  const addSubject = () => {
    if (!newSub.name.trim()) return;
    setSubjects(p => [...p, { name:newSub.name.trim(), color:newSub.color, target:'' }]);
    setNewSub({ name:'', color:'#7C6FFF' });
  };

  // All styles use CSS variables so they work in both dark and light mode
  const inp = {
    background:'var(--surface2)',
    border:'1px solid var(--border2)',
    borderRadius:7, padding:'7px 10px', fontSize:13,
    color:'var(--text)', outline:'none', fontFamily:'inherit'
  };
  const card = {
    background:'var(--surface)',
    border:'1px solid var(--border)',
    borderRadius:14, padding:20
  };
  const secTitle = {
    fontSize:11, fontWeight:600, color:'var(--text3)',
    textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14
  };
  const totalTarget = subjects.reduce((a,s)=>a+parseFloat(s.target||0),0);
  const totalDays = parseInt(monthlyGoals.studyDays||0) + parseInt(monthlyGoals.restDays||0);

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Sora,sans-serif', color:'var(--text)', minHeight:'100vh', background:'var(--bg)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px', color:'var(--text)' }}>Targets & Settings</h1>
          <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Configure your monthly goals, daily slots and study plan</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {msg && <span style={{ fontSize:13, color:msg.startsWith('✅')?'var(--green)':'var(--red)' }}>{msg}</span>}
          <button onClick={saveAll} disabled={saving} style={{ background:'#7C6FFF', color:'#fff', border:'none', borderRadius:9, padding:'10px 24px', fontSize:13, fontWeight:500, cursor:'pointer', opacity:saving?0.7:1 }}>
            {saving?'Saving...':'Save all changes'}
          </button>
        </div>
      </div>

      {/* Top row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

        {/* Subjects */}
        <div style={{ ...card, display:'flex', flexDirection:'column', maxHeight:520 }}>
          <div style={secTitle}>Monthly subject targets (hours)</div>
          <div style={{ overflowY:'auto', flex:1, marginBottom:10, paddingRight:4 }}>
            {subjects.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <ColorDot value={s.color} onChange={c=>setSubjects(p=>p.map((x,j)=>j===i?{...x,color:c}:x))} />
                <input value={s.name} onChange={e=>setSubjects(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                  style={{ ...inp, flex:1, padding:'5px 8px', fontSize:13 }} />
                <input type="number" min="0" max="300" step="5" value={s.target} placeholder="0"
                  onChange={e=>setSubjects(p=>p.map((x,j)=>j===i?{...x,target:e.target.value}:x))}
                  style={{ ...inp, width:70, textAlign:'center', fontSize:12, fontFamily:'JetBrains Mono,monospace', padding:'5px 6px' }} />
                <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace', minWidth:50, textAlign:'right' }}>{done[s.name]||0}h done</span>
                <button onClick={()=>setSubjects(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:15, padding:2 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:10 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <ColorDot value={newSub.color} onChange={c=>setNewSub(s=>({...s,color:c}))} />
              <input value={newSub.name} placeholder="New subject name..."
                onChange={e=>setNewSub(s=>({...s,name:e.target.value}))}
                onKeyDown={e=>{ if(e.key==='Enter') addSubject(); }}
                style={{ ...inp, flex:1, padding:'6px 10px', fontSize:12 }} />
              <button onClick={addSubject}
                style={{ background:'rgba(124,111,255,0.15)', border:'1px solid rgba(124,111,255,0.3)', borderRadius:7, padding:'6px 14px', color:'#7C6FFF', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                + Add
              </button>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--text3)' }}>Total monthly target</span>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:14, fontWeight:600, color:'#7C6FFF' }}>{totalTarget} hrs</span>
            </div>
          </div>
        </div>

        {/* Daily Slots */}
        <div style={card}>
          <div style={secTitle}>Daily study slots</div>
          {slots.map((sl, i) => (
            <div key={sl.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <input value={sl.label} onChange={e=>setSlots(p=>p.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
                  style={{ ...inp, width:'100%', fontSize:12, padding:'4px 8px', marginBottom:4 }} />
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <input type="time" value={sl.start} onChange={e=>setSlots(p=>p.map((x,j)=>j===i?{...x,start:e.target.value}:x))}
                    style={{ ...inp, fontSize:11, padding:'3px 6px', flex:1 }} />
                  <span style={{ color:'var(--text3)', fontSize:11 }}>—</span>
                  <input type="time" value={sl.end} onChange={e=>setSlots(p=>p.map((x,j)=>j===i?{...x,end:e.target.value}:x))}
                    style={{ ...inp, fontSize:11, padding:'3px 6px', flex:1 }} />
                  <span style={{ fontSize:10, color: sl.enabled ? 'var(--teal)' : 'var(--text3)', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>
                    {dur(sl.start,sl.end).toFixed(1)}h
                  </span>
                </div>
              </div>
              <Toggle checked={sl.enabled} onChange={()=>setSlots(p=>p.map((x,j)=>j===i?{...x,enabled:!x.enabled}:x))} />
              <button onClick={()=>setSlots(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
          ))}

          {showNewSlot && (
            <div style={{ marginTop:10, background:'var(--surface2)', borderRadius:8, padding:10, border:'1px solid var(--border2)' }}>
              <input placeholder="Slot name e.g. Late night" value={newSlot.label}
                onChange={e=>setNewSlot(s=>({...s,label:e.target.value}))}
                style={{ ...inp, width:'100%', marginBottom:6, fontSize:12 }} />
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                <input type="time" value={newSlot.start} onChange={e=>setNewSlot(s=>({...s,start:e.target.value}))} style={{ ...inp, flex:1, fontSize:11, padding:'4px 6px' }} />
                <input type="time" value={newSlot.end} onChange={e=>setNewSlot(s=>({...s,end:e.target.value}))} style={{ ...inp, flex:1, fontSize:11, padding:'4px 6px' }} />
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>{
                  if(newSlot.label.trim()){
                    setSlots(p=>[...p,{id:Date.now(),...newSlot,enabled:true}]);
                    setNewSlot({label:'',start:'06:00',end:'08:00'});
                    setShowNewSlot(false);
                  }
                }} style={{ flex:1, background:'var(--teal)', border:'none', borderRadius:6, padding:'6px', color:'#fff', fontSize:12, cursor:'pointer' }}>Add</button>
                <button onClick={()=>setShowNewSlot(false)} style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:6, padding:'6px', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          <button onClick={()=>setShowNewSlot(s=>!s)} style={{ marginTop:10, width:'100%', background:'transparent', border:'1px dashed rgba(45,212,191,0.4)', borderRadius:7, padding:'7px', color:'var(--teal)', fontSize:12, cursor:'pointer' }}>
            + Add slot
          </button>

          <div style={{ marginTop:12, padding:'10px 14px', background:'var(--teal-dim)', border:'1px solid rgba(45,212,191,0.2)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Daily goal (auto-calculated)</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>Sum of all enabled slots</div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, fontWeight:600, color:'var(--teal)' }}>
                {totalSlotHours.toFixed(1)}
              </span>
              <span style={{ fontSize:12, color:'var(--text2)' }}>hrs / day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

        {/* Monthly Goals */}
        <div style={card}>
          <div style={secTitle}>Monthly goals</div>
          {[
            { label:'Study days goal', key:'studyDays', unit:'days', color:'#7C6FFF' },
            { label:'Total rest days', key:'restDays', unit:'days', color:'var(--teal)' },
          ].map(g => (
            <div key={g.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, color:'var(--text2)' }}>{g.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input type="number" min="0" max="31" value={monthlyGoals[g.key]}
                  onChange={e=>setMonthlyGoals(p=>({...p,[g.key]:e.target.value}))}
                  style={{ ...inp, width:60, textAlign:'center', fontSize:13, color:g.color, fontFamily:'JetBrains Mono,monospace', padding:'4px 6px' }} />
                <span style={{ fontSize:12, color:'var(--text3)', minWidth:28 }}>{g.unit}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, padding:'12px 14px', background:'var(--surface2)', borderRadius:8 }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>Monthly breakdown</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Study days</span>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'#7C6FFF' }}>{monthlyGoals.studyDays} days</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Rest days</span>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'var(--teal)' }}>{monthlyGoals.restDays} days</span>
            </div>
            <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', display:'flex' }}>
              <div style={{ height:'100%', width:`${Math.round(parseInt(monthlyGoals.studyDays||0)/31*100)}%`, background:'#7C6FFF', borderRadius:'3px 0 0 3px' }}></div>
              <div style={{ height:'100%', width:`${Math.round(parseInt(monthlyGoals.restDays||0)/31*100)}%`, background:'var(--teal)' }}></div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              <span style={{ fontSize:10, color:'var(--text3)' }}>Total: {totalDays} / 31 days</span>
              {totalDays > 31 && <span style={{ fontSize:10, color:'var(--red)' }}>⚠️ Exceeds 31 days!</span>}
              {totalDays <= 31 && <span style={{ fontSize:10, color:'var(--green)' }}>✓ Valid</span>}
            </div>
          </div>
        </div>

        {/* Exam Dates */}
        <div style={card}>
          <div style={secTitle}>Exam dates</div>
          {examDates.map((ex, i) => (
            <div key={ex.id} style={{ background:'var(--surface2)', borderRadius:9, padding:'10px 12px', marginBottom:8, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <input value={ex.label} onChange={e=>setExamDates(p=>p.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
                  style={{ ...inp, flex:1, fontSize:13, padding:'4px 8px', fontWeight:500 }} />
                <button onClick={()=>setExamDates(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, marginLeft:6 }}>✕</button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="date" value={ex.date} onChange={e=>setExamDates(p=>p.map((x,j)=>j===i?{...x,date:e.target.value}:x))}
                  style={{ ...inp, flex:1, fontSize:12, padding:'4px 8px' }} />
                {ex.date && <span style={{ fontSize:11, color:'var(--amber)', background:'var(--amber-dim)', padding:'3px 8px', borderRadius:7, fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{countdown(ex.date)}</span>}
              </div>
            </div>
          ))}
          {showNewExam && (
            <div style={{ background:'var(--surface2)', borderRadius:9, padding:10, marginBottom:8, border:'1px solid var(--border2)' }}>
              <input placeholder="Exam name" value={newExam.label} onChange={e=>setNewExam(x=>({...x,label:e.target.value}))}
                style={{ ...inp, width:'100%', marginBottom:6, fontSize:12 }} />
              <input type="date" value={newExam.date} onChange={e=>setNewExam(x=>({...x,date:e.target.value}))}
                style={{ ...inp, width:'100%', marginBottom:6, fontSize:12 }} />
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>{if(newExam.label&&newExam.date){setExamDates(p=>[...p,{id:Date.now(),...newExam}]);setNewExam({label:'',date:''});setShowNewExam(false);}}}
                  style={{ flex:1, background:'var(--amber)', border:'none', borderRadius:6, padding:'6px', color:'#fff', fontSize:12, cursor:'pointer' }}>Add</button>
                <button onClick={()=>setShowNewExam(false)} style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:6, padding:'6px', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          <button onClick={()=>setShowNewExam(s=>!s)} style={{ width:'100%', background:'transparent', border:'1px dashed rgba(245,158,11,0.4)', borderRadius:7, padding:'7px', color:'var(--amber)', fontSize:12, cursor:'pointer' }}>
            + Add exam
          </button>
        </div>

        {/* Exam Countdown */}
        <div style={card}>
          <div style={secTitle}>Exam countdown</div>
          {examDates.length === 0 && <p style={{ fontSize:13, color:'var(--text3)' }}>No exams added yet</p>}
          {examDates.map((ex) => {
            const diff = Math.ceil((new Date(ex.date) - now) / (1000*60*60*24));
            const pct = Math.max(0, Math.min(100, Math.round((365 - diff) / 365 * 100)));
            const barColor = diff < 30 ? 'var(--red)' : diff < 90 ? 'var(--amber)' : '#7C6FFF';
            return (
              <div key={ex.id} style={{ marginBottom:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'var(--text)' }}>{ex.label}</span>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:barColor }}>{countdown(ex.date)}</span>
                </div>
                <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:3, transition:'width 0.5s' }}></div>
                </div>
                {ex.date && <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>{ex.date}</div>}
              </div>
            );
          })}
          <div style={{ marginTop:8, padding:'10px 14px', background:'var(--purple-dim)', border:'1px solid rgba(124,111,255,0.2)', borderRadius:8 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Daily study capacity</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:600, color:'#7C6FFF' }}>{totalSlotHours.toFixed(1)}h</span>
              <span style={{ fontSize:12, color:'var(--text3)' }}>per day · {slots.filter(s=>s.enabled).length} active slots</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}