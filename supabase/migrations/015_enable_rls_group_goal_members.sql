-- Enable Row Level Security on group_goal_members table
ALTER TABLE group_goal_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members if they share a group goal
-- Uses the helper function to avoid recursion
CREATE POLICY "Users can view members of their group goals"
  ON group_goal_members FOR SELECT
  USING (is_active_member(group_goal_id, auth.uid()));

-- Server-side only: Insert is restricted to authenticated users for their own membership
-- In practice, the API will handle validation of invite tokens
CREATE POLICY "Users can insert their own membership"
  ON group_goal_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership (to leave), but not if they are the owner
CREATE POLICY "Users can leave group goals if not owner"
  ON group_goal_members FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND role != 'owner'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND role != 'owner'
  );

-- Trigger to prevent owners from leaving via left_at update
CREATE OR REPLACE FUNCTION prevent_owner_leave()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND NEW.role = 'owner' THEN
    RAISE EXCEPTION 'Owners cannot leave group goals. Delete the goal instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_owner_leave_trigger
  BEFORE UPDATE ON group_goal_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_owner_leave();

