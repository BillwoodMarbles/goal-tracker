-- TEMPORARY: Disable RLS on all group goal tables to test if app logic works
-- This will help us isolate whether the issue is RLS or something else

-- ============================================================================
-- STEP 1: Disable RLS on all group goal tables temporarily
-- ============================================================================
ALTER TABLE group_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_goal_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_goal_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_goal_status DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Ensure all necessary grants exist
-- ============================================================================
GRANT ALL ON group_goals TO authenticated;
GRANT ALL ON group_goals TO anon;
GRANT ALL ON group_goals TO service_role;

GRANT ALL ON group_goal_members TO authenticated;
GRANT ALL ON group_goal_members TO anon;
GRANT ALL ON group_goal_members TO service_role;

GRANT ALL ON group_goal_invites TO authenticated;
GRANT ALL ON group_goal_invites TO anon;
GRANT ALL ON group_goal_invites TO service_role;

GRANT ALL ON group_daily_goal_status TO authenticated;
GRANT ALL ON group_daily_goal_status TO anon;
GRANT ALL ON group_daily_goal_status TO service_role;

-- ============================================================================
-- STEP 3: Grant sequence permissions
-- ============================================================================
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- NOTE: This is a temporary fix to test if the app works without RLS
-- Once confirmed working, we'll create migration 025 to re-enable RLS
-- with the correct policies
-- ============================================================================

