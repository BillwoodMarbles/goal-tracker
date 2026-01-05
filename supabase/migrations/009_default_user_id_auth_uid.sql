-- Default user_id to the authenticated user for safety.
-- This helps avoid accidental RLS failures when the client forgets to send user_id.
--
-- Note: RLS policies still enforce auth.uid() = user_id on insert/update/select.

ALTER TABLE goals
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE daily_goal_status
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE weekly_goal_status
  ALTER COLUMN user_id SET DEFAULT auth.uid();


