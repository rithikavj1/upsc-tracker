const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET — fetch full user context for AI
const getUserContext = async (userId) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Run all queries in parallel
  const [
    userRes,
    settingsRes,
    todaySessionsRes,
    weeklySessionsRes,
    monthlyStatsRes,
    streakRes,
    subjectHoursRes,
    pendingRes,
    habitRes,
  ] = await Promise.all([
    // User basic info
    pool.query(`SELECT name, email, subscription_status, trial_end FROM users WHERE id=$1`, [userId]),

    // Target settings (slots, subjects, daily target)
    pool.query(`SELECT settings FROM user_settings WHERE user_id=$1`, [userId]).catch(() => ({ rows: [] })),

    // Today's sessions
    pool.query(
      `SELECT subject, hours, slot, activity_type, notes, status 
       FROM study_sessions WHERE user_id=$1 AND date=$2 ORDER BY created_at`,
      [userId, todayStr]
    ),

    // This week's sessions (last 7 days)
    pool.query(
      `SELECT date, subject, hours, slot, activity_type, status
       FROM study_sessions 
       WHERE user_id=$1 AND date >= $2 AND date <= $3
       ORDER BY date DESC`,
      [userId, new Date(today.getTime() - 7*24*60*60*1000).toISOString().slice(0,10), todayStr]
    ),

    // This month's subject hours breakdown
    pool.query(
      `SELECT subject, SUM(hours)::float as total_hours, COUNT(*)::int as sessions,
       SUM(CASE WHEN status='Done' OR status IS NULL THEN hours ELSE 0 END)::float as completed_hours
       FROM study_sessions 
       WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       GROUP BY subject ORDER BY total_hours DESC`,
      [userId, month, year]
    ),

    // Study streak
    pool.query(
      `SELECT COUNT(DISTINCT date)::int as streak
       FROM study_sessions
       WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    ),

    // All time subject hours
    pool.query(
      `SELECT subject, SUM(hours)::float as total_hours
       FROM study_sessions WHERE user_id=$1
       GROUP BY subject ORDER BY total_hours DESC`,
      [userId]
    ),

    // Pending sessions this week
    pool.query(
      `SELECT date, subject, hours, slot
       FROM study_sessions
       WHERE user_id=$1 AND status='Pending' AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date DESC`,
      [userId]
    ),

    // Habit tracker data this week
    pool.query(
      `SELECT hc.name, SUM(hl.duration_minutes)::int as total_mins
       FROM habit_logs hl
       JOIN habit_categories hc ON hl.category_id = hc.id
       WHERE hl.user_id=$1 AND hl.date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY hc.name ORDER BY total_mins DESC`,
      [userId]
    ).catch(() => ({ rows: [] })),
  ]);

  const user = userRes.rows[0];
  const settings = settingsRes.rows[0]?.settings || {};
  const todaySessions = todaySessionsRes.rows;
  const weekSessions = weeklySessionsRes.rows;
  const monthlySubjects = monthlyStatsRes.rows;
  const streak = streakRes.rows[0]?.streak || 0;
  const allSubjectHours = subjectHoursRes.rows;
  const pendingSessions = pendingRes.rows;
  const habitData = habitRes.rows;

  // Calculate today's stats
  const doneSessions = todaySessions.filter(s => !s.status || s.status === 'Done');
  const todayHours = doneSessions.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const todayPending = todaySessions.filter(s => s.status === 'Pending');
  const todayCF = todaySessions.filter(s => s.status === 'Carry Forward');

  // Weekly hours
  const weekHours = weekSessions
    .filter(s => !s.status || s.status === 'Done')
    .reduce((s, r) => s + parseFloat(r.hours || 0), 0);

  // Monthly hours
  const monthHours = monthlySubjects.reduce((s, r) => s + (r.completed_hours || 0), 0);

  // Daily target
  const dailyTarget = settings?.daily_hour_target || 8;

  // Slots
  const slots = settings?.slots
    ? settings.slots.filter(s => s.enabled).map(s => `${s.label} (${s.start}–${s.end})`).join(', ')
    : 'Morning, Afternoon, Evening';

  // Subjects being tracked
  const trackedSubjects = settings?.subjects
    ? settings.subjects.map(s => s.name).join(', ')
    : allSubjectHours.map(s => s.subject).join(', ') || 'Polity, History, Geography, Economics';

  return {
    user,
    todayStr,
    dailyTarget,
    slots,
    trackedSubjects,
    todayHours,
    todayPending,
    todayCF,
    doneSessions,
    weekHours,
    monthHours,
    monthlySubjects,
    allSubjectHours,
    pendingSessions,
    habitData,
    streak,
  };
};

const buildSystemPrompt = (ctx) => {
  const {
    user, todayStr, dailyTarget, slots, trackedSubjects,
    todayHours, todayPending, todayCF, doneSessions,
    weekHours, monthHours, monthlySubjects, allSubjectHours,
    pendingSessions, habitData, streak,
  } = ctx;

  const todaySessionsList = doneSessions.length > 0
    ? doneSessions.map(s => `  - ${s.subject}: ${s.hours}h (${s.slot || 'no slot'}) [${s.activity_type || 'study'}]`).join('\n')
    : '  - No sessions completed yet today';

  const pendingList = todayPending.length > 0
    ? todayPending.map(s => `  - ${s.subject}: ${s.hours}h (${s.slot})`).join('\n')
    : '  - None';

  const cfList = todayCF.length > 0
    ? todayCF.map(s => `  - ${s.subject}: ${s.hours}h`).join('\n')
    : '  - None';

  const monthlyList = monthlySubjects.length > 0
    ? monthlySubjects.map(s => `  - ${s.subject}: ${s.completed_hours?.toFixed(1)}h completed (${s.sessions} sessions)`).join('\n')
    : '  - No data this month';

  const allTimeList = allSubjectHours.length > 0
    ? allSubjectHours.map(s => `  - ${s.subject}: ${s.total_hours?.toFixed(1)}h total`).join('\n')
    : '  - No data';

  const habitList = habitData.length > 0
    ? habitData.map(h => `  - ${h.name}: ${Math.round(h.total_mins/60*10)/10}h this week`).join('\n')
    : '  - No habit data this week';

  const pendingWeekList = pendingSessions.length > 0
    ? pendingSessions.map(s => `  - ${s.date}: ${s.subject} (${s.hours}h, ${s.slot})`).join('\n')
    : '  - None pending';

  return `You are an expert UPSC mentor and AI tutor for ${user?.name || 'this aspirant'}. You have FULL ACCESS to their real study data. Use it to give hyper-personalized, data-driven advice.

═══ ASPIRANT PROFILE ═══
Name: ${user?.name || 'Aspirant'}
Date: ${todayStr}
Daily Study Target: ${dailyTarget} hours
Study Slots Configured: ${slots}
Subjects Being Tracked: ${trackedSubjects}
Current Study Streak: ${streak} days

═══ TODAY'S DATA ═══
Hours Completed Today: ${todayHours.toFixed(1)}h / ${dailyTarget}h target (${Math.round(todayHours/dailyTarget*100)}%)
Completed Sessions:
${todaySessionsList}
Pending Sessions (not done yet):
${pendingList}
Carried Forward Sessions:
${cfList}

═══ THIS WEEK ═══
Total Hours This Week: ${weekHours.toFixed(1)}h
Pending from this week:
${pendingWeekList}

═══ THIS MONTH ═══
Total Hours This Month: ${monthHours.toFixed(1)}h
Subject Breakdown:
${monthlyList}

═══ ALL TIME SUBJECT HOURS ═══
${allTimeList}

═══ NON-STUDY HABITS THIS WEEK ═══
${habitList}

═══ YOUR ROLE AS MENTOR ═══
1. ALWAYS reference their actual data — mention specific subjects, hours, pending sessions by name
2. If they are behind target today, tell them exactly how many hours they need to catch up
3. Compare their pace with UPSC toppers (Tina Dabi: 15h/day, Srushti Deshmukh: focused on GS4+Essay)
4. If a subject has low hours, flag it specifically with a recovery plan
5. If they have pending sessions, acknowledge them and suggest when to complete
6. If habit time is high vs study time, gently flag the imbalance
7. Give concrete, actionable plans — not generic advice
8. Reference real resources: Laxmikant (Polity), NCERT (basics), The Hindu (current affairs), Vision IAS, Vajiram
9. Keep responses focused — 3-5 paragraphs max, use bullet points for plans
10. Always end with ONE specific action for TODAY based on their actual pending/incomplete sessions

IMPORTANT: Never give generic UPSC advice. Always tie it back to their specific data shown above.`;
};

// POST — chat with AI
router.post('/chat', auth, async (req, res) => {
  try {
    const { messages } = req.body;

    // Fetch real user context fresh every time
    const ctx = await getUserContext(req.user.id);
    const systemPrompt = buildSystemPrompt(ctx);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 1024,
        temperature: 0.7,
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content
      || 'Sorry, I could not generate a response. Please try again.';

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;