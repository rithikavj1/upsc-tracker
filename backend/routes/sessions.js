const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET sessions (by date or month/year or recent)
router.get('/', auth, async (req, res) => {
  const { date, month, year, startDate, endDate } = req.query;
  try {
    let query, params;
    if (startDate && endDate) {
  query = `SELECT * FROM study_sessions WHERE user_id=$1 AND date >= $2 AND date <= $3 ORDER BY date DESC, created_at DESC`;
  params = [req.user.id, startDate, endDate];
} else

    if (date) {
      query = `SELECT * FROM study_sessions WHERE user_id=$1 AND date=$2 ORDER BY created_at DESC`;
      params = [req.user.id, date];
    } else if (month && year) {
      query = `SELECT * FROM study_sessions WHERE user_id=$1 
               AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 
               ORDER BY date DESC, created_at DESC`;
      params = [req.user.id, month, year];
    } else {
      query = `SELECT * FROM study_sessions WHERE user_id=$1 ORDER BY date DESC, created_at DESC LIMIT 100`;
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add session
router.post('/', auth, async (req, res) => {
  const { date, subject, hours, slot, activity_type, notes } = req.body;
  if (!date || !subject || !hours) return res.status(400).json({ error: 'date, subject, hours required' });
  try {
    const result = await pool.query(
      `INSERT INTO study_sessions (user_id, date, subject, hours, slot, activity_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, date, subject, parseFloat(hours), slot || null, activity_type || null, notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM study_sessions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE study_sessions SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

