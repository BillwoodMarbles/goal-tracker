-- Create group_goals table
-- This stores collaborative goals with invite-based membership
CREATE TABLE IF NOT EXISTS group_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  days_of_week TEXT[] NOT NULL DEFAULT '{}',
  total_steps INTEGER NOT NULL DEFAULT 1 CHECK (total_steps = 1)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS group_goals_owner_id_idx ON group_goals(owner_id);
CREATE INDEX IF NOT EXISTS group_goals_is_active_idx ON group_goals(is_active);
CREATE INDEX IF NOT EXISTS group_goals_start_date_idx ON group_goals(start_date);
CREATE INDEX IF NOT EXISTS group_goals_end_date_idx ON group_goals(end_date);
CREATE INDEX IF NOT EXISTS group_goals_owner_active_idx ON group_goals(owner_id, is_active);

