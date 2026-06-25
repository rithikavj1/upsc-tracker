const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ── Web search using DuckDuckGo (no API key needed) ───────────────────────
const searchWeb = async (query) => {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': 'UPSC-Tracker-AI/1.0' } }
    );
    const data = await res.json();

    const results = [];

    // Abstract (main result)
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText.slice(0, 200),
        source: data.AbstractSource || 'Web',
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 5).forEach(t => {
        if (t.FirstURL && t.Text) {
          results.push({
            title: t.Text.slice(0, 80),
            url: t.FirstURL,
            snippet: t.Text.slice(0, 200),
            source: 'DuckDuckGo',
          });
        }
      });
    }

    // Also search for UPSC-specific resources
    const upscRes = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}+UPSC+site:drishtiias.com+OR+site:insightsonindia.com+OR+site:clearias.com&format=json&no_redirect=1&no_html=1`,
      { headers: { 'User-Agent': 'UPSC-Tracker-AI/1.0' } }
    );
    const upscData = await upscRes.json();
    if (upscData.AbstractURL) {
      results.push({
        title: upscData.Heading || 'UPSC Resource',
        url: upscData.AbstractURL,
        snippet: upscData.AbstractText?.slice(0, 200) || '',
        source: upscData.AbstractSource || 'UPSC Resource',
      });
    }

    return results.filter(r => r.url && r.title);
  } catch (e) {
    console.error('Search error:', e.message);
    return [];
  }
};

// ── Detect if query needs web search ─────────────────────────────────────
const needsSearch = (message) => {
  const triggers = [
    'article', 'link', 'pdf', 'download', 'read', 'source', 'resource',
    'website', 'where can i', 'find me', 'search', 'topper answer',
    'topper copy', 'answer copy', 'model answer', 'sample answer',
    'vision ias', 'vajiram', 'drishti', 'insights', 'the hindu',
    'ncert', 'laxmikant', 'spectrum', 'previous year', 'pyq',
    'question paper', 'upsc paper', 'mains paper', 'prelims paper',
    'notes', 'study material', 'book', 'magazine', 'yojana', 'kurukshetra',
  ];
  const lower = message.toLowerCase();
  return triggers.some(t => lower.includes(t));
};

// ── Build UPSC resource links based on topic ──────────────────────────────
const getUPSCResourceLinks = (message) => {
  const lower = message.toLowerCase();
  const links = [];

  if (lower.includes('polity') || lower.includes('constitution')) {
    links.push(
      { title: 'Laxmikant Polity Summary — ClearIAS', url: 'https://www.clearias.com/indian-polity-by-m-laxmikant/', source: 'ClearIAS' },
      { title: 'Polity Notes — Drishti IAS', url: 'https://www.drishtiias.com/hindi/mains-practice-question/search?q=polity', source: 'Drishti IAS' },
    );
  }
  if (lower.includes('history') || lower.includes('ancient') || lower.includes('medieval') || lower.includes('modern')) {
    links.push(
      { title: 'History Notes — Insights IAS', url: 'https://www.insightsonindia.com/indian-history/', source: 'Insights IAS' },
      { title: 'NCERT History Books (Free PDF)', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT' },
    );
  }
  if (lower.includes('geography')) {
    links.push(
      { title: 'Geography Notes — ClearIAS', url: 'https://www.clearias.com/geography/', source: 'ClearIAS' },
      { title: 'NCERT Geography PDFs', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT' },
    );
  }
  if (lower.includes('economics') || lower.includes('economy')) {
    links.push(
      { title: 'Economy Notes — Insights IAS', url: 'https://www.insightsonindia.com/indian-economy/', source: 'Insights IAS' },
      { title: 'Economic Survey — Ministry of Finance', url: 'https://www.indiabudget.gov.in/economicsurvey/', source: 'Govt of India' },
    );
  }
  if (lower.includes('environment') || lower.includes('ecology')) {
    links.push(
      { title: 'Environment Notes — Drishti IAS', url: 'https://www.drishtiias.com/hindi/mains-practice-question/search?q=environment', source: 'Drishti IAS' },
      { title: 'Environment & Ecology — ClearIAS', url: 'https://www.clearias.com/environment/', source: 'ClearIAS' },
    );
  }
  if (lower.includes('current affairs') || lower.includes('the hindu') || lower.includes('news')) {
    links.push(
      { title: 'Daily Current Affairs — Insights IAS', url: 'https://www.insightsonindia.com/current-affairs/', source: 'Insights IAS' },
      { title: 'Current Affairs — Drishti IAS', url: 'https://www.drishtiias.com/current-affairs-news-analysis-editorials', source: 'Drishti IAS' },
      { title: 'The Hindu News Analysis — ForumIAS', url: 'https://forumias.com/blog/category/news/', source: 'ForumIAS' },
    );
  }
  if (lower.includes('topper') || lower.includes('answer copy') || lower.includes('model answer') || lower.includes('mains answer')) {
    links.push(
      { title: 'UPSC Topper Answer Copies — UPSC Official', url: 'https://upsc.gov.in/examinations/marksheet', source: 'UPSC.gov.in' },
      { title: 'Tina Dabi Rank 1 Strategy — InsightsIAS', url: 'https://www.insightsonindia.com/2016/05/27/tina-dabi-ias-rank-1-strategy/', source: 'Insights IAS' },
      { title: 'UPSC Mains Answer Copies — Vision IAS', url: 'https://www.visionias.in/resources/', source: 'Vision IAS' },
      { title: 'Previous Year Mains Q&A — ClearIAS', url: 'https://www.clearias.com/upsc-mains-previous-years-questions/', source: 'ClearIAS' },
    );
  }
  if (lower.includes('pyq') || lower.includes('previous year') || lower.includes('question paper')) {
    links.push(
      { title: 'UPSC Previous Year Papers — Official', url: 'https://upsc.gov.in/examinations/previous-question-papers', source: 'UPSC Official' },
      { title: 'Prelims PYQ — ClearIAS', url: 'https://www.clearias.com/upsc-civil-services-exam-previous-year-questions/', source: 'ClearIAS' },
    );
  }
  if (lower.includes('ncert')) {
    links.push(
      { title: 'NCERT Free PDF Download — Official', url: 'https://ncert.nic.in/textbook.php', source: 'NCERT Official' },
    );
  }
  if (lower.includes('essay')) {
    links.push(
      { title: 'UPSC Essay Strategy & Samples — ForumIAS', url: 'https://forumias.com/blog/category/essay/', source: 'ForumIAS' },
      { title: 'Essay Writing Tips — InsightsIAS', url: 'https://www.insightsonindia.com/essay/', source: 'Insights IAS' },
    );
  }
  if (lower.includes('ethics') || lower.includes('gs4')) {
    links.push(
      { title: 'Ethics Case Studies — Insights IAS', url: 'https://www.insightsonindia.com/ethics-integrity-and-aptitude/', source: 'Insights IAS' },
    );
  }

  // Always add general resources
  links.push(
    { title: 'UPSC Official Website', url: 'https://upsc.gov.in', source: 'UPSC' },
  );

  return links;
};

// ── Fetch real user context ───────────────────────────────────────────────
const getUserContext = async (userId) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const [
    userRes, settingsRes, todaySessionsRes,
    weeklySessionsRes, monthlyStatsRes, streakRes,
    subjectHoursRes, pendingRes, habitRes,
  ] = await Promise.all([
    pool.query(`SELECT name, email, subscription_status FROM users WHERE id=$1`, [userId]),
    pool.query(`SELECT settings FROM user_settings WHERE user_id=$1`, [userId]).catch(() => ({ rows: [] })),
    pool.query(`SELECT subject, hours, slot, activity_type, notes, status FROM study_sessions WHERE user_id=$1 AND date=$2 ORDER BY created_at`, [userId, todayStr]),
    pool.query(`SELECT date, subject, hours, slot, activity_type, status FROM study_sessions WHERE user_id=$1 AND date >= $2 AND date <= $3 ORDER BY date DESC`, [userId, new Date(today.getTime() - 7*24*60*60*1000).toISOString().slice(0,10), todayStr]),
    pool.query(`SELECT subject, SUM(hours)::float as total_hours, COUNT(*)::int as sessions, SUM(CASE WHEN status='Done' OR status IS NULL THEN hours ELSE 0 END)::float as completed_hours FROM study_sessions WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 GROUP BY subject ORDER BY total_hours DESC`, [userId, month, year]),
    pool.query(`SELECT COUNT(DISTINCT date)::int as streak FROM study_sessions WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '30 days'`, [userId]),
    pool.query(`SELECT subject, SUM(hours)::float as total_hours FROM study_sessions WHERE user_id=$1 GROUP BY subject ORDER BY total_hours DESC`, [userId]),
    pool.query(`SELECT date, subject, hours, slot FROM study_sessions WHERE user_id=$1 AND status='Pending' AND date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY date DESC`, [userId]),
    pool.query(`SELECT hc.name, SUM(hl.duration_minutes)::int as total_mins FROM habit_logs hl JOIN habit_categories hc ON hl.category_id = hc.id WHERE hl.user_id=$1 AND hl.date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY hc.name ORDER BY total_mins DESC`, [userId]).catch(() => ({ rows: [] })),
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

  const doneSessions = todaySessions.filter(s => !s.status || s.status === 'Done');
  const todayHours = doneSessions.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const todayPending = todaySessions.filter(s => s.status === 'Pending');
  const todayCF = todaySessions.filter(s => s.status === 'Carry Forward');
  const weekHours = weekSessions.filter(s => !s.status || s.status === 'Done').reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const monthHours = monthlySubjects.reduce((s, r) => s + (r.completed_hours || 0), 0);
  const dailyTarget = settings?.daily_hour_target || 8;
  const slots = settings?.slots ? settings.slots.filter(s => s.enabled).map(s => `${s.label} (${s.start}–${s.end})`).join(', ') : 'Morning, Afternoon, Evening';
  const trackedSubjects = settings?.subjects ? settings.subjects.map(s => s.name).join(', ') : allSubjectHours.map(s => s.subject).join(', ') || 'Polity, History, Geography, Economics';

  return { user, todayStr, dailyTarget, slots, trackedSubjects, todayHours, todayPending, todayCF, doneSessions, weekHours, monthHours, monthlySubjects, allSubjectHours, pendingSessions, habitData, streak };
};

const buildSystemPrompt = (ctx, searchResults, resourceLinks) => {
  const { user, todayStr, dailyTarget, slots, trackedSubjects, todayHours, todayPending, todayCF, doneSessions, weekHours, monthHours, monthlySubjects, allSubjectHours, pendingSessions, habitData, streak } = ctx;

  const todaySessionsList = doneSessions.length > 0
    ? doneSessions.map(s => `  - ${s.subject}: ${s.hours}h (${s.slot || 'no slot'}) [${s.activity_type || 'study'}]`).join('\n')
    : '  - No sessions completed yet today';

  const pendingList = todayPending.length > 0 ? todayPending.map(s => `  - ${s.subject}: ${s.hours}h (${s.slot})`).join('\n') : '  - None';
  const monthlyList = monthlySubjects.length > 0 ? monthlySubjects.map(s => `  - ${s.subject}: ${s.completed_hours?.toFixed(1)}h`).join('\n') : '  - No data';
  const allTimeList = allSubjectHours.length > 0 ? allSubjectHours.map(s => `  - ${s.subject}: ${s.total_hours?.toFixed(1)}h`).join('\n') : '  - No data';
  const habitList = habitData.length > 0 ? habitData.map(h => `  - ${h.name}: ${Math.round(h.total_mins/60*10)/10}h`).join('\n') : '  - No habit data';

  const searchSection = searchResults.length > 0
    ? `\n═══ WEB SEARCH RESULTS (use these for links) ═══\n${searchResults.map(r => `  - ${r.title}: ${r.url}`).join('\n')}`
    : '';

  const resourceSection = resourceLinks.length > 0
    ? `\n═══ UPSC RESOURCE LINKS ═══\n${resourceLinks.map(r => `  - ${r.title} (${r.source}): ${r.url}`).join('\n')}`
    : '';

  return `You are an expert UPSC mentor for ${user?.name || 'this aspirant'}. You have their REAL study data and relevant web resources.

═══ ASPIRANT DATA ═══
Name: ${user?.name}, Date: ${todayStr}, Daily Target: ${dailyTarget}h, Streak: ${streak} days
Slots: ${slots}, Subjects: ${trackedSubjects}
Today Completed: ${todayHours.toFixed(1)}h (${Math.round(todayHours/dailyTarget*100)}% of target)
Today Sessions: ${todaySessionsList}
Pending Today: ${pendingList}
Carried Forward: ${todayCF.length > 0 ? todayCF.map(s => s.subject).join(', ') : 'None'}
This Week: ${weekHours.toFixed(1)}h, This Month: ${monthHours.toFixed(1)}h
Monthly Subjects: ${monthlyList}
All Time Hours: ${allTimeList}
Habits This Week: ${habitList}
${searchSection}
${resourceSection}

═══ YOUR ROLE ═══
1. ALWAYS reference their actual data — mention specific subjects and hours
2. When you have resource links, include them in your response as clickable markdown: [Title](URL)
3. For topper answers/articles — provide the actual links from resources above
4. If asked for PDF — mention they can download from the links provided
5. Compare their pace with toppers when relevant
6. Give concrete plans based on their weak subjects (lowest hours)
7. Keep responses focused — use bullet points
8. End with ONE specific action for TODAY

IMPORTANT: When sharing links, format them as: [Link Title](https://url.com) so they render as clickable links.`;
};

// POST — chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { messages } = req.body;
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

    // Fetch user context + search in parallel
    const shouldSearch = needsSearch(lastUserMsg);
    const [ctx, searchResults] = await Promise.all([
      getUserContext(req.user.id),
      shouldSearch ? searchWeb(lastUserMsg + ' UPSC') : Promise.resolve([]),
    ]);

    const resourceLinks = shouldSearch ? getUPSCResourceLinks(lastUserMsg) : [];
    const systemPrompt = buildSystemPrompt(ctx, searchResults, resourceLinks);

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
          ...messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 1500,
        temperature: 0.7,
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Extract links from reply for frontend to show as buttons
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const links = [];
    let match;
    while ((match = linkRegex.exec(reply)) !== null) {
      links.push({ title: match[1], url: match[2] });
    }

    // Also include resource links if search was triggered
    if (shouldSearch) {
      resourceLinks.forEach(l => {
        if (!links.find(x => x.url === l.url)) {
          links.push({ title: l.title, url: l.url, source: l.source });
        }
      });
    }

    res.json({ reply, links, hasResources: links.length > 0 });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;