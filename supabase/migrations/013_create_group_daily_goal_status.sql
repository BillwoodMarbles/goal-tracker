-- Create group_daily_goal_status table
-- This stores per-user per-day completion status for group goals
CREATE TABLE IF NOT EXISTS group_daily_goal_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_goal_id UUID NOT NULL REFERENCES group_goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_daily_goal_status_unique_user_goal_date UNIQUE (user_id, group_goal_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS group_daily_goal_status_group_goal_id_date_idx ON group_daily_goal_status(group_goal_id, date);
CREATE INDEX IF NOT EXISTS group_daily_goal_status_user_id_date_idx ON group_daily_goal_status(user_id, date);
CREATE INDEX IF NOT EXISTS group_daily_goal_status_user_id_group_goal_id_idx ON group_daily_goal_status(user_id, group_goal_id);

