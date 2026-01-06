-- Diagnostic and fix for INSERT policy on group_goals
-- The error suggests the INSERT policy is missing or not working

-- Step 1: Drop ONLY the INSERT policy to avoid dependency issues
DROP POLICY IF EXISTS "Users can create group goals" ON group_goals;

-- Step 2: Verify RLS is enabled (this is idempotent)
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;

-- Step 3: Create INSERT policy with explicit column reference
-- The policy checks that the owner_id being inserted matches the authenticated user
CREATE POLICY "Users can create group goals"
  ON group_goals 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Step 4: Verify other essential policies exist (recreate if missing)
-- These use DO block to check and create only if missing

DO $$
BEGIN
  -- Check and create SELECT policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_goals' 
    AND policyname = 'Users can view group goals they are members of'
  ) THEN
    CREATE POLICY "Users can view group goals they are members of"
      ON group_goals FOR SELECT
      USING (is_active_member(id, auth.uid()));
  END IF;

  -- Check and create UPDATE policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_goals' 
    AND policyname = 'Owners can update their group goals'
  ) THEN
    CREATE POLICY "Owners can update their group goals"
      ON group_goals FOR UPDATE
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;

  -- Check and create DELETE policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'group_goals' 
    AND policyname = 'Owners can delete their group goals'
  ) THEN
    CREATE POLICY "Owners can delete their group goals"
      ON group_goals FOR DELETE
      USING (auth.uid() = owner_id);
  END IF;
END $$;

-- Step 5: Grant necessary permissions (ensure auth can insert)
-- This ensures the authenticated user has INSERT privilege
GRANT INSERT ON group_goals TO authenticated;
GRANT INSERT ON group_goal_members TO authenticated;
GRANT INSERT ON group_daily_goal_status TO authenticated;

