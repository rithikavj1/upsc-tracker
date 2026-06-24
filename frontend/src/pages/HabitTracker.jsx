import { useState, useEffect } from 'react';
import api from '../api';

const DEFAULT_CATEGORIES = [
  { name: 'Entertainment', icon: '🎬', color: '#F59E0B' },
  { name: 'Movie Time', icon: '🍿', color: '#EF4444' },
  { name: 'Family Time', icon: '👨‍👩‍👧', color: '#22C55E' },
  { name: 'Exercise', icon: '🏃', color: '#3B82F6' },
  { name: 'Reading', icon: '📚', color: '#8B5CF6' },
  { name: 'Social Media', icon: '📱', color: '#EC4899' },
];

const ICONS = ['🎬','🍿','👨‍👩‍👧','🏃','📚','📱','🎮','🎵','🍳','✈️','😴','🎨','🏋️','🧘','🛍️'];
const COLORS = ['#F59E0B','#EF4444','#22C55E','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4','#84CC16'];

function minsToHr(m) {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return h > 0 ? `${h}h ${mn > 0 ? mn + 'm' : ''}`.trim() : `${mn}m`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function HabitTracker() {
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [compareDays, setCompareDays] = useState(7);
  const [tab, setTab] = useState('log'); // log | compare | manage
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Log form
  const [logForm, setLogForm] = useState({ category_id: '', date: today(), duration_minutes: '', notes: '' });
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Category form
  const [catForm, setCatForm] = useState({ name: '', icon: '🎯', color: '#7C6FFF' });
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === 'compare') loadCompare(); }, [tab, compareDays]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [catRes, logRes] = await Promise.all([
        api.get('/habits/categories'),
        api.get('/habits/logs'),
      ]);
      setCategories(catRes.data);
      setLogs(logRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadCompare = async () => {
    try {
      const res = await api.get(`/habits/compare?days=${compareDays}`);
      setCompareData(res.data);
    } catch (e) { console.error(e); }
  };

  const addDefaultCategory = async (cat) => {
    try {
      const res = await api.post('/habits/categories', cat);
      setCategories(prev => [...prev, res.data]);
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
  };

  const submitLog = async () => {
    if (!logForm.category_id || !logForm.duration_minutes) {
      setMsg('❌ Please fill category and duration'); return;
    }
    setLogSubmitting(true);
    try {
      const res = await api.post('/habits/logs', {
        ...logForm,
        duration_minutes: parseInt(logForm.duration_minutes),
      });
      setLogs(prev => [{ ...res.data, category_name: categories.find(c => c.id == logForm.category_id)?.name, icon: categories.find(c => c.id == logForm.category_id)?.icon, color: categories.find(c => c.id == logForm.category_id)?.color }, ...prev]);
      setLogForm({ category_id: '', date: today(), duration_minutes: '', notes: '' });
      setMsg('✅ Logged successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
    finally { setLogSubmitting(false); }
  };

  const deleteLog = async (id) => {
    try {
      await api.delete(`/habits/logs/${id}`);
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const submitCat = async () => {
    if (!catForm.name) { setMsg('❌ Name required'); return; }
    setCatSubmitting(true);
    try {
      const res = await api.post('/habits/categories', catForm);
      setCategories(prev => [...prev, res.data]);
      setCatForm({ name: '', icon: '🎯', color: '#7C6FFF' });
      setShowCatForm(false);
      setMsg('✅ Category added!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || e.message)); }
    finally { setCatSubmitting(false); }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete this category? All its logs will also be deleted.')) return;
    try {
      await api.delete(`/habits/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      setLogs(prev => prev.filter(l => l.category_id !== id));
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  // Build compare chart data
  const buildCompareChart = () => {
    if (!compareData) return [];
    const dateMap = {};
    compareData.study.forEach(s => {
      if (!dateMap[s.date]) dateMap[s.date] = { date: s.date, Study: 0 };
      dateMap[s.date].Study += Math.round(s.total_minutes);
    });
    compareData.habits.forEach(h => {
      const d = h.date?.slice(0, 10) || h.date;
      if (!dateMap[d]) dateMap[d] = { date: d, Study: 0 };
      dateMap[d][h.name] = (dateMap[d][h.name] || 0) + Math.round(h.total_minutes);
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Totals for compare summary
  const buildTotals = () => {
    if (!compareData) return [];
    const totals = {};
    compareData.study.forEach(s => {
      totals['Study'] = (totals['Study'] || 0) + Math.round(s.total_minutes);
    });
    compareData.habits.forEach(h => {
      const meta = compareData.habits.find(x => x.name === h.name);
      totals[h.name] = (totals[h.name] || 0) + Math.round(h.total_minutes);
    });
    return Object.entries(totals).map(([name, mins]) => ({ name, mins })).sort((a, b) => b.mins - a.mins);
  };

  const chartData = buildCompareChart();
  const totals = buildTotals();
  const grandTotal = totals.reduce((s, t) => s + t.mins, 0);

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 };
  const inp = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text)', width: '100%', boxSizing: 'border-box' };
  const btn = (bg, col = '#fff') => ({ background: bg, color: col, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' });

  const catColors = {};
  categories.forEach(c => { catColors[c.name] = c.color; });
  catColors['Study'] = '#7C6FFF';

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading...</div>;

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>Habit Tracker</h1>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 28 }}>Track non-study time and compare with your study hours</p>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, background: msg.startsWith('✅') ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)', border: '1px solid var(--border)' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['log', '📝 Log'], ['compare', '📊 Compare'], ['manage', '⚙️ Manage']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ ...btn(tab === key ? '#7C6FFF' : 'var(--surface2)', tab === key ? '#fff' : 'var(--text2)'), border: '1px solid var(--border)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
          {/* Log form */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18 }}>Log Activity</div>

            {categories.length === 0 ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>No categories yet. Add some quick ones:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEFAULT_CATEGORIES.map(c => (
                    <button key={c.name} onClick={() => addDefaultCategory(c)} style={{ ...btn(c.color), fontSize: 12, padding: '6px 12px' }}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Category</div>
                  <select value={logForm.category_id} onChange={e => setLogForm(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                    <option value=''>Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Date</div>
                  <input type='date' value={logForm.date} onChange={e => setLogForm(p => ({ ...p, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Duration (minutes)</div>
                  <input type='number' placeholder='e.g. 90' min='1' value={logForm.duration_minutes} onChange={e => setLogForm(p => ({ ...p, duration_minutes: e.target.value }))} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Notes (optional)</div>
                  <input type='text' placeholder='What did you do?' value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} style={inp} />
                </div>
                <button onClick={submitLog} disabled={logSubmitting} style={btn('#7C6FFF')}>
                  {logSubmitting ? 'Logging...' : '+ Log Activity'}
                </button>
              </div>
            )}
          </div>

          {/* Recent logs */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18 }}>Recent Logs</div>
            {logs.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>No activity logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {logs.slice(0, 30).map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, borderLeft: `3px solid ${log.color || '#7C6FFF'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{log.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{log.category_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{log.date?.slice(0, 10)} {log.notes && `· ${log.notes}`}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: log.color || '#7C6FFF' }}>{minsToHr(log.duration_minutes)}</span>
                      <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMPARE TAB ── */}
      {tab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Show last:</span>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setCompareDays(d)} style={{ ...btn(compareDays === d ? '#7C6FFF' : 'var(--surface2)', compareDays === d ? '#fff' : 'var(--text2)'), border: '1px solid var(--border)', padding: '6px 14px', fontSize: 12 }}>
                {d} days
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {totals.map(t => {
              const pct = grandTotal > 0 ? Math.round((t.mins / grandTotal) * 100) : 0;
              const color = t.name === 'Study' ? '#7C6FFF' : (catColors[t.name] || '#888');
              return (
                <div key={t.name} style={{ ...card, padding: 16, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{t.name === 'Study' ? '📖' : categories.find(c => c.name === t.name)?.icon || '🎯'} {t.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{minsToHr(t.mins)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{pct}% of total time</div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          {chartData.length > 0 ? (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Daily Breakdown — Study vs Habits</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, minWidth: chartData.length * 60, height: 220, padding: '0 8px' }}>
                  {chartData.map(day => {
                    const allKeys = Object.keys(day).filter(k => k !== 'date');
                    const maxMins = Math.max(...chartData.flatMap(d => Object.entries(d).filter(([k]) => k !== 'date').map(([, v]) => v)), 1);
                    return (
                      <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180 }}>
                          {allKeys.map(key => {
                            const color = key === 'Study' ? '#7C6FFF' : (catColors[key] || '#888');
                            const h = Math.round((day[key] / maxMins) * 160);
                            return (
                              <div key={key} title={`${key}: ${minsToHr(day[key])}`} style={{ width: 20, height: h, background: color, borderRadius: '4px 4px 0 0', cursor: 'default', transition: 'opacity .2s' }}
                                onMouseEnter={e => e.target.style.opacity = '.7'}
                                onMouseLeave={e => e.target.style.opacity = '1'}
                              />
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                {['Study', ...categories.map(c => c.name)].map(name => {
                  const color = name === 'Study' ? '#7C6FFF' : (catColors[name] || '#888');
                  const icon = name === 'Study' ? '📖' : categories.find(c => c.name === name)?.icon || '🎯';
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                      <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                      {icon} {name}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ ...card, textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 40 }}>
              No data for this period yet. Log some study and habit sessions first!
            </div>
          )}

          {/* Study vs Non-Study ratio */}
          {grandTotal > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Study vs Non-Study Ratio</div>
              <div style={{ display: 'flex', gap: 0, height: 32, borderRadius: 8, overflow: 'hidden' }}>
                {totals.map(t => {
                  const pct = Math.round((t.mins / grandTotal) * 100);
                  const color = t.name === 'Study' ? '#7C6FFF' : (catColors[t.name] || '#888');
                  return pct > 0 ? (
                    <div key={t.name} title={`${t.name}: ${pct}%`} style={{ width: `${pct}%`, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {pct > 8 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{pct}%</span>}
                    </div>
                  ) : null;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                <span>Total tracked: {minsToHr(grandTotal)}</span>
                <span>Over {compareDays} days</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MANAGE TAB ── */}
      {tab === 'manage' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Your Categories</div>
            <button onClick={() => setShowCatForm(p => !p)} style={btn('#7C6FFF')}>
              {showCatForm ? '✕ Cancel' : '+ Add Category'}
            </button>
          </div>

          {showCatForm && (
            <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginBottom: 12 }}>
                <input placeholder='Category name...' value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} style={inp} />
                <select value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} style={{ ...inp, width: 'auto' }}>
                  {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <select value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} style={{ ...inp, width: 'auto' }}>
                  {COLORS.map(c => <option key={c} value={c} style={{ background: c }}>⬤ {c}</option>)}
                </select>
              </div>
              <button onClick={submitCat} disabled={catSubmitting} style={btn('#22D3A0')}>
                {catSubmitting ? 'Adding...' : '✓ Save Category'}
              </button>
            </div>
          )}

          {/* Quick add defaults */}
          {categories.length === 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Quick add default categories:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DEFAULT_CATEGORIES.map(c => (
                  <button key={c.name} onClick={() => addDefaultCategory(c)} style={{ ...btn(c.color), fontSize: 12, padding: '6px 14px' }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No categories yet. Add some above!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categories.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {logs.filter(l => l.category_id == c.id).length} logs · {minsToHr(logs.filter(l => l.category_id == c.id).reduce((s, l) => s + l.duration_minutes, 0))} total
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteCat(c.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
