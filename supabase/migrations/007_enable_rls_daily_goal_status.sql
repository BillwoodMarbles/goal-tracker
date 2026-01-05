-- Enable Row Level Security on daily_goal_status table
ALTER TABLE daily_goal_status ENABLE ROW LEVEL SECURITY;

-- Daily Goal Status: Users can only see and manage their own daily goal statuses
CREATE POLICY "Users can view own daily goal status"
  ON daily_goal_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goal status"
  ON daily_goal_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goal status"
  ON daily_goal_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily goal status"
  ON daily_goal_status FOR DELETE
  USING (auth.uid() = user_id);

