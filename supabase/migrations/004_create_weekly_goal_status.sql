-- Create weekly_goal_status table
-- This stores per-goal per-week completion status
CREATE TABLE IF NOT EXISTS weekly_goal_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  step_completions TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  daily_increments JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weekly_goal_status_unique_user_goal_week UNIQUE (user_id, goal_id, week_start)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS weekly_goal_status_user_id_week_start_idx ON weekly_goal_status(user_id, week_start);
CREATE INDEX IF NOT EXISTS weekly_goal_status_user_id_goal_id_idx ON weekly_goal_status(user_id, goal_id);
CREATE INDEX IF NOT EXISTS weekly_goal_status_week_start_idx ON weekly_goal_status(week_start);

