// backend/routes/habits.js
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET — all habit categories for this user
router.get('/categories', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM habit_categories WHERE user_id=$1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — create a habit category
router.post('/categories', auth, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      `INSERT INTO habit_categories (user_id, name, icon, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, icon || '🎯', color || '#7C6FFF']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — delete a habit category
router.delete('/categories/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM habit_categories WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — habit logs (with optional date range)
router.get('/logs', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `
      SELECT hl.*, hc.name as category_name, hc.icon, hc.color
      FROM habit_logs hl
      JOIN habit_categories hc ON hl.category_id = hc.id
      WHERE hl.user_id=$1
    `;
    const params = [req.user.id];
    if (from) { params.push(from); query += ` AND hl.date >= $${params.length}`; }
    if (to)   { params.push(to);   query += ` AND hl.date <= $${params.length}`; }
    query += ` ORDER BY hl.date DESC, hl.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — log a habit session
router.post('/logs', auth, async (req, res) => {
  try {
    const { category_id, date, duration_minutes, notes } = req.body;
    if (!category_id || !date || !duration_minutes) {
      return res.status(400).json({ error: 'category_id, date, duration_minutes required' });
    }
    const result = await pool.query(
      `INSERT INTO habit_logs (user_id, category_id, date, duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, category_id, date, duration_minutes, notes || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — delete a habit log
router.delete('/logs/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM habit_logs WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — comparison summary (study vs habits, last N days)
router.get('/compare', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Study time from study_sessions
    const studyResult = await pool.query(
      `SELECT date, SUM(duration) as total_minutes
       FROM study_sessions
       WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY date ORDER BY date ASC`,
      [req.user.id]
    );

    // Habit time grouped by category
    const habitResult = await pool.query(
      `SELECT hl.date, hc.name, hc.icon, hc.color, SUM(hl.duration_minutes) as total_minutes
       FROM habit_logs hl
       JOIN habit_categories hc ON hl.category_id = hc.id
       WHERE hl.user_id=$1 AND hl.date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY hl.date, hc.name, hc.icon, hc.color
       ORDER BY hl.date ASC`,
      [req.user.id]
    );

    res.json({
      study: studyResult.rows,
      habits: habitResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
