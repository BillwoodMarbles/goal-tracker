-- Enable Row Level Security on group_daily_goal_status table
ALTER TABLE group_daily_goal_status ENABLE ROW LEVEL SECURITY;

-- Users can view status for group goals they are active members of
-- Uses helper function to avoid recursion
CREATE POLICY "Users can view status for their group goals"
  ON group_daily_goal_status FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

-- Users can only insert their own status
CREATE POLICY "Users can insert their own group goal status"
  ON group_daily_goal_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own status
CREATE POLICY "Users can update their own group goal status"
  ON group_daily_goal_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own status
CREATE POLICY "Users can delete their own group goal status"
  ON group_daily_goal_status FOR DELETE
  USING (auth.uid() = user_id);

-- Default user_id to the authenticated user for safety
ALTER TABLE group_daily_goal_status
  ALTER COLUMN user_id SET DEFAULT auth.uid();

