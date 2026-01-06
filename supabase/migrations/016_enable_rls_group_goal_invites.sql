-- Enable Row Level Security on group_goal_invites table
ALTER TABLE group_goal_invites ENABLE ROW LEVEL SECURITY;

-- Only group goal owners can view invites for their goals
CREATE POLICY "Owners can view invites for their group goals"
  ON group_goal_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  );

-- Only group goal owners can create invites for their goals
CREATE POLICY "Owners can create invites for their group goals"
  ON group_goal_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_goals
      WHERE group_goals.id = group_goal_invites.group_goal_id
        AND group_goals.owner_id = auth.uid()
    )
  );

-- Only group goal owners can update (revoke) invites for their goals
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

