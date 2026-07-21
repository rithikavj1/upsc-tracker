const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ── Curated UPSC resource database (always valid links) ───────────────────
const UPSC_RESOURCES = {
  polity: [
    { title: 'Laxmikant Polity Notes — ClearIAS', url: 'https://www.clearias.com/indian-polity-by-m-laxmikant/', source: 'ClearIAS' },
    { title: 'Indian Polity Notes — Drishti IAS', url: 'https://www.drishtiias.com/mains-practice-question/search?q=polity', source: 'Drishti IAS' },
    { title: 'Polity MCQs — Insights IAS', url: 'https://www.insightsonindia.com/polity/', source: 'Insights IAS' },
  ],
  history: [
    { title: 'NCERT History Books (Free PDF) — Class 6–12', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT Official' },
    { title: 'Modern History Notes — ClearIAS', url: 'https://www.clearias.com/modern-history/', source: 'ClearIAS' },
    { title: 'History Notes — Insights IAS', url: 'https://www.insightsonindia.com/indian-history/', source: 'Insights IAS' },
    { title: 'Art & Culture — Drishti IAS', url: 'https://www.drishtiias.com/mains-practice-question/search?q=history', source: 'Drishti IAS' },
  ],
  geography: [
    { title: 'NCERT Geography PDFs — Official', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT Official' },
    { title: 'Geography Notes — ClearIAS', url: 'https://www.clearias.com/geography/', source: 'ClearIAS' },
    { title: 'Physical Geography — Insights IAS', url: 'https://www.insightsonindia.com/geography/', source: 'Insights IAS' },
  ],
  economics: [
    { title: 'Economic Survey 2023–24 — Govt of India', url: 'https://www.indiabudget.gov.in/economicsurvey/', source: 'Ministry of Finance' },
    { title: 'Indian Economy Notes — ClearIAS', url: 'https://www.clearias.com/economy/', source: 'ClearIAS' },
    { title: 'Economy Notes — Insights IAS', url: 'https://www.insightsonindia.com/indian-economy/', source: 'Insights IAS' },
    { title: 'Budget 2024 — Official', url: 'https://www.indiabudget.gov.in/', source: 'Govt of India' },
  ],
  environment: [
    { title: 'Environment & Ecology — ClearIAS', url: 'https://www.clearias.com/environment/', source: 'ClearIAS' },
    { title: 'Environment Notes — Drishti IAS', url: 'https://www.drishtiias.com/mains-practice-question/search?q=environment', source: 'Drishti IAS' },
    { title: 'Biodiversity Notes — Insights IAS', url: 'https://www.insightsonindia.com/environment/', source: 'Insights IAS' },
  ],
  current_affairs: [
    { title: 'Daily Current Affairs — Insights IAS', url: 'https://www.insightsonindia.com/current-affairs/', source: 'Insights IAS' },
    { title: 'Daily News Analysis — Drishti IAS', url: 'https://www.drishtiias.com/current-affairs-news-analysis-editorials', source: 'Drishti IAS' },
    { title: 'Current Affairs — ClearIAS', url: 'https://www.clearias.com/current-affairs/', source: 'ClearIAS' },
    { title: 'The Hindu Analysis — ForumIAS', url: 'https://forumias.com/blog/category/news/', source: 'ForumIAS' },
    { title: 'PIB News Summary — PIB India', url: 'https://pib.gov.in/Allrel.aspx', source: 'PIB Official' },
  ],
  magazine: [
    { title: 'Vision IAS Monthly Current Affairs Magazine', url: 'https://www.visionias.in/resources/current-affairs', source: 'Vision IAS' },
    { title: 'Drishti IAS Monthly Magazine (Free)', url: 'https://www.drishtiias.com/current-affairs-news-analysis-editorials/monthly-current-affairs', source: 'Drishti IAS' },
    { title: 'Insights IAS Monthly Compilation', url: 'https://www.insightsonindia.com/category/monthly-current-affairs/', source: 'Insights IAS' },
    { title: 'ForumIAS Monthly CA Compilation', url: 'https://forumias.com/blog/category/monthly-current-affairs/', source: 'ForumIAS' },
    { title: 'Yojana Magazine — Official (Free PDF)', url: 'https://yojana.gov.in/', source: 'Govt of India' },
    { title: 'Kurukshetra Magazine — Official (Free PDF)', url: 'https://kurukshetra.nic.in/', source: 'Govt of India' },
    { title: 'ClearIAS Monthly Current Affairs PDF', url: 'https://www.clearias.com/current-affairs/', source: 'ClearIAS' },
  ],
  topper: [
    { title: 'UPSC Topper Answer Sheets — Official UPSC', url: 'https://upsc.gov.in/examinations/marksheet', source: 'UPSC Official' },
    { title: 'Tina Dabi AIR 1 Strategy & Notes', url: 'https://www.insightsonindia.com/2016/05/27/tina-dabi-ias-rank-1-strategy/', source: 'Insights IAS' },
    { title: 'Srushti Deshmukh AIR 5 Strategy', url: 'https://www.drishtiias.com/blog/srushti-jayant-deshmukh-upsc-topper', source: 'Drishti IAS' },
    { title: 'Kanishak Kataria AIR 1 CSE 2018 Strategy', url: 'https://forumias.com/blog/kanishak-kataria-rank-1-cse-2018-strategy/', source: 'ForumIAS' },
    { title: 'Topper Answer Copies — Vision IAS', url: 'https://www.visionias.in/resources/', source: 'Vision IAS' },
    { title: 'Mains Answer Writing — Insights IAS', url: 'https://www.insightsonindia.com/ias-preparation/answer-writing/', source: 'Insights IAS' },
  ],
  pyq: [
    { title: 'UPSC Previous Year Papers — Official', url: 'https://upsc.gov.in/examinations/previous-question-papers', source: 'UPSC Official' },
    { title: 'Prelims PYQ 1995–2023 — ClearIAS', url: 'https://www.clearias.com/upsc-civil-services-exam-previous-year-questions/', source: 'ClearIAS' },
    { title: 'Mains PYQ Subject-wise — Insights IAS', url: 'https://www.insightsonindia.com/ias-preparation/previous-years-question-papers/', source: 'Insights IAS' },
    { title: 'GS Mains PYQ — Drishti IAS', url: 'https://www.drishtiias.com/mains-practice-question/question-for-gs-paper-1', source: 'Drishti IAS' },
  ],
  ncert: [
    { title: 'NCERT All Books Free PDF — Official', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT Official' },
    { title: 'NCERT Notes for UPSC — ClearIAS', url: 'https://www.clearias.com/ncert-notes/', source: 'ClearIAS' },
    { title: 'NCERT Summary — Insights IAS', url: 'https://www.insightsonindia.com/ncert-notes/', source: 'Insights IAS' },
  ],
  essay: [
    { title: 'Essay Strategy & Samples — ForumIAS', url: 'https://forumias.com/blog/category/essay/', source: 'ForumIAS' },
    { title: 'Essay Writing Tips — Insights IAS', url: 'https://www.insightsonindia.com/essay/', source: 'Insights IAS' },
    { title: 'Essay Topics — Drishti IAS', url: 'https://www.drishtiias.com/mains-practice-question/essay', source: 'Drishti IAS' },
  ],
  ethics: [
    { title: 'Ethics Case Studies GS4 — Insights IAS', url: 'https://www.insightsonindia.com/ethics-integrity-and-aptitude/', source: 'Insights IAS' },
    { title: 'Ethics Notes — ClearIAS', url: 'https://www.clearias.com/ethics/', source: 'ClearIAS' },
  ],
  science: [
    { title: 'Science & Tech Notes — ClearIAS', url: 'https://www.clearias.com/science-and-technology/', source: 'ClearIAS' },
    { title: 'Science & Tech — Insights IAS', url: 'https://www.insightsonindia.com/science-and-technology/', source: 'Insights IAS' },
  ],
  general: [
    { title: 'UPSC Official Website', url: 'https://upsc.gov.in', source: 'UPSC Official' },
    { title: 'UPSC Syllabus PDF — Official', url: 'https://upsc.gov.in/examinations/syllabus-materials', source: 'UPSC Official' },
    { title: 'IASbaba Free Resources', url: 'https://www.iasbaba.com/', source: 'IASbaba' },
    { title: 'ForumIAS Free Resources', url: 'https://forumias.com/', source: 'ForumIAS' },
  ],
};

// ── Detect query type and return relevant links ───────────────────────────
const getResourceLinks = (message) => {
  const lower = message.toLowerCase();
  const links = [];
  const added = new Set();

  const add = (category) => {
    (UPSC_RESOURCES[category] || []).forEach(l => {
      if (!added.has(l.url)) { links.push(l); added.add(l.url); }
    });
  };

  if (lower.includes('magazine') || lower.includes('monthly') || lower.includes('compilation')) add('magazine');
  if (lower.includes('topper') || lower.includes('answer copy') || lower.includes('model answer') || lower.includes('rank 1')) add('topper');
  if (lower.includes('pyq') || lower.includes('previous year') || lower.includes('question paper') || lower.includes('past paper')) add('pyq');
  if (lower.includes('ncert')) add('ncert');
  if (lower.includes('polity') || lower.includes('constitution') || lower.includes('governance')) add('polity');
  if (lower.includes('history') || lower.includes('ancient') || lower.includes('medieval') || lower.includes('modern history')) add('history');
  if (lower.includes('geography') || lower.includes('geog')) add('geography');
  if (lower.includes('economy') || lower.includes('economics') || lower.includes('budget')) add('economics');
  if (lower.includes('environment') || lower.includes('ecology') || lower.includes('biodiversity')) add('environment');
  if (lower.includes('current affairs') || lower.includes('news') || lower.includes('the hindu') || lower.includes('editorial')) add('current_affairs');
  if (lower.includes('essay')) add('essay');
  if (lower.includes('ethics') || lower.includes('gs4') || lower.includes('gs 4')) add('ethics');
  if (lower.includes('science') || lower.includes('technology') || lower.includes('gs3') || lower.includes('gs 3')) add('science');

  // Always add a few general ones if no specific match
  if (links.length === 0) add('general');

  return links.slice(0, 10);
};

const needsResources = (message) => {
  const triggers = ['article', 'link', 'pdf', 'download', 'resource', 'website', 'where', 'find',
    'topper', 'answer copy', 'model answer', 'vision ias', 'vajiram', 'drishti', 'insights',
    'the hindu', 'ncert', 'laxmikant', 'spectrum', 'previous year', 'pyq', 'question paper',
    'notes', 'study material', 'book', 'magazine', 'yojana', 'kurukshetra', 'monthly',
    'compilation', 'current affairs', 'read', 'source', 'material'];
  return triggers.some(t => message.toLowerCase().includes(t));
};

// ── User context ──────────────────────────────────────────────────────────
const getUserContext = async (userId) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const [userRes, settingsRes, todaySessionsRes, monthlyStatsRes, streakRes, subjectHoursRes, pendingRes, habitRes] = await Promise.all([
    pool.query(`SELECT name, email FROM users WHERE id=$1`, [userId]),
    pool.query(`SELECT settings FROM user_settings WHERE user_id=$1`, [userId]).catch(() => ({ rows: [] })),
    pool.query(`SELECT subject, hours, slot, activity_type, status FROM study_sessions WHERE user_id=$1 AND date=$2 ORDER BY created_at`, [userId, todayStr]),
    pool.query(`SELECT subject, SUM(CASE WHEN status='Done' OR status IS NULL THEN hours ELSE 0 END)::float as completed_hours, COUNT(*)::int as sessions FROM study_sessions WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 GROUP BY subject ORDER BY completed_hours DESC`, [userId, month, year]),
    pool.query(`SELECT COUNT(DISTINCT date)::int as streak FROM study_sessions WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '30 days'`, [userId]),
    pool.query(`SELECT subject, SUM(hours)::float as total_hours FROM study_sessions WHERE user_id=$1 GROUP BY subject ORDER BY total_hours DESC`, [userId]),
    pool.query(`SELECT date, subject, hours, slot FROM study_sessions WHERE user_id=$1 AND status='Pending' AND date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY date DESC`, [userId]),
    pool.query(`SELECT hc.name, SUM(hl.duration_minutes)::int as total_mins FROM habit_logs hl JOIN habit_categories hc ON hl.category_id=hc.id WHERE hl.user_id=$1 AND hl.date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY hc.name`, [userId]).catch(() => ({ rows: [] })),
  ]);

  const settings = settingsRes.rows[0]?.settings || {};
  const todaySessions = todaySessionsRes.rows;
  const doneSessions = todaySessions.filter(s => !s.status || s.status === 'Done');
  const todayHours = doneSessions.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const todayPending = todaySessions.filter(s => s.status === 'Pending');
  const monthHours = monthlyStatsRes.rows.reduce((s, r) => s + (r.completed_hours || 0), 0);
  const dailyTarget = settings?.daily_hour_target || 8;
  const slots = settings?.slots ? settings.slots.filter(s => s.enabled).map(s => `${s.label} (${s.start}–${s.end})`).join(', ') : 'Morning, Afternoon, Evening';
  const trackedSubjects = settings?.subjects ? settings.subjects.map(s => s.name).join(', ') : subjectHoursRes.rows.map(s => s.subject).join(', ') || 'Polity, History, Geography';

  return {
    user: userRes.rows[0], todayStr, dailyTarget, slots, trackedSubjects,
    todayHours, todayPending, doneSessions,
    monthHours, monthlySubjects: monthlyStatsRes.rows,
    allSubjectHours: subjectHoursRes.rows,
    pendingSessions: pendingRes.rows,
    habitData: habitRes.rows,
    streak: streakRes.rows[0]?.streak || 0,
  };
};

const buildSystemPrompt = (ctx, resourceLinks) => {
  const { user, todayStr, dailyTarget, slots, trackedSubjects, todayHours, todayPending, doneSessions, monthHours, monthlySubjects, allSubjectHours, pendingSessions, habitData, streak } = ctx;

  const resourceSection = resourceLinks.length > 0
    ? `\n═══ VERIFIED UPSC RESOURCE LINKS (share these with the user) ═══\n${resourceLinks.map(r => `  - [${r.title}](${r.url}) — ${r.source}`).join('\n')}`
    : '';

  return `You are an expert UPSC mentor for ${user?.name || 'this aspirant'} with access to their REAL study data.

═══ ASPIRANT DATA ═══
Name: ${user?.name}, Date: ${todayStr}, Target: ${dailyTarget}h/day, Streak: ${streak} days
Slots: ${slots}, Subjects: ${trackedSubjects}
Today Done: ${todayHours.toFixed(1)}h (${Math.round(todayHours/dailyTarget*100)}% of target)
Completed: ${doneSessions.map(s=>`${s.subject} ${s.hours}h`).join(', ') || 'None'}
Pending Today: ${todayPending.map(s=>`${s.subject} ${s.hours}h`).join(', ') || 'None'}
This Month: ${monthHours.toFixed(1)}h | Subjects: ${monthlySubjects.map(s=>`${s.subject} ${s.completed_hours?.toFixed(1)}h`).join(', ')}
All Time: ${allSubjectHours.map(s=>`${s.subject} ${s.total_hours?.toFixed(1)}h`).join(', ')}
Habits This Week: ${habitData.map(h=>`${h.name} ${Math.round(h.total_mins/60*10)/10}h`).join(', ') || 'None'}
${resourceSection}

═══ YOUR ROLE ═══
1. Always reference their REAL data — mention specific subjects, hours, pending by name
2. When you have resource links above, include ALL of them in your response using markdown: [Title](URL)
3. For magazines/current affairs — list the specific monthly magazine links
4. Compare their pace with toppers when relevant
5. Flag weak subjects (lowest hours) with specific recovery plans
6. Keep responses focused with bullet points
7. End with ONE specific action for TODAY

CRITICAL: When sharing links, ALWAYS use proper markdown format: [Link Title](https://url.com)
Never make up URLs — only use the verified links provided above.`;
};

// POST — chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { messages } = req.body;
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const shouldGetResources = needsResources(lastUserMsg);

    const [ctx, resourceLinks] = await Promise.all([
      getUserContext(req.user.id),
      Promise.resolve(shouldGetResources ? getResourceLinks(lastUserMsg) : []),
    ]);

    const systemPrompt = buildSystemPrompt(ctx, resourceLinks);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 1500,
        temperature: 0.7,
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Extract markdown links from reply
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const extractedLinks = [];
    let match;
    while ((match = linkRegex.exec(reply)) !== null) {
      extractedLinks.push({ title: match[1], url: match[2] });
    }

    // Merge with resource links (deduplicated)
    const allLinks = [...extractedLinks];
    resourceLinks.forEach(l => {
      if (!allLinks.find(x => x.url === l.url)) allLinks.push(l);
    });

    res.json({ reply, links: allLinks, hasResources: allLinks.length > 0 });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;