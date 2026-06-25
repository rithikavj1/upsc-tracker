const router = require('express').Router();
const auth = require('../middleware/auth');

router.post('/chat', auth, async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;

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
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })
    });

    const data = await response.json();
    console.log('Groq response:', JSON.stringify(data));
    const reply = data.choices?.[0]?.message?.content
      || 'Sorry, I could not generate a response. Please try again.';

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;