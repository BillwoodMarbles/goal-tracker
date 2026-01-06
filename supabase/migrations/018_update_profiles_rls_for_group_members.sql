-- Update profiles RLS to allow viewing co-members' display names
-- This allows group goal members to see each other's display names

-- Add policy for viewing profiles of group goal co-members
CREATE POLICY "Users can view profiles of group goal co-members"
  ON profiles FOR SELECT
  USING (
    -- User can view their own profile (existing behavior)
    auth.uid() = id
    OR
    -- User can view profiles of people they share an active group goal membership with
    EXISTS (
      SELECT 1 
      FROM group_goal_members AS my_membership
      INNER JOIN group_goal_members AS their_membership
        ON my_membership.group_goal_id = their_membership.group_goal_id
      WHERE my_membership.user_id = auth.uid()
        AND their_membership.user_id = profiles.id
        AND my_membership.left_at IS NULL
        AND their_membership.left_at IS NULL
    )
  );

-- Drop the old "Users can view own profile" policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

