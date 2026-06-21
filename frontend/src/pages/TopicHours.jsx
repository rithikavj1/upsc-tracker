import { useState, useEffect, useRef } from 'react';
import api from '../api';

const SUBJECT_COLORS = { 'Polity':'#7C6FFF','History':'#2DD4BF','Geography':'#378ADD','Economics':'#F59E0B','Environment':'#22D3A0','Science & Tech':'#D4537E','Current Affairs':'#639922','CSAT':'#888780' };
const ACTIVITY_COLORS = { 'Reading / Notes':'#7C6FFF','MCQ Practice':'#2DD4BF','Revision':'#F59E0B','Previous Year Questions':'#D4537E','Mock Test':'#22D3A0','Newspaper Reading':'#639922' };

// ── Calendar Date Range Picker ──────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, onChange, onClose }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [hovering, setHovering] = useState(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const toKey = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : null;
  const startKey = toKey(startDate);
  const endKey = toKey(endDate);
  const hoverKey = toKey(hovering);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const handleDayClick = (day) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!startDate || (startDate && endDate)) {
      onChange({ start: clicked, end: null });
    } else {
      if (clicked < startDate) {
        onChange({ start: clicked, end: startDate });
      } else {
        onChange({ start: startDate, end: clicked });
      }
    }
  };

  const isInRange = (day) => {
    const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const compareEnd = endKey || hoverKey;
    if (!startKey || !compareEnd) return false;
    return key > startKey && key < compareEnd || key > compareEnd && key < startKey;
  };

  const isStart = (day) => {
    const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return key === startKey;
  };

  const isEnd = (day) => {
    const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return key === endKey;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{
      position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:100,
      background:'var(--surface)', border:'1px solid var(--border2)',
      borderRadius:14, padding:20, width:300,
      boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
    }}>
      {/* Month nav */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <button onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16, padding:'4px 8px' }}>←</button>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:600 }}>{monthNames[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:16, padding:'4px 8px' }}>→</button>
      </div>

      {/* Day labels */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:'var(--text3)', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const start = isStart(day), end = isEnd(day), inRange = isInRange(day);
          return (
            <div key={i}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => {
                if (startDate && !endDate) setHovering(new Date(viewYear, viewMonth, day));
              }}
              onMouseLeave={() => setHovering(null)}
              style={{
                textAlign:'center', padding:'6px 0', borderRadius:6, cursor:'pointer', fontSize:12,
                background: start || end ? 'var(--purple)' : inRange ? 'rgba(124,111,255,0.2)' : 'transparent',
                color: start || end ? '#fff' : inRange ? 'var(--purple)' : 'var(--text)',
                fontWeight: start || end ? 600 : 400,
              }}
            >{day}</div>
          );
        })}
      </div>

      {/* Selected range display */}
      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--text3)' }}>
        {startDate && !endDate && <span style={{ color:'var(--amber)' }}>Now click an end date</span>}
        {startDate && endDate && (
          <span style={{ color:'var(--green)' }}>
            ✅ {startDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} → {endDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
          </span>
        )}
        {!startDate && <span>Click a start date</span>}
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button onClick={() => { onChange({ start:null, end:null }); }} style={{
          flex:1, padding:'7px 0', borderRadius:7, background:'var(--surface2)',
          border:'1px solid var(--border2)', color:'var(--text2)', fontSize:12, cursor:'pointer'
        }}>Clear</button>
        <button onClick={onClose} disabled={!startDate || !endDate} style={{
          flex:1, padding:'7px 0', borderRadius:7, background: startDate && endDate ? 'var(--purple)' : 'var(--surface2)',
          border:'none', color: startDate && endDate ? '#fff' : 'var(--text3)', fontSize:12,
          cursor: startDate && endDate ? 'pointer' : 'not-allowed'
        }}>Apply</button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TopicHours() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState({ bySubject:[], recent:[] });
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const pickerRef = useRef();

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load normal period data
  useEffect(() => {
    if (period === 'range') return;
    setLoading(true);
    api.get(`/overview/alltime?period=${period}`)
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  // Load range data when dates selected
  useEffect(() => {
    if (!startDate || !endDate) return;
    setRangeLoading(true);
    const pad = n => String(n).padStart(2,'0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const s = fmt(startDate);
const e = fmt(endDate);
    api.get(`/sessions?startDate=${s}&endDate=${e}`)
      .then(r => {
        const sessions = r.data;
        // group by subject
        const subMap = {};
        sessions.forEach(s => {
          if (!subMap[s.subject]) subMap[s.subject] = 0;
          subMap[s.subject] += parseFloat(s.hours);
        });
        const bySubject = Object.entries(subMap).map(([subject, hours]) => ({ subject, hours })).sort((a,b) => b.hours - a.hours);
        setRangeData({ bySubject, recent: sessions.slice(0,30) });
      }).catch(console.error).finally(() => setRangeLoading(false));
  }, [startDate, endDate]);

  const displayData = (period === 'range' && rangeData) ? rangeData : data;
  const isLoading = period === 'range' ? rangeLoading : loading;

  const total = displayData.bySubject.reduce((a, s) => a + parseFloat(s.hours), 0);
  const maxHrs = Math.max(...displayData.bySubject.map(s => parseFloat(s.hours)), 1);

  // Donut SVG
  const r = 60, cx = 80, cy = 80;
  let offset = -Math.PI / 2;
  const paths = displayData.bySubject.map(s => {
    const frac = total > 0 ? parseFloat(s.hours) / total : 0;
    const angle = frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset), y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle), y2 = cy + r * Math.sin(offset + angle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    offset += angle;
    return { d, color: SUBJECT_COLORS[s.subject] || '#7C6FFF', subject: s.subject, hours: s.hours };
  });

  const rangeLabel = startDate && endDate
    ? `${startDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${endDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`
    : 'Pick Dates';

  return (
    <div style={{ padding:'32px 36px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px' }}>Topic Hours Log</h1>
          <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>Detailed breakdown of study time across subjects</p>
        </div>

        {/* Filter buttons + Calendar picker */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {[['month','This Month'],['week','This Week'],['today','Today'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => { setPeriod(v); setShowPicker(false); }} style={{
              background:period===v?'var(--purple)':'var(--surface)',
              border:`1px solid ${period===v?'var(--purple)':'var(--border)'}`,
              borderRadius:20, padding:'6px 14px', fontSize:12,
              color:period===v?'#fff':'var(--text2)', cursor:'pointer',
            }}>{l}</button>
          ))}

          {/* Calendar button */}
          <div ref={pickerRef} style={{ position:'relative' }}>
            <button
              onClick={() => { setShowPicker(p => !p); setPeriod('range'); }}
              style={{
                background: period==='range' ? 'var(--teal)' : 'var(--surface)',
                border: `1px solid ${period==='range' ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius:20, padding:'6px 14px', fontSize:12,
                color: period==='range' ? '#fff' : 'var(--text2)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
              }}
            >
              📅 {period==='range' ? rangeLabel : 'Date Range'}
            </button>

            {showPicker && (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={({ start, end }) => { setStartDate(start); setEndDate(end); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Range info banner */}
      {period === 'range' && startDate && endDate && (
        <div style={{ background:'var(--teal-dim)', border:'1px solid rgba(45,212,191,0.3)', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'var(--teal)', display:'flex', alignItems:'center', gap:8 }}>
          📅 Showing data from <strong>{startDate.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</strong> to <strong>{endDate.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</strong>
          <button onClick={() => { setStartDate(null); setEndDate(null); setRangeData(null); }} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--teal)', cursor:'pointer', fontSize:13 }}>✕ Clear</button>
        </div>
      )}

      {period === 'range' && !startDate && (
        <div style={{ background:'var(--amber-dim)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'var(--amber)' }}>
          📅 Click the calendar button above and select a start and end date to view data for that range.
        </div>
      )}

      {isLoading ? <div style={{ color:'var(--text3)', padding:'40px 0' }}>Loading...</div> : (<>

        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Donut */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Time distribution</div>
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 160 160" width="160" height="160">
                {total === 0
                  ? <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
                  : paths.map((p, i) => <path key={i} d={p.d} stroke={p.color} strokeWidth="16" fill="none" strokeLinecap="butt" />)
                }
              </svg>
              <div style={{ position:'absolute', textAlign:'center' }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, fontWeight:600 }}>{total.toFixed(1)}h</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>total</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Subject breakdown</div>
            {displayData.bySubject.length === 0 && <p style={{ fontSize:13, color:'var(--text3)' }}>No data for this period</p>}
            {displayData.bySubject.map(s => {
              const hrs = parseFloat(s.hours);
              const pct = total > 0 ? Math.round(hrs/total*100) : 0;
              const color = SUBJECT_COLORS[s.subject] || '#7C6FFF';
              return (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}></div>
                  <div style={{ flex:1, fontSize:12 }}>{s.subject}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text2)' }}>{pct}%</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text3)', minWidth:32, textAlign:'right' }}>{hrs}h</div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Hours per subject</div>
            {displayData.bySubject.length === 0 && <p style={{ fontSize:13, color:'var(--text3)' }}>No data for this period</p>}
            {displayData.bySubject.map(s => {
              const hrs = parseFloat(s.hours);
              const w = Math.round(hrs/maxHrs*100);
              const color = SUBJECT_COLORS[s.subject] || '#7C6FFF';
              return (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ fontSize:12, color:'var(--text2)', minWidth:90 }}>{s.subject}</div>
                  <div style={{ flex:1, height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${w}%`, background:color, borderRadius:4, transition:'width 0.5s' }}></div>
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color, minWidth:35, textAlign:'right' }}>{hrs}h</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Log table */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>
            {period === 'range' && startDate && endDate
              ? `Sessions from ${startDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} to ${endDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`
              : 'Recent log entries'}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border2)' }}>
                {['Date','Subject','Activity','Slot','Notes','Hours'].map((h,i) => (
                  <th key={h} style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', padding:'0 0 10px 0', textAlign:i===5?'right':'left', fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.recent.length === 0 && (
                <tr><td colSpan={6} style={{ padding:'20px 0', fontSize:13, color:'var(--text3)', textAlign:'center' }}>No sessions found for this period</td></tr>
              )}
              {displayData.recent.map(s => {
                const color = SUBJECT_COLORS[s.subject] || '#7C6FFF';
                const actColor = ACTIVITY_COLORS[s.activity_type] || '#7C6FFF';
                return (
                  <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 0', fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text3)' }}>
                      {s.date ? s.date.slice(8,10)*1 + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(s.date.slice(5,7))-1] : '—'}
                    </td>
                    <td style={{ padding:'10px 0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:color }}></div>
                        <span style={{ fontSize:13 }}>{s.subject}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 0' }}>
                      {s.activity_type && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:`${actColor}22`, color:actColor }}>{s.activity_type}</span>}
                    </td>
                    <td style={{ padding:'10px 0', fontSize:11, color:'var(--text2)' }}>{s.slot}</td>
                    <td style={{ padding:'10px 0', fontSize:11, color:'var(--text2)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.notes}</td>
                    <td style={{ padding:'10px 0', textAlign:'right', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:500, color }}>{s.hours}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}