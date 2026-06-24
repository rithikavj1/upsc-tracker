// backend/routes/subscription.js
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET — current subscription status
router.get('/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT subscription_status, trial_start, trial_end,
       razorpay_subscription_id, subscription_end, is_paused
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const trialEnd = new Date(user.trial_end);
    const daysLeft = Math.ceil((trialEnd - now) / (1000*60*60*24));

    res.json({
      status: user.subscription_status,
      trial_end: user.trial_end,
      trial_days_left: Math.max(0, daysLeft),
      subscription_id: user.razorpay_subscription_id,
      subscription_end: user.subscription_end,
      is_paused: user.is_paused,
      is_trial_active: user.subscription_status === 'trial' && daysLeft > 0,
      is_pro: user.subscription_status === 'active',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — create Razorpay subscription (₹1 auth + ₹299/month)
router.post('/create', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];

    // Create Razorpay customer
    let customerId = user.razorpay_customer_id;
if (!customerId) {
  try {
    const customer = await razorpay.customers.create({
      name: user.name,
      email: user.email,
      contact: req.body.phone || '',
    });
    customerId = customer.id;
  } catch (custErr) {
    // Customer already exists — fetch by email
    const customers = await razorpay.customers.all({ count: 1 });
    const existing = customers.items?.find(c => c.email === user.email);
    if (existing) {
      customerId = existing.id;
    } else {
      throw new Error('Could not create or find customer');
    }
  }
  await pool.query('UPDATE users SET razorpay_customer_id=$1 WHERE id=$2', [customerId, user.id]);
}

    // Create subscription with 30 day trial
    const plan = req.body.plan === 'yearly'
  ? process.env.RAZORPAY_PLAN_ID_YEARLY
  : process.env.RAZORPAY_PLAN_ID_MONTHLY;

const subscription = await razorpay.subscriptions.create({
  plan_id: plan,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // 10 years max
      addons: [{
        item: {
          name: 'Subscription Registration',
          amount: 100, // ₹1 in paise
          currency: 'INR',
        }
      }],
      notes: {
        user_id: req.user.id.toString(),
        user_email: user.email,
      }
    });

    await pool.query(
      `UPDATE users SET razorpay_subscription_id=$1, subscription_status='pending'
       WHERE id=$2`,
      [subscription.id, req.user.id]
    );

    res.json({
      subscription_id: subscription.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      user_name: user.name,
      user_email: user.email,
    });
  } catch (err) {
    console.error('Subscription create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST — verify payment after Razorpay checkout
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + 1);

    await pool.query(
      `UPDATE users SET
       subscription_status='active',
       razorpay_subscription_id=$1,
       subscription_end=$2,
       is_paused=false
       WHERE id=$3`,
      [razorpay_subscription_id, subEnd, req.user.id]
    );

    res.json({ success: true, message: 'Subscription activated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — pause subscription
router.post('/pause', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user.razorpay_subscription_id) return res.status(400).json({ error: 'No active subscription' });

    await razorpay.subscriptions.pause(user.razorpay_subscription_id, {
      pause_at: 'now'
    });

    await pool.query('UPDATE users SET is_paused=true WHERE id=$1', [req.user.id]);
    res.json({ success: true, message: 'Subscription paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — resume subscription
router.post('/resume', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user.razorpay_subscription_id) return res.status(400).json({ error: 'No subscription found' });

    await razorpay.subscriptions.resume(user.razorpay_subscription_id, {
      resume_at: 'now'
    });

    await pool.query('UPDATE users SET is_paused=false WHERE id=$1', [req.user.id]);
    res.json({ success: true, message: 'Subscription resumed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user.razorpay_subscription_id) return res.status(400).json({ error: 'No subscription found' });

    await razorpay.subscriptions.cancel(user.razorpay_subscription_id);

    await pool.query(
      `UPDATE users SET subscription_status='cancelled', is_paused=false WHERE id=$1`,
      [req.user.id]
    );
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Razorpay webhook (no auth middleware)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const sub = req.body.payload?.subscription?.entity;
    if (!sub) return res.json({ received: true });

    const subId = sub.id;

    if (event === 'subscription.activated') {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      await pool.query(
        `UPDATE users SET subscription_status='active', subscription_end=$1, is_paused=false
         WHERE razorpay_subscription_id=$2`,
        [end, subId]
      );
    }

    if (event === 'subscription.charged') {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      await pool.query(
        `UPDATE users SET subscription_status='active', subscription_end=$1
         WHERE razorpay_subscription_id=$2`,
        [end, subId]
      );
    }

    if (event === 'subscription.cancelled') {
      await pool.query(
        `UPDATE users SET subscription_status='cancelled'
         WHERE razorpay_subscription_id=$1`,
        [subId]
      );
    }

    if (event === 'subscription.paused') {
      await pool.query(
        `UPDATE users SET is_paused=true WHERE razorpay_subscription_id=$1`,
        [subId]
      );
    }

    if (event === 'subscription.resumed') {
      await pool.query(
        `UPDATE users SET is_paused=false, subscription_status='active'
         WHERE razorpay_subscription_id=$1`,
        [subId]
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
