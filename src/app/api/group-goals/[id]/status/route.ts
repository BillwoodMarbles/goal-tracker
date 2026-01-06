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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Missing date parameter" },
        { status: 400 }
      );
    }

    // Verify user is a member
    const { data: membership } = await supabase
      .from("group_goal_members")
      .select("role")
      .eq("group_goal_id", id)
      .eq("user_id", user.id)
      .is("left_at", null)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group goal" },
        { status: 403 }
      );
    }

    // Get all active members
    const { data: members, error: membersError } = await supabase
      .from("group_goal_members")
      .select("user_id, role")
      .eq("group_goal_id", id)
      .is("left_at", null);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Get profiles for all members
    const userIds = members?.map((m) => m.user_id) || [];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    // Get completion status for the date
    const { data: statuses, error: statusesError } = await supabase
      .from("group_daily_goal_status")
      .select("user_id, completed, completed_at")
      .eq("group_goal_id", id)
      .eq("date", date);

    if (statusesError) {
      console.error("Error fetching statuses:", statusesError);
      return NextResponse.json(
        { error: "Failed to fetch statuses" },
        { status: 500 }
      );
    }

    // Build member stats
    const statusMap = new Map(statuses?.map((s) => [s.user_id, s]) || []);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const memberStats =
      members?.map((member) => {
        const profile = profileMap.get(member.user_id);
        const status = statusMap.get(member.user_id);
        return {
          userId: member.user_id,
          displayName:
            profile?.display_name || `Member ${member.user_id.slice(0, 8)}`,
          role: member.role,
          completed: status?.completed || false,
          completedAt: status?.completed_at || null,
        };
      }) || [];

    return NextResponse.json({ memberStats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
