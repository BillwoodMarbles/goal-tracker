-- Disable RLS on remaining group goal tables
-- Migration 024 disabled group_goals, now disable the rest

-- ============================================================================
-- Disable RLS on all remaining group goal tables
-- ============================================================================
ALTER TABLE group_goal_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_goal_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_goal_status DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Ensure grants exist for all tables
-- ============================================================================
GRANT ALL ON group_goal_members TO authenticated;
GRANT ALL ON group_goal_members TO anon;
GRANT ALL ON group_goal_members TO service_role;

GRANT ALL ON group_goal_invites TO authenticated;
GRANT ALL ON group_goal_invites TO anon;
GRANT ALL ON group_goal_invites TO service_role;

GRANT ALL ON group_daily_goal_status TO authenticated;
GRANT ALL ON group_daily_goal_status TO anon;
GRANT ALL ON group_daily_goal_status TO service_role;

