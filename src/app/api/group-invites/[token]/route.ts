import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "../../_utils/supabaseAdmin";

export const runtime = "nodejs";

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

    // Get the invite (public preview must work without auth; use admin client)
    const { data: invite, error: inviteError } = await supabase
      .from("group_goal_invites")
      .select("id, group_goal_id, revoked_at")
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

    // Fetch the goal separately (avoids nested select typing issues)
    const { data: goal, error: goalError } = await supabase
      .from("group_goals")
      .select(
        "id, title, description, start_date, end_date, days_of_week, is_active"
      )
      .eq("id", invite.group_goal_id)
      .single();

    if (goalError || !goal || !goal.is_active) {
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
    if (e instanceof SupabaseAdminConfigError) {
      return NextResponse.json(
        {
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (or it isn't available to the running server).",
          debug: e.debug,
          hint: "In Amplify: App settings → Environment variables → set SUPABASE_SERVICE_ROLE_KEY for the active branch, then redeploy (clear cache). Also ensure SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is set.",
        },
        { status: 500 }
      );
    }
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : "Unknown error";
    return NextResponse.json(
      { error: "Server error", detail },
      { status: 500 }
    );
  }
}
