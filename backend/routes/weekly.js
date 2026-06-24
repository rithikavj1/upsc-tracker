const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all weekly sessions for a month/year
router.get('/', auth, async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(
      `SELECT ws.* FROM weekly_sessions ws
       WHERE ws.user_id=$1 
       AND EXTRACT(MONTH FROM ws.session_date)=$2 
       AND EXTRACT(YEAR FROM ws.session_date)=$3
       ORDER BY ws.session_date, ws.session_name`,
      [req.user.id, month, year]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET sessions for a specific week
router.get('/week/:weekNum', auth, async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM weekly_sessions 
       WHERE user_id=$1 AND week_number=$2
       AND EXTRACT(MONTH FROM session_date)=$3
       AND EXTRACT(YEAR FROM session_date)=$4
       ORDER BY session_date, session_name`,
      [req.user.id, req.params.weekNum, month, year]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add a session — also auto-adds to daily tracker
router.post('/', auth, async (req, res) => {
  const {
    week_number, block_type, session_date, time_slot,
    session_name, exam_type, paper, subject, module,
    topic, sub_topic, resource_type, resource_name, hours, notes
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO weekly_sessions 
       (user_id, week_number, block_type, session_date, time_slot, session_name, 
        exam_type, paper, subject, module, topic, sub_topic, resource_type, resource_name, hours, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.user.id, week_number, block_type, session_date, time_slot, session_name,
       exam_type, paper, subject, module, topic, sub_topic, resource_type, resource_name,
       parseFloat(hours)||2, notes||null]
    );

    const autoNote = [topic, sub_topic].filter(Boolean).join(' — ') || notes || null;

    try {
      await pool.query(
        `INSERT INTO study_sessions 
         (user_id, date, subject, hours, slot, activity_type, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          req.user.id,
          session_date,
          subject,
          parseFloat(hours) || 2,
          time_slot || session_name || 'Planned',
          'Reading / Notes',
          autoNote,
          'Pending'
        ]
      );
      console.log(`✅ Auto-added to daily tracker: ${subject} on ${session_date}`);
    } catch (dailyErr) {
      console.log('⚠️ Daily session insert skipped:', dailyErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a session
router.put('/:id', auth, async (req, res) => {
  const {
    time_slot, session_name, exam_type, paper, subject,
    module, topic, sub_topic, resource_type, resource_name,
    hours, completed, notes
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE weekly_sessions SET
       time_slot=$1, session_name=$2, exam_type=$3, paper=$4, subject=$5,
       module=$6, topic=$7, sub_topic=$8, resource_type=$9, resource_name=$10,
       hours=$11, completed=$12, notes=$13
       WHERE id=$14 AND user_id=$15 RETURNING *`,
      [time_slot, session_name, exam_type, paper, subject,
       module, topic, sub_topic, resource_type, resource_name,
       parseFloat(hours)||2, completed||false, notes||null,
       req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle completed — also syncs status to daily tracker
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    // 1. Toggle completed in weekly_sessions
    const result = await pool.query(
      `UPDATE weekly_sessions SET completed = NOT completed 
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    const session = result.rows[0];

    // 2. Sync to daily tracker — update matching study_session status
    const newStatus = session.completed ? 'Done' : 'Pending';
    try {
      await pool.query(
        `UPDATE study_sessions 
         SET status=$1
         WHERE user_id=$2 
           AND date=$3 
           AND subject=$4
           AND (slot=$5 OR slot='Daily Entry')`,
        [
          newStatus,
          req.user.id,
          session.session_date,
          session.subject,
          session.time_slot || session.session_name || 'Planned',
        ]
      );
      console.log(`✅ Daily tracker updated: ${session.subject} on ${session.session_date} → ${newStatus}`);
    } catch (syncErr) {
      console.log('⚠️ Daily sync skipped:', syncErr.message);
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a session — also removes from daily tracker
router.delete('/:id', auth, async (req, res) => {
  try {
    const sess = await pool.query(
      'SELECT * FROM weekly_sessions WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );

    if (sess.rows.length > 0) {
      const s = sess.rows[0];
      try {
        await pool.query(
          `DELETE FROM study_sessions 
           WHERE user_id=$1 AND date=$2 AND subject=$3 AND status='Pending'
           AND slot=$4`,
          [req.user.id, s.session_date, s.subject, s.time_slot || s.session_name || 'Planned']
        );
      } catch(e) {
        console.log('Daily delete skipped:', e.message);
      }
    }

    await pool.query(
      'DELETE FROM weekly_sessions WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get('/stats', auth, async (req, res) => {
  const { month, year, week } = req.query;
  try {
    let query, params;
    if (week) {
      query = `SELECT subject, SUM(hours)::float AS hours, COUNT(*)::int AS sessions,
               SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completed
               FROM weekly_sessions WHERE user_id=$1 AND week_number=$2
               AND EXTRACT(MONTH FROM session_date)=$3 AND EXTRACT(YEAR FROM session_date)=$4
               GROUP BY subject ORDER BY hours DESC`;
      params = [req.user.id, week, month, year];
    } else {
      query = `SELECT subject, SUM(hours)::float AS hours, COUNT(*)::int AS sessions,
               SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completed
               FROM weekly_sessions WHERE user_id=$1
               AND EXTRACT(MONTH FROM session_date)=$2 AND EXTRACT(YEAR FROM session_date)=$3
               GROUP BY subject ORDER BY hours DESC`;
      params = [req.user.id, month, year];
    }
    const bySubject = await pool.query(query, params);

    const byWeek = await pool.query(
      `SELECT week_number, block_type, SUM(hours)::float AS hours,
       COUNT(*)::int AS sessions,
       SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completed
       FROM weekly_sessions WHERE user_id=$1
       AND EXTRACT(MONTH FROM session_date)=$2 AND EXTRACT(YEAR FROM session_date)=$3
       GROUP BY week_number, block_type ORDER BY week_number`,
      [req.user.id, month, year]
    );

    res.json({ bySubject: bySubject.rows, byWeek: byWeek.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;