-- Create daily_goal_status table
-- This stores per-goal per-day completion status
CREATE TABLE IF NOT EXISTS daily_goal_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  step_completions TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  snoozed BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_goal_status_unique_user_goal_date UNIQUE (user_id, goal_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS daily_goal_status_user_id_date_idx ON daily_goal_status(user_id, date);
CREATE INDEX IF NOT EXISTS daily_goal_status_user_id_goal_id_idx ON daily_goal_status(user_id, goal_id);
CREATE INDEX IF NOT EXISTS daily_goal_status_date_idx ON daily_goal_status(date);

