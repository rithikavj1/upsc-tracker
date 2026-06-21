import { useState, useEffect } from 'react';
import api from '../api';

const SUBJECT_COLORS = {
  'Polity':'#7C6FFF','History':'#2DD4BF','Geography':'#378ADD','Economics':'#F59E0B',
  'Environment':'#22D3A0','Science & Tech':'#D4537E','Current Affairs':'#639922','CSAT':'#888780',
  'Ethics':'#FB923C','Art & Culture':'#A78BFA',
};
const getColor = s => SUBJECT_COLORS[s] || '#7C6FFF';

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:18, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:color, borderRadius:'14px 14px 0 0' }}></div>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmtDate(now);
  const month = now.getMonth()+1, year = now.getFullYear();

  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [targets, setTargets] = useState([]);
  const [settings, setSettings] = useState({ daily_hour_target:8 });
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loadingDay, setLoadingDay] = useState(false);

  const [calMonth, setCalMonth] = useState(now.getMonth()+1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonthlyData, setCalMonthlyData] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([
      api.get(`/overview/daily?date=${today}`),
      api.get(`/overview/monthly?month=${month}&year=${year}`),
      api.get(`/targets?month=${month}&year=${year}`),
      api.get('/targets/settings'),
      api.get('/overview/streak'),
    ]).then(([d, m, t, s, str]) => {
      setDaily(d.data);
      setMonthly(m.data);
      setCalMonthlyData(m.data);
      setTargets(t.data);
      setSettings(s.data);
      setStreak(str.data.streak);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingDay(true);
    api.get(`/overview/daily?date=${selectedDate}`)
      .then(r => setSelectedDayData(r.data))
      .catch(console.error)
      .finally(() => setLoadingDay(false));
  }, [selectedDate]);

  useEffect(() => {
    if (calMonth === month && calYear === year) {
      setCalMonthlyData(monthly);
      return;
    }
    api.get(`/overview/monthly?month=${calMonth}&year=${calYear}`)
      .then(r => setCalMonthlyData(r.data))
      .catch(console.error);
  }, [calMonth, calYear, monthly]);

  const dHours = parseFloat(daily?.summary?.total_hours || 0);
  const dailyTarget = parseFloat(settings?.daily_hour_target || 8);
  const dailyPct = Math.min(100, Math.round((dHours / dailyTarget) * 100));
  const mHours = parseFloat(monthly?.summary?.total_hours || 0);
  const mTarget = targets.reduce((a,t) => a + parseFloat(t.target_hours||0), 0) || 0;
  const mPct = mTarget > 0 ? Math.min(100, Math.round((mHours/mTarget)*100)) : 0;
  const mDays = parseInt(monthly?.summary?.days_studied || 0);

  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDay = new Date(calYear, calMonth-1, 1).getDay();
  const byDayMap = {};
  (calMonthlyData?.byDay || []).forEach(d => { byDayMap[d.date] = parseFloat(d.hours); });
  const heatCells = [];
  for (let i=0; i<firstDay; i++) heatCells.push(null);
  for (let d=1; d<=daysInMonth; d++) {
    const key = `${calYear}-${pad(calMonth)}-${pad(d)}`;
    heatCells.push({ day:d, date:key, hours: byDayMap[key] ?? -1 });
  }

  const heatColor = h => {
    if (h < 0) return 'var(--surface2)';
    if (h === 0) return 'var(--surface2)';
    if (h < 4) return '#6B5CE7';
    if (h < 6) return '#7C6FFF';
    if (h < 8) return '#9B8FFF';
    return '#B4AEFF';
  };

  const prevCalMonth = () => { if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); };
  const nextCalMonth = () => { if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); };

  const greeting = now.getHours()<12?'morning':now.getHours()<17?'afternoon':'evening';
  const dayName = now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short',year:'numeric'});

  const selDateObj = new Date(selectedDate+'T00:00:00');
  const selDisplay = selDateObj.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const isToday = selectedDate === today;
  const selHours = parseFloat(selectedDayData?.summary?.total_hours || 0);
  const selSubjects = selectedDayData?.bySubject || [];
  const maxSelHrs = Math.max(...selSubjects.map(s=>parseFloat(s.hours)), 1);
  const calMonthName = new Date(calYear, calMonth-1).toLocaleString('default',{month:'long'});

  if (loading) return <div style={{ padding:40, color:'var(--text3)' }}>Loading dashboard...</div>;

  return (
    <div style={{ padding:'32px 36px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.5px' }}>
            Good {greeting}, {user.name?.split(' ')[0] || 'Rithika'} 👋
          </h1>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>
            {mPct >= 100 ? '100% through your' : `${mPct}% through your`} {now.toLocaleString('default',{month:'long'})} target. {mPct>=60?'Great progress!':'Stay consistent!'}
          </p>
        </div>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text2)', background:'var(--surface)', border:'1px solid var(--border)', padding:'6px 14px', borderRadius:20 }}>{dayName}</div>
      </div>

      {/* Streak */}
      <div style={{ background:'linear-gradient(135deg,rgba(124,111,255,0.2),rgba(45,212,191,0.1))', border:'1px solid rgba(124,111,255,0.3)', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <div style={{ fontSize:42, fontWeight:700, color:'var(--purple)', fontFamily:'JetBrains Mono,monospace', lineHeight:1 }}>{streak}</div>
        <div>
          <div style={{ fontSize:14, fontWeight:600 }}>Day Study Streak 🔥</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Monthly study days: {mDays} of {now.getDate()} · Target: 26/31 days</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <MetricCard label="Today studied" value={`${dHours}h`} sub={`Target: ${dailyTarget}h · ${dailyPct}% done`} color="var(--purple)"/>
        <MetricCard label="Monthly hours" value={mHours} sub={`Target: ${mTarget} hrs · ${mPct}%`} color="var(--teal)"/>
        <MetricCard label="Days studied" value={mDays} sub="This month" color="var(--amber)"/>
        <MetricCard label="Sessions today" value={daily?.summary?.session_count || 0} sub="Logged today" color="var(--green)"/>
      </div>

      {/* Main 2-col */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Progress bars */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Today's Progress</div>
            {[
              { label:'Daily target', stat:`${dHours} / ${dailyTarget} hrs · ${dailyPct}%`, pct:dailyPct, color:'var(--purple)' },
              { label:'Monthly target', stat:`${mHours} / ${mTarget} hrs · ${mPct}%`, pct:mPct, color:'var(--teal)' },
            ].map(p => (
              <div key={p.label} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13 }}>{p.label}</span>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text2)' }}>{p.stat}</span>
                </div>
                <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${p.pct}%`, background:p.color, borderRadius:3, transition:'width 0.6s ease' }}></div>
                </div>
              </div>
            ))}
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginTop:2 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Today's subjects</div>
              {(daily?.bySubject||[]).length===0 && <p style={{ fontSize:13, color:'var(--text3)' }}>No sessions logged today yet</p>}
              {(daily?.bySubject||[]).map(s => (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:getColor(s.subject), flexShrink:0 }}></div>
                  <div style={{ flex:1, fontSize:13 }}>{s.subject}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text2)' }}>{s.hours}h</div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected date subject breakdown */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
                  {isToday ? 'Today' : 'Selected day'} — subject breakdown
                </div>
                <div style={{ fontSize:12, color:'var(--purple)', marginTop:3 }}>{selDisplay}</div>
              </div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:14, fontWeight:600, color:'var(--teal)' }}>{selHours}h total</div>
            </div>

            {loadingDay && <div style={{ fontSize:13, color:'var(--text3)', padding:'10px 0' }}>Loading...</div>}

            {!loadingDay && selSubjects.length === 0 && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'10px 0', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>📭</div>
                No sessions on {selDisplay}
              </div>
            )}

            {!loadingDay && selSubjects.map(s => {
              const hrs = parseFloat(s.hours);
              const w = Math.round(hrs/maxSelHrs*100);
              const color = getColor(s.subject);
              return (
                <div key={s.subject} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}></div>
                      <span style={{ fontSize:13 }}>{s.subject}</span>
                    </div>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color }}>{hrs}h</span>
                  </div>
                  <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${w}%`, background:color, borderRadius:3, transition:'width 0.4s' }}></div>
                  </div>
                  {(selectedDayData?.sessions||[]).filter(ss=>ss.subject===s.subject).map(ss => (
                    <div key={ss.id} style={{ fontSize:11, color:'var(--text3)', marginTop:3, marginLeft:16 }}>
                      · {ss.slot} {ss.notes ? `— ${ss.notes}` : ''}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Calendar */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>

          {/* Calendar header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
              Study Calendar
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={prevCalMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>←</button>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text)', minWidth:96, textAlign:'center' }}>
                {calMonthName} {calYear}
              </span>
              <button onClick={nextCalMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>→</button>
            </div>
          </div>

          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:12 }}>
            Click any date to see subject breakdown
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} style={{ fontSize:10, color:'var(--text3)', textAlign:'center', fontWeight:600 }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {heatCells.map((cell, i) => {
              if (!cell) return <div key={i}/>;
              const isSelected = cell.date === selectedDate;
              const isToday2 = cell.date === today;
              const hasData = cell.hours > 0;
              return (
                <div key={i}
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    aspectRatio:'1', borderRadius:8,
                    background: isSelected ? '#7C6FFF' : heatColor(cell.hours),
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', position:'relative',
                    boxShadow: isToday2 && !isSelected ? '0 0 0 2px #7C6FFF' : '0 1px 3px rgba(0,0,0,0.08)',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition:'all 0.15s ease',
                    zIndex: isSelected ? 2 : 1,
                    border: isSelected ? 'none' : '1px solid var(--border)',
                  }}
                  title={`${cell.day} ${calMonthName}: ${cell.hours>=0?cell.hours+'h':'No data'}`}
                >
                  <div style={{
                    fontSize:10,
                    fontFamily:'JetBrains Mono,monospace',
                    color: isSelected ? '#fff' : hasData ? '#fff' : 'var(--text2)',
                    fontWeight: isSelected || hasData ? 600 : 400,
                  }}>{cell.day}</div>
                  {hasData && !isSelected && (
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.85)', marginTop:1 }}>{cell.hours}h</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
            {[['var(--surface2)','Rest'],['#6B5CE7','<4h'],['#7C6FFF','4–6h'],['#9B8FFF','6–8h'],['#B4AEFF','8+h']].map(([c,l]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text3)' }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c, border:'1px solid var(--border)' }}></div>{l}
              </span>
            ))}
          </div>

          {/* Selected date quick info */}
          {selectedDate && (
            <div style={{ marginTop:16, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>
                {isToday ? '📅 Today' : `📅 ${new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`}
              </div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:18, fontWeight:600, color:'var(--purple)' }}>{selHours}h</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                {selectedDayData?.summary?.session_count || 0} sessions · {selSubjects.length} subjects
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}