-- Weekly Tracker Tables
CREATE TABLE IF NOT EXISTS weekly_blocks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  block_type VARCHAR(10) NOT NULL CHECK (block_type IN ('Weekday','Weekend')),
  block_start DATE NOT NULL,
  block_end DATE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id INTEGER REFERENCES weekly_blocks(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  block_type VARCHAR(10) NOT NULL,
  session_date DATE NOT NULL,
  time_slot VARCHAR(50),
  session_name VARCHAR(20) CHECK (session_name IN ('Morning','Afternoon','Evening')),
  exam_type VARCHAR(20),
  paper VARCHAR(20),
  subject VARCHAR(100),
  module VARCHAR(100),
  topic VARCHAR(200),
  sub_topic VARCHAR(200),
  resource_type VARCHAR(50),
  resource_name VARCHAR(200),
  hours DECIMAL(4,2) DEFAULT 2,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_sessions_user ON weekly_sessions(user_id, week_number, session_date);
CREATE INDEX IF NOT EXISTS idx_weekly_blocks_user ON weekly_blocks(user_id, month, year);
