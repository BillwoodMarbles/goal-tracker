-- Complete fix for group goals RLS policies and function
-- This migration handles all dependencies correctly in the right order

-- ============================================================================
-- STEP 1: Drop all dependent policies first (in order of dependency)
-- ============================================================================

-- Drop policies on group_goals
DROP POLICY IF EXISTS "Users can view group goals they are members of" ON group_goals;
DROP POLICY IF EXISTS "Users can create group goals" ON group_goals;
DROP POLICY IF EXISTS "Owners can update their group goals" ON group_goals;
DROP POLICY IF EXISTS "Owners can delete their group goals" ON group_goals;

-- Drop policies on group_goal_members
DROP POLICY IF EXISTS "Users can view members of their group goals" ON group_goal_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON group_goal_members;
DROP POLICY IF EXISTS "Users can leave group goals if not owner" ON group_goal_members;

-- Drop policies on group_goal_invites (these don't depend on is_active_member)
-- But drop them for consistency
DROP POLICY IF EXISTS "Owners can view invites for their group goals" ON group_goal_invites;
DROP POLICY IF EXISTS "Owners can create invites for their group goals" ON group_goal_invites;
DROP POLICY IF EXISTS "Owners can update invites for their group goals" ON group_goal_invites;

-- Drop policies on group_daily_goal_status
DROP POLICY IF EXISTS "Users can view status for their group goals" ON group_daily_goal_status;
DROP POLICY IF EXISTS "Users can insert their own group goal status" ON group_daily_goal_status;
DROP POLICY IF EXISTS "Users can update their own group goal status" ON group_daily_goal_status;
DROP POLICY IF EXISTS "Users can delete their own group goal status" ON group_daily_goal_status;

-- ============================================================================
-- STEP 2: Drop the function (now that policies are gone)
-- ============================================================================

DROP FUNCTION IF EXISTS is_active_member(UUID, UUID);

-- ============================================================================
-- STEP 3: Create the corrected function with prefixed parameter names
-- ============================================================================

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

-- ============================================================================
-- STEP 4: Recreate all policies using the corrected function
-- ============================================================================

-- Policies for group_goals
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

-- Policies for group_goal_members
CREATE POLICY "Users can view members of their group goals"
  ON group_goal_members FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

CREATE POLICY "Users can insert their own membership"
  ON group_goal_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave group goals if not owner"
  ON group_goal_members FOR UPDATE
  USING (auth.uid() = user_id AND role != 'owner')
  WITH CHECK (auth.uid() = user_id AND role != 'owner');

-- Policies for group_goal_invites (restore original policies - don't use is_active_member)
CREATE POLICY "Owners can view invites for their group goals"
  ON group_goal_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create invites for their group goals"
  ON group_goal_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update invites for their group goals"
  ON group_goal_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  );

-- Policies for group_daily_goal_status
CREATE POLICY "Users can view status for their group goals"
  ON group_daily_goal_status FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

CREATE POLICY "Users can insert their own group goal status"
  ON group_daily_goal_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group goal status"
  ON group_daily_goal_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group goal status"
  ON group_daily_goal_status FOR DELETE
  USING (auth.uid() = user_id);

