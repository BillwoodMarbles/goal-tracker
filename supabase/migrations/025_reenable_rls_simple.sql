-- Re-enable RLS with the simplest possible policies on all tables
-- Only run this AFTER confirming migration 024 allows group goal creation

-- ============================================================================
-- STEP 1: Re-enable RLS on all group goal tables
-- ============================================================================
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_goal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_goal_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_goal_status ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create the simplest possible policies - no complex checks
-- ============================================================================

-- Allow authenticated users to insert (app validates owner_id)
CREATE POLICY "authenticated_insert_group_goals"
  ON group_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to see goals where they are owner
-- (Later we'll add is_active_member check, but start simple)
CREATE POLICY "authenticated_select_group_goals"
  ON group_goals
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Allow owners to update their goals
CREATE POLICY "authenticated_update_group_goals"
  ON group_goals
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Allow owners to delete their goals
CREATE POLICY "authenticated_delete_group_goals"
  ON group_goals
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- STEP 3: Create simple policies for group_goal_members
-- ============================================================================

CREATE POLICY "authenticated_insert_members"
  ON group_goal_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_members"
  ON group_goal_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_update_members"
  ON group_goal_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND role != 'owner')
  WITH CHECK (user_id = auth.uid() AND role != 'owner');

-- ============================================================================
-- STEP 4: Create simple policies for group_goal_invites
-- ============================================================================

CREATE POLICY "authenticated_all_invites"
  ON group_goal_invites
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 5: Create simple policies for group_daily_goal_status
-- ============================================================================

CREATE POLICY "authenticated_insert_status"
  ON group_daily_goal_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_status"
  ON group_daily_goal_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_update_status"
  ON group_daily_goal_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_delete_status"
  ON group_daily_goal_status
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 6: Later, once everything works, we can tighten these policies
-- ============================================================================

-- To update SELECT policy on group_goals later (don't run now):
-- DROP POLICY "authenticated_select_group_goals" ON group_goals;
-- CREATE POLICY "authenticated_select_group_goals"
--   ON group_goals
--   FOR SELECT
--   TO authenticated
--   USING (owner_id = auth.uid() OR is_active_member(id, auth.uid()));

