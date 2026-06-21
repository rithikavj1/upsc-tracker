-- UPSC Tracker Database Schema
-- Run this in Neon SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  subject VARCHAR(100) NOT NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  slot VARCHAR(50),
  activity_type VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_targets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  subject VARCHAR(100) NOT NULL,
  target_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  UNIQUE(user_id, month, year, subject)
);

CREATE TABLE IF NOT EXISTS daily_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_hour_target DECIMAL(4,2) DEFAULT 8,
  morning_slot BOOLEAN DEFAULT true,
  prenoon_slot BOOLEAN DEFAULT true,
  afternoon_slot BOOLEAN DEFAULT true,
  evening_slot BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON study_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_month ON study_sessions(user_id, EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date));
CREATE INDEX IF NOT EXISTS idx_targets_user_month ON monthly_targets(user_id, month, year);

