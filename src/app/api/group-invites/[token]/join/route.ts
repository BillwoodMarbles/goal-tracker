import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdminClient } from "../../../_utils/supabaseAdmin";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Use cookie-based anon client only to identify the user session.
    const supabase = await getSupabaseRouteHandlerClient();
    // Use service-role client for invite/member DB operations to bypass RLS
    // (invites are owner-only under RLS, but invite join must work for non-owners).
    const admin = getSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Get the invite and verify it's valid
    const { data: invite, error: inviteError } = await admin
      .from("group_goal_invites")
      .select("group_goal_id, revoked_at")
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

    // Ensure the goal still exists and is active
    const { data: goal, error: goalError } = await admin
      .from("group_goals")
      .select("id, is_active")
      .eq("id", invite.group_goal_id)
      .single();

    if (goalError || !goal || !goal.is_active) {
      return NextResponse.json(
        { error: "Group goal not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await admin
      .from("group_goal_members")
      .select("left_at")
      .eq("group_goal_id", invite.group_goal_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      if (existingMembership.left_at) {
        // User previously left, rejoin by clearing left_at
        const { error: updateError } = await admin
          .from("group_goal_members")
          .update({ left_at: null })
          .eq("group_goal_id", invite.group_goal_id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error rejoining group:", updateError);
          return NextResponse.json(
            { error: "Failed to rejoin group" },
            { status: 500 }
          );
        }
      }
      // Already a member, idempotent success
      return NextResponse.json({
        success: true,
        groupGoalId: invite.group_goal_id,
        alreadyMember: true,
      });
    }

    // Add user as a member
    const { error: memberError } = await admin
      .from("group_goal_members")
      .insert({
        group_goal_id: invite.group_goal_id,
        user_id: user.id,
        role: "member",
      });

    if (memberError) {
      console.error("Error joining group:", memberError);
      return NextResponse.json(
        { error: "Failed to join group" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      groupGoalId: invite.group_goal_id,
      alreadyMember: false,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
