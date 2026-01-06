-- Create group_goal_members table
-- This stores membership relationships for group goals
CREATE TABLE IF NOT EXISTS group_goal_members (
  group_goal_id UUID NOT NULL REFERENCES group_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT group_goal_members_unique_user_goal UNIQUE (group_goal_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS group_goal_members_user_id_left_at_idx ON group_goal_members(user_id, left_at);
CREATE INDEX IF NOT EXISTS group_goal_members_group_goal_id_left_at_idx ON group_goal_members(group_goal_id, left_at);
CREATE INDEX IF NOT EXISTS group_goal_members_group_goal_id_idx ON group_goal_members(group_goal_id);

