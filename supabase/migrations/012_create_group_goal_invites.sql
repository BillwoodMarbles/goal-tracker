-- Create group_goal_invites table
-- This stores invite tokens for joining group goals
CREATE TABLE IF NOT EXISTS group_goal_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_goal_id UUID NOT NULL REFERENCES group_goals(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS group_goal_invites_token_idx ON group_goal_invites(token);
CREATE INDEX IF NOT EXISTS group_goal_invites_group_goal_id_idx ON group_goal_invites(group_goal_id);

-- Partial unique index to ensure only one active invite per goal
CREATE UNIQUE INDEX IF NOT EXISTS group_goal_invites_active_per_goal_idx 
  ON group_goal_invites(group_goal_id) 
  WHERE revoked_at IS NULL;

