import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../_utils/supabaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Use a service-role client for invite preview so it works without auth
    // and does not require opening up RLS policies to anonymous users.
    const supabase = getSupabaseAdminClient();
    const { token } = await params;

    // Note: This endpoint should work without authentication
    // so users can preview before signing in

    // Get the invite and associated goal
    const { data: invite, error: inviteError } = await supabase
      .from("group_goal_invites")
      .select(
        `
        id,
        group_goal_id,
        revoked_at,
        group_goals (
          id,
          title,
          description,
          start_date,
          end_date,
          days_of_week,
          is_active
        )
      `
      )
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.revoked_at) {
      return NextResponse.json(
        { error: "Invite has been revoked" },
        { status: 410 }
      );
    }

    const goal = invite.group_goals as unknown as {
      id: string;
      title: string;
      description: string | null;
      start_date: string;
      end_date: string | null;
      days_of_week: string[];
      is_active: boolean;
    } | null;

    if (!goal || !goal.is_active) {
      return NextResponse.json(
        { error: "Group goal not found or inactive" },
        { status: 404 }
      );
    }

    // Count active members
    const { count: memberCount, error: membersError } = await supabase
      .from("group_goal_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_goal_id", goal.id)
      .is("left_at", null);

    return NextResponse.json({
      groupGoal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        startDate: goal.start_date,
        endDate: goal.end_date,
        daysOfWeek: goal.days_of_week,
        memberCount: membersError ? 0 : memberCount ?? 0,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
