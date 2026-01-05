-- Create goals table
-- This stores the core goal definitions
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  goal_type TEXT NOT NULL DEFAULT 'daily' CHECK (goal_type IN ('daily', 'weekly')),
  days_of_week TEXT[] NOT NULL DEFAULT '{}',
  is_multi_step BOOLEAN NOT NULL DEFAULT false,
  total_steps INTEGER NOT NULL DEFAULT 1 CHECK (total_steps >= 1)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS goals_user_id_is_active_idx ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS goals_user_id_goal_type_idx ON goals(user_id, goal_type);

