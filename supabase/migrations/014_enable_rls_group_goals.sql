-- Create a helper function to check membership without triggering RLS recursion
-- SECURITY DEFINER allows it to bypass RLS when checking
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

-- Enable Row Level Security on group_goals table
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;

-- Group Goals: Users can see goals they are active members of
-- Uses helper function to avoid RLS recursion
CREATE POLICY "Users can view group goals they are members of"
  ON group_goals FOR SELECT
  USING (is_active_member(id, auth.uid()));

-- Users can create group goals (they become owner)
CREATE POLICY "Users can create group goals"
  ON group_goals FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can update their group goals
CREATE POLICY "Owners can update their group goals"
  ON group_goals FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can delete their group goals
CREATE POLICY "Owners can delete their group goals"
  ON group_goals FOR DELETE
  USING (auth.uid() = owner_id);

