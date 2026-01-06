import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await getSupabaseRouteHandlerClient();
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
    const { data: members, error: membersError } = await supabase
      .from("group_goal_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_goal_id", goal.id)
      .is("left_at", null);

    const memberCount = membersError ? 0 : (members as unknown as number) || 0;

    return NextResponse.json({
      groupGoal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        startDate: goal.start_date,
        endDate: goal.end_date,
        daysOfWeek: goal.days_of_week,
        memberCount,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
