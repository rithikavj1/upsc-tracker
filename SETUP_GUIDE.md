# UPSC Tracker — Complete Setup Guide

## What you're building
A full-stack UPSC study tracker with:
- **Login / Register** page with email & password
- **Dashboard** — streak, daily + monthly progress, heatmap
- **Daily Tracker** — log sessions by subject/slot/activity, live study timer
- **Monthly Overview** — calendar heatmap, subject-wise completion
- **Topic Hours Log** — donut chart, bar chart, session table
- **Activity Tracker** — full history, filter by subject/activity
- **Targets & Settings** — set monthly hour targets per subject, toggle daily slots

**Stack:** React (Vite) → Vercel | Express.js → Render | PostgreSQL → Neon

---

## FOLDER STRUCTURE (create this in VS Code)

```
upsc-tracker/
├── backend/
│   ├── .env                    ← create this (not committed to git)
│   ├── .env.example
│   ├── package.json
│   ├── render.yaml
│   ├── server.js
│   ├── db.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── sessions.js
│       ├── targets.js
│       └── overview.js
├── frontend/
│   ├── .env                    ← create this (not committed to git)
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── global.css
│       ├── components/
│       │   └── Layout.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── DailyTracker.jsx
│           ├── MonthlyOverview.jsx
│           ├── TopicHours.jsx
│           ├── Targets.jsx
│           └── ActivityLog.jsx
└── schema.sql
```

---

## STEP 1 — Set up Neon Database

1. Go to **https://neon.tech** → Sign up (free) → Create project
2. Name it `upsc-tracker`
3. After creation, click **"SQL Editor"** in the left sidebar
4. **Paste the entire contents of `schema.sql`** and click Run
5. You should see: "CREATE TABLE", "CREATE INDEX" messages — that means success
6. Go to **"Connection Details"** → copy the **Connection string** (looks like `postgresql://user:pass@host/db?sslmode=require`)
7. Save this — you'll need it for the backend `.env`

---

## STEP 2 — Set up the Backend locally

Open VS Code → Open terminal in the `backend/` folder:

```bash
cd upsc-tracker/backend
npm install
```

Create the `.env` file in the `backend/` folder:
```
DATABASE_URL=postgresql://your-neon-connection-string-here
JWT_SECRET=make_this_a_long_random_string_like_upsc2026tracker!@#secret
PORT=5000
FRONTEND_URL=http://localhost:5173
```

**To generate a secure JWT_SECRET**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as your JWT_SECRET.

Test it locally:
```bash
npm run dev
```
You should see: `UPSC Tracker API running on port 5000` and `Connected to Neon PostgreSQL`

Test in browser: `http://localhost:5000/health` → should show `{"status":"ok"}`

---

## STEP 3 — Set up the Frontend locally

Open a **new terminal** in the `frontend/` folder:

```bash
cd upsc-tracker/frontend
npm install
```

Create the `.env` file in the `frontend/` folder:
```
VITE_API_URL=http://localhost:5000/api
```

Run the frontend:
```bash
npm run dev
```
Open `http://localhost:5173` → You should see the login page!

**Test the full flow:**
1. Click "Register" → fill name, email, password → you're in!
2. Go to Targets & Settings → set hour targets for each subject → Save
3. Go to Daily Tracker → log a session → it saves to Neon DB
4. Go to Dashboard → see your data!

---

## STEP 4 — Push to GitHub

In the root `upsc-tracker/` folder:

```bash
git init
```

Create a `.gitignore` file in the root with:
```
backend/.env
frontend/.env
backend/node_modules
frontend/node_modules
```

```bash
git add .
git commit -m "Initial UPSC Tracker commit"
```

Go to **https://github.com** → New repository → name it `upsc-tracker` → Create
Then push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/upsc-tracker.git
git branch -M main
git push -u origin main
```

---

## STEP 5 — Deploy Backend to Render

1. Go to **https://render.com** → Sign up → New → **Web Service**
2. Connect your GitHub → Select `upsc-tracker` repository
3. Configure:
   - **Name:** `upsc-tracker-api`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Click **"Add Environment Variable"** — add these:
   - `DATABASE_URL` → paste your Neon connection string
   - `JWT_SECRET` → paste the same secret from your local .env
   - `FRONTEND_URL` → `https://your-app.vercel.app` (you'll update this after Vercel deploy)
5. Click **"Create Web Service"**
6. Wait ~3 minutes for deploy. Copy your Render URL (like `https://upsc-tracker-api.onrender.com`)

Test: visit `https://upsc-tracker-api.onrender.com/health` → should show `{"status":"ok"}`

---

## STEP 6 — Deploy Frontend to Vercel

1. Go to **https://vercel.com** → Sign up → **New Project**
2. Import your `upsc-tracker` GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
4. Click **"Environment Variables"** → Add:
   - `VITE_API_URL` → `https://upsc-tracker-api.onrender.com/api`
5. Click **Deploy**
6. Wait ~2 minutes. Copy your Vercel URL (like `https://upsc-tracker.vercel.app`)

---

## STEP 7 — Connect everything

1. Go back to **Render** → your backend service → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL (e.g., `https://upsc-tracker.vercel.app`)
3. Click **"Save Changes"** → Render will redeploy automatically

Your app is now fully live!

---

## HOW TO USE THE APP DAILY

### Morning routine:
1. Open your Vercel URL → Login
2. Go to **Daily Tracker**
3. Start the **Study Timer** before studying
4. After each session, log it: Subject + Hours + Slot + Activity

### To set monthly targets:
1. Go to **Targets & Settings** at the start of each month
2. Set hour targets for each subject
3. Click **Save all changes**

### To check progress:
- **Dashboard** → quick overview of today + month
- **Monthly Overview** → calendar, subject % completion
- **Topic Hours Log** → donut chart, full history

---

## COMMON ISSUES & FIXES

**"Failed to fetch" or CORS error:**
- Check `FRONTEND_URL` in Render matches your exact Vercel URL
- Make sure Render backend is deployed and healthy

**"Invalid token" after login:**
- Make sure `JWT_SECRET` is the same in both local .env and Render env vars

**Database errors:**
- Make sure you ran `schema.sql` in Neon SQL Editor
- Check `DATABASE_URL` is correctly copied (with `?sslmode=require`)

**Render backend "sleeping" (free plan):**
- Free plan sleeps after 15 minutes of inactivity. First request takes ~30 sec to wake up.
- Solution: Use https://uptimerobot.com (free) to ping your `/health` endpoint every 5 min

---

## IMPORTANT: Keep your .env files PRIVATE
Never commit `.env` files to GitHub. They contain your database password and JWT secret.
The `.gitignore` file handles this — just make sure it's in place before pushing.
