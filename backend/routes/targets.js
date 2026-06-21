const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM monthly_targets WHERE user_id=$1 AND month=$2 AND year=$3`,
      [req.user.id, month, year]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const targets = req.body;
  try {
    const results = [];
    for (const t of targets) {
      const r = await pool.query(
        `INSERT INTO monthly_targets (user_id, month, year, subject, target_hours)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id, month, year, subject)
         DO UPDATE SET target_hours=$5 RETURNING *`,
        [req.user.id, t.month, t.year, t.subject, t.target_hours]
      );
      results.push(r.rows[0]);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', auth, async (req, res) => {
  try {
    let r = await pool.query('SELECT * FROM daily_settings WHERE user_id=$1', [req.user.id]);
    if (r.rows.length === 0) {
      r = await pool.query('INSERT INTO daily_settings (user_id) VALUES ($1) RETURNING *', [req.user.id]);
    }
    const row = r.rows[0];
    if (row.subjects_json) row.subjects = JSON.parse(row.subjects_json);
    if (row.slots_json) row.slots = JSON.parse(row.slots_json);
    if (row.exam_dates_json) row.exam_dates = JSON.parse(row.exam_dates_json);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', auth, async (req, res) => {
  const { daily_hour_target, morning_slot, prenoon_slot, afternoon_slot, evening_slot, subjects, slots, exam_dates } = req.body;
  try {
    const subjectsJson = subjects ? JSON.stringify(subjects) : null;
    const slotsJson = slots ? JSON.stringify(slots) : null;
    const examDatesJson = exam_dates ? JSON.stringify(exam_dates) : null;
    const r = await pool.query(
      `INSERT INTO daily_settings (user_id, daily_hour_target, morning_slot, prenoon_slot, afternoon_slot, evening_slot, subjects_json, slots_json, exam_dates_json)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
 ON CONFLICT (user_id) DO UPDATE SET
   daily_hour_target=$2, morning_slot=$3, prenoon_slot=$4,
   afternoon_slot=$5, evening_slot=$6, subjects_json=$7, slots_json=$8, exam_dates_json=$9
 RETURNING *`,
[req.user.id, daily_hour_target, morning_slot, prenoon_slot, afternoon_slot, evening_slot, subjectsJson, slotsJson, examDatesJson]
    );
    const row = r.rows[0];
    if (row.subjects_json) row.subjects = JSON.parse(row.subjects_json);
    if (row.slots_json) row.slots = JSON.parse(row.slots_json);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;