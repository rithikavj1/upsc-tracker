const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Monthly overview
router.get('/monthly', auth, async (req, res) => {
  const { month, year } = req.query;
  try {
    const [summary, bySubject, byDay] = await Promise.all([
      pool.query(
        `SELECT 
          COALESCE(SUM(hours),0)::float AS total_hours,
          COUNT(DISTINCT date) AS days_studied,
          COALESCE(AVG(daily_sum),0)::float AS avg_daily
         FROM study_sessions
         LEFT JOIN (
           SELECT date, SUM(hours) AS daily_sum FROM study_sessions
           WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
           GROUP BY date
         ) ds USING(date)
         WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
        [req.user.id, month, year]
      ),
      pool.query(
        `SELECT subject, COALESCE(SUM(hours),0)::float AS hours
         FROM study_sessions
         WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY subject ORDER BY hours DESC`,
        [req.user.id, month, year]
      ),
      pool.query(
        `SELECT date::text, COALESCE(SUM(hours),0)::float AS hours
         FROM study_sessions
         WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY date ORDER BY date`,
        [req.user.id, month, year]
      )
    ]);
    res.json({
      summary: summary.rows[0],
      bySubject: bySubject.rows,
      byDay: byDay.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily overview
router.get('/daily', auth, async (req, res) => {
  const { date } = req.query;
  try {
    const [sessions, summary, bySubject] = await Promise.all([
      pool.query(`SELECT * FROM study_sessions WHERE user_id=$1 AND date=$2 ORDER BY created_at DESC`, [req.user.id, date]),
      pool.query(`SELECT COALESCE(SUM(hours),0)::float AS total_hours, COUNT(*)::int AS session_count FROM study_sessions WHERE user_id=$1 AND date=$2`, [req.user.id, date]),
      pool.query(`SELECT subject, COALESCE(SUM(hours),0)::float AS hours FROM study_sessions WHERE user_id=$1 AND date=$2 GROUP BY subject`, [req.user.id, date])
    ]);
    res.json({ sessions: sessions.rows, summary: summary.rows[0], bySubject: bySubject.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streak calculation
router.get('/streak', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT date::text FROM study_sessions WHERE user_id=$1 ORDER BY date DESC`,
      [req.user.id]
    );
    const dates = new Set(result.rows.map(r => r.date));
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dates.has(key)) streak++;
      else if (i > 0) break;
    }
    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All-time stats for topic hours page
router.get('/alltime', auth, async (req, res) => {
  const { period } = req.query; // 'month', 'week', 'today', 'all'
  let whereExtra = '';
  const params = [req.user.id];
  const now = new Date();
  if (period === 'today') {
  whereExtra = ` AND date=$2`;
  const pad = n => String(n).padStart(2,'0');
  params.push(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
}
  else if (period === 'week') {
  const pad = n => String(n).padStart(2,'0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const w = new Date(now);
  w.setDate(now.getDate()-7);
  const weekStr = `${w.getFullYear()}-${pad(w.getMonth()+1)}-${pad(w.getDate())}`;
  whereExtra = ` AND date >= $2 AND date <= $3`;
  params.push(weekStr, todayStr);
}
  else if (period === 'month') { whereExtra = ` AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`; params.push(now.getMonth()+1, now.getFullYear()); }
  try {
   const [bySubject, recent] = await Promise.all([
  pool.query(`SELECT subject, COALESCE(SUM(hours),0)::float AS hours FROM study_sessions WHERE user_id=$1${whereExtra} GROUP BY subject ORDER BY hours DESC`, params),
  pool.query(`SELECT * FROM study_sessions WHERE user_id=$1${whereExtra} ORDER BY date DESC, created_at DESC LIMIT 50`, params)
]);
    res.json({ bySubject: bySubject.rows, recent: recent.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
