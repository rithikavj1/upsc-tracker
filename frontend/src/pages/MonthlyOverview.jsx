import { useState, useEffect } from 'react';
import api from '../api';

export default function MonthlyOverview() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [targets, setTargets] = useState([]);
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/overview/monthly?month=${month}&year=${year}`),
      api.get(`/targets?month=${month}&year=${year}`),
      api.get('/targets/settings'),
    ]).then(([o, t, s]) => {
      setData(o.data);
      setTargets(t.data);
      if (s.data?.subjects && s.data.subjects.length > 0) {
        setSavedSubjects(s.data.subjects);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [month, year]);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const totalHours = parseFloat(data?.summary?.total_hours || 0);
  const targetTotal = targets.reduce((a,t) => a+parseFloat(t.target_hours||0), 0) || 0;
  const daysStudied = parseInt(data?.summary?.days_studied || 0);
  const pct = targetTotal > 0 ? Math.min(100, Math.round(totalHours/targetTotal*100)) : 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = month===now.getMonth()+1 && year===now.getFullYear();
  const daysLeft = isCurrentMonth ? daysInMonth - now.getDate() : 0;
  const monthName = new Date(year, month-1).toLocaleString('default',{month:'long'});
  const avgDaily = daysStudied > 0 ? (totalHours/daysStudied).toFixed(1) : '0';
  const bestDay = data?.byDay?.reduce((best,d)=>parseFloat(d.hours)>parseFloat(best?.hours||0)?d:best, null);

  // Calendar heatmap
  const byDayMap = {};
  (data?.byDay || []).forEach(d => { byDayMap[d.date] = parseFloat(d.hours); });
  const firstDay = new Date(year, month-1, 1).getDay();
  const heatCells = [];
  for (let i=0; i<firstDay; i++) heatCells.push(null);
  for (let d=1; d<=daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    heatCells.push({ day:d, hours: byDayMap[key] ?? -1 });
  }

  const heatColor = h => {
    if (h < 0) return 'var(--surface2)';
    if (h === 0) return 'var(--surface2)';
    if (h < 4) return '#6B5CE7';
    if (h < 6) return '#7C6FFF';
    if (h < 8) return '#9B8FFF';
    return '#B4AEFF';
  };

  // Subject rows
  const sessionMap = {};
  (data?.bySubject || []).forEach(s => { sessionMap[s.subject] = parseFloat(s.hours); });
  const targetMap = {};
  targets.forEach(t => { targetMap[t.subject] = parseFloat(t.target_hours||0); });

  const subjectRows = savedSubjects.length > 0
    ? savedSubjects.map(s => ({
        name: s.name,
        color: s.color || '#7C6FFF',
        done: sessionMap[s.name] || 0,
        target: targetMap[s.name] || 0,
      }))
    : (data?.bySubject || []).map(s => ({
        name: s.subject,
        color: '#7C6FFF',
        done: parseFloat(s.hours),
        target: targetMap[s.subject] || 0,
      }));

  const todayDay = now.getDate();

  return (
    <div style={{ padding:'32px 36px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px' }}>Monthly Overview</h1>
          <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Track monthly targets and subject-wise completion</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 12px' }}>
          <button onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>←</button>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, minWidth:110, textAlign:'center' }}>{monthName} {year}</span>
          <button onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>→</button>
        </div>
      </div>

      {loading ? <div style={{ color:'var(--text3)' }}>Loading...</div> : (<>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { l:'Target hours', v:targetTotal||'—', s:`For ${monthName} ${year}`, c:'var(--purple)' },
            { l:'Completed', v:`${totalHours}h`, s:`${Math.max(0,targetTotal-totalHours)}h remaining`, c:'var(--teal)' },
            { l:'Days studied', v:`${daysStudied}/${isCurrentMonth?now.getDate():daysInMonth}`, s:`${daysInMonth-daysStudied} rest days`, c:'var(--amber)' },
            { l:'Completion', v:`${pct}%`, s:isCurrentMonth?`${daysLeft} days left`:'Month ended', c:'var(--green)' },
          ].map(m => (
            <div key={m.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:m.c, borderRadius:'12px 12px 0 0' }}></div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{m.l}</div>
              <div style={{ fontSize:26, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:m.c }}>{m.v}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{m.s}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Calendar */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>
              Study Calendar — {monthName} {year}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d =>
                <div key={d} style={{ fontSize:9, color:'var(--text3)', textAlign:'center', fontWeight:600 }}>{d}</div>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {heatCells.map((cell, i) => {
                if (cell === null) return <div key={i}/>;
                const isToday2 = cell.day === todayDay && isCurrentMonth;
                const hasData = cell.hours > 0;
                return (
                  <div key={i} style={{
                    aspectRatio:'1', borderRadius:6,
                    background: heatColor(cell.hours),
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    boxShadow: isToday2 ? '0 0 0 2px #7C6FFF' : '0 1px 3px rgba(0,0,0,0.08)',
                    border:'1px solid var(--border)',
                    position:'relative',
                  }} title={`${cell.day}: ${cell.hours>=0?cell.hours+'h':'No data'}`}>
                    <div style={{
                      fontSize:10,
                      fontFamily:'JetBrains Mono,monospace',
                      color: hasData ? '#fff' : 'var(--text2)',
                      fontWeight: hasData ? 600 : 400,
                    }}>{cell.day}</div>
                    {hasData && (
                      <div style={{ fontSize:8, color:'rgba(255,255,255,0.85)', marginTop:1 }}>{cell.hours}h</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
              {[['var(--surface2)','Rest'],['#6B5CE7','<4h'],['#7C6FFF','4–6h'],['#9B8FFF','6–8h'],['#B4AEFF','8+h']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text3)' }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:c, border:'1px solid var(--border)' }}></div>{l}
                </span>
              ))}
            </div>
          </div>

          {/* Subject-wise completion */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>
              Subject-wise completion
            </div>
            {subjectRows.length === 0 && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>
                No subjects set yet.<br/>Go to Targets & Settings → Save all changes.
              </div>
            )}
            {subjectRows.map(s => {
              const sp = s.target > 0 ? Math.min(100, Math.round(s.done/s.target*100)) : 0;
              const pctColor = sp>=80?'var(--green)':sp>=50?'var(--amber)':'var(--red)';
              return (
                <div key={s.name} style={{ display:'grid', gridTemplateColumns:'10px 1fr 60px 1fr 44px', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }}></div>
                  <div style={{ fontSize:13 }}>{s.name}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text2)', textAlign:'right' }}>{s.done}/{s.target||'?'}</div>
                  <div style={{ height:5, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${sp}%`, background:s.color, borderRadius:3, transition:'width 0.4s' }}></div>
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:pctColor, textAlign:'right' }}>{sp}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          {[
            { icon:'📈', val:`${avgDaily} hrs`, label:'Daily average this month', color:'var(--green)' },
            {
              icon:'🏆',
              val: bestDay ? `${bestDay.hours}h` : '—',
              label: bestDay
                ? `Best day (${bestDay.date ? bestDay.date.slice(8,10)*1+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(bestDay.date.slice(5,7))-1] : ''})`
                : 'No sessions yet',
              color:'var(--amber)'
            },
            { icon:'📅', val:`${daysStudied}`, label:`Days studied out of ${isCurrentMonth?now.getDate():daysInMonth}`, color:'var(--purple)' },
          ].map(c => (
            <div key={c.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
              <div style={{ fontSize:20, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:c.color, marginBottom:4 }}>{c.val}</div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>{c.label}</div>
            </div>
          ))}
        </div>

      </>)}
    </div>
  );
}