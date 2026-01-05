-- Enable Row Level Security on weekly_goal_status table
ALTER TABLE weekly_goal_status ENABLE ROW LEVEL SECURITY;

-- Weekly Goal Status: Users can only see and manage their own weekly goal statuses
CREATE POLICY "Users can view own weekly goal status"
  ON weekly_goal_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly goal status"
  ON weekly_goal_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goal status"
  ON weekly_goal_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly goal status"
  ON weekly_goal_status FOR DELETE
  USING (auth.uid() = user_id);

