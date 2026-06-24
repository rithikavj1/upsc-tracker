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
    } else if (date) {
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

// POST add session — saves to study_sessions AND syncs to weekly_sessions
router.post('/', auth, async (req, res) => {
  const { date, subject, hours, slot, activity_type, notes } = req.body;
  if (!date || !subject || !hours) return res.status(400).json({ error: 'date, subject, hours required' });
  try {
    const result = await pool.query(
      `INSERT INTO study_sessions (user_id, date, subject, hours, slot, activity_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, date, subject, parseFloat(hours), slot || null, activity_type || null, notes || null]
    );

    try {
      const d = new Date(date);
      const weekNumber = Math.ceil(d.getDate() / 7);
      const blockType = (d.getDay() === 0 || d.getDay() === 6) ? 'Weekend' : 'Weekday';

      const existing = await pool.query(
        `SELECT id FROM weekly_sessions WHERE user_id=$1 AND session_date=$2 AND subject=$3 AND time_slot=$4`,
        [req.user.id, date, subject, slot || 'Daily Entry']
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO weekly_sessions 
           (user_id, week_number, block_type, session_date, time_slot, session_name,
            exam_type, paper, subject, module, topic, sub_topic, resource_type, resource_name, hours, notes, completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [req.user.id, weekNumber, blockType, date, slot || 'Daily Entry',
           slot ? slot.split(' ')[0] : 'Daily', 'Prelims', 'GS1', subject,
           null, activity_type || null, null, null, null, parseFloat(hours), notes || null, false]
        );
        console.log(`✅ Daily session synced to weekly: ${subject} on ${date}`);
      }
    } catch (weeklyErr) {
      console.log('⚠️ Weekly sync skipped:', weeklyErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session — also removes from weekly_sessions
router.delete('/:id', auth, async (req, res) => {
  try {
    const sess = await pool.query(
      'SELECT * FROM study_sessions WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );

    if (sess.rows.length > 0) {
      const s = sess.rows[0];
      try {
        await pool.query(
          `DELETE FROM weekly_sessions 
           WHERE user_id=$1 AND session_date=$2 AND subject=$3 
           AND time_slot=$4 AND completed=false`,
          [req.user.id, s.date, s.subject, s.slot || 'Daily Entry']
        );
      } catch (e) {
        console.log('Weekly delete skipped:', e.message);
      }
    }

    await pool.query('DELETE FROM study_sessions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update session status — syncs to weekly_sessions
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE study_sessions SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    const session = r.rows[0];

    // ── Sync to weekly_sessions ──────────────────────────────────────────────
    try {
      if (status === 'Done') {
        // Tick ✓ in weekly tracker
        await pool.query(
          `UPDATE weekly_sessions SET completed=true
           WHERE user_id=$1 AND session_date=$2 AND subject=$3
           AND (time_slot=$4 OR time_slot='Daily Entry' OR session_name=$5)`,
          [req.user.id, session.date, session.subject,
           session.slot || 'Daily Entry', session.slot?.split(' ')[0] || 'Daily']
        );
        console.log(`✅ Weekly ticked: ${session.subject} on ${session.date}`);

      } else if (status === 'Pending') {
        // Untick ○ in weekly tracker
        await pool.query(
          `UPDATE weekly_sessions SET completed=false
           WHERE user_id=$1 AND session_date=$2 AND subject=$3
           AND (time_slot=$4 OR time_slot='Daily Entry' OR session_name=$5)`,
          [req.user.id, session.date, session.subject,
           session.slot || 'Daily Entry', session.slot?.split(' ')[0] || 'Daily']
        );
        console.log(`✅ Weekly unticked: ${session.subject} on ${session.date}`);

      } else if (status === 'Carry Forward') {
        // Remove old entry from weekly tracker — it's being moved to another day
        await pool.query(
          `DELETE FROM weekly_sessions
           WHERE user_id=$1 AND session_date=$2 AND subject=$3
           AND (time_slot=$4 OR time_slot='Daily Entry' OR session_name=$5)
           AND completed=false`,
          [req.user.id, session.date, session.subject,
           session.slot || 'Daily Entry', session.slot?.split(' ')[0] || 'Daily']
        );
        console.log(`✅ Weekly entry removed (carry forward): ${session.subject} on ${session.date}`);
      }
    } catch (syncErr) {
      console.log('⚠️ Weekly sync skipped:', syncErr.message);
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;