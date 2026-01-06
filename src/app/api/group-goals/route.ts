import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomBytes } from "crypto";

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

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, daysOfWeek, startDate, endDate } = body;

    if (!title || !startDate || !Array.isArray(daysOfWeek)) {
      return NextResponse.json(
        { error: "Missing required fields: title, startDate, daysOfWeek" },
        { status: 400 }
      );
    }

    // Create the group goal
    const { data: groupGoal, error: goalError } = await supabase
      .from("group_goals")
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        start_date: startDate,
        end_date: endDate || null,
        days_of_week: daysOfWeek,
        total_steps: 1,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Error creating group goal:", goalError);
      return NextResponse.json(
        { error: "Failed to create group goal" },
        { status: 500 }
      );
    }

    // Add owner as a member
    const { error: memberError } = await supabase
      .from("group_goal_members")
      .insert({
        group_goal_id: groupGoal.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Error adding owner as member:", memberError);
      // Rollback: delete the goal
      await supabase.from("group_goals").delete().eq("id", groupGoal.id);
      return NextResponse.json(
        { error: "Failed to create group goal membership" },
        { status: 500 }
      );
    }

    // Create an invite token
    const token = generateInviteToken();
    const { data: invite, error: inviteError } = await supabase
      .from("group_goal_invites")
      .insert({
        group_goal_id: groupGoal.id,
        token,
        created_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      // Continue anyway, invite can be created later
    }

    return NextResponse.json({
      groupGoal: {
        id: groupGoal.id,
        ownerId: groupGoal.owner_id,
        title: groupGoal.title,
        description: groupGoal.description,
        createdAt: groupGoal.created_at,
        isActive: groupGoal.is_active,
        startDate: groupGoal.start_date,
        endDate: groupGoal.end_date,
        daysOfWeek: groupGoal.days_of_week,
        totalSteps: groupGoal.total_steps,
      },
      inviteToken: invite?.token || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

