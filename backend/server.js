const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const targetRoutes = require('./routes/targets');
const overviewRoutes = require('./routes/overview');
const weeklyRoutes = require('./routes/weekly');
const subscriptionRoutes = require('./routes/subscription');
const habitsRoutes = require('./routes/habits');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) callback(null, true);
    else callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/weekly', weeklyRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/habits', habitsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`UPSC Tracker API running on port ${PORT}`));