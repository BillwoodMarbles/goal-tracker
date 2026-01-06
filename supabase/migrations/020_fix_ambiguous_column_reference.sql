-- Fix ambiguous column reference in is_active_member function
-- The issue: function parameters "goal_id" and "user_id" conflict with column names
-- Solution: Use prefixed parameter names "p_goal_id" and "p_user_id"

-- Step 1: Drop all policies for group_goals (to ensure clean recreation)
DROP POLICY IF EXISTS "Users can view group goals they are members of" ON group_goals;
DROP POLICY IF EXISTS "Users can create group goals" ON group_goals;
DROP POLICY IF EXISTS "Owners can update their group goals" ON group_goals;
DROP POLICY IF EXISTS "Owners can delete their group goals" ON group_goals;

-- Drop policies for group_goal_members and group_daily_goal_status
DROP POLICY IF EXISTS "Users can view members of their group goals" ON group_goal_members;
DROP POLICY IF EXISTS "Users can view status for their group goals" ON group_daily_goal_status;

-- Step 2: Drop the existing function
DROP FUNCTION IF EXISTS is_active_member(UUID, UUID);

-- Step 3: Recreate function with properly prefixed parameter names
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

-- Step 4: Recreate all policies for group_goals (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can view group goals they are members of"
  ON group_goals FOR SELECT
  USING (is_active_member(id, auth.uid()));

CREATE POLICY "Users can create group goals"
  ON group_goals FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their group goals"
  ON group_goals FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their group goals"
  ON group_goals FOR DELETE
  USING (auth.uid() = owner_id);

-- Recreate SELECT policy for group_goal_members
CREATE POLICY "Users can view members of their group goals"
  ON group_goal_members FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

-- Recreate SELECT policy for group_daily_goal_status
CREATE POLICY "Users can view status for their group goals"
  ON group_daily_goal_status FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

