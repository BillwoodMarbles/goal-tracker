-- Fix infinite recursion in RLS policies
-- This migration corrects the circular dependency between group_goals and group_goal_members

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view group goals they are members of" ON group_goals;
DROP POLICY IF EXISTS "Users can view members of their group goals" ON group_goal_members;
DROP POLICY IF EXISTS "Users can view status for their group goals" ON group_daily_goal_status;

-- Drop old function if it exists
DROP FUNCTION IF EXISTS is_active_member(UUID, UUID);

-- Create helper function with SECURITY DEFINER to bypass RLS and break recursion
CREATE OR REPLACE FUNCTION is_active_member(p_goal_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_goal_members
    WHERE group_goal_members.group_goal_id = p_goal_id
      AND group_goal_members.user_id = p_user_id
      AND group_goal_members.left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the helper function (no more recursion)

-- Group Goals: Users can see goals they are active members of
CREATE POLICY "Users can view group goals they are members of"
  ON group_goals FOR SELECT
  USING (is_active_member(id, auth.uid()));

-- Group Goal Members: Members can view other members of their group goals
CREATE POLICY "Users can view members of their group goals"
  ON group_goal_members FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

-- Group Daily Goal Status: Members can view statuses for their group goals
CREATE POLICY "Users can view status for their group goals"
  ON group_daily_goal_status FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

