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

export async function POST(
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
    const body = await request.json();
    const { date } = body;

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

    // Check if status exists
    const { data: existingStatus } = await supabase
      .from("group_daily_goal_status")
      .select("completed")
      .eq("group_goal_id", id)
      .eq("user_id", user.id)
      .eq("date", date)
      .single();

    const newCompleted = !existingStatus?.completed;

    if (existingStatus) {
      // Update existing
      const { error } = await supabase
        .from("group_daily_goal_status")
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          last_updated: new Date().toISOString(),
        })
        .eq("group_goal_id", id)
        .eq("user_id", user.id)
        .eq("date", date);

      if (error) {
        console.error("Error updating group goal status:", error);
        return NextResponse.json(
          { error: "Failed to update status" },
          { status: 500 }
        );
      }
    } else {
      // Insert new
      const { error } = await supabase.from("group_daily_goal_status").insert({
        group_goal_id: id,
        user_id: user.id,
        date,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      });

      if (error) {
        console.error("Error creating group goal status:", error);
        return NextResponse.json(
          { error: "Failed to create status" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ completed: newCompleted });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
