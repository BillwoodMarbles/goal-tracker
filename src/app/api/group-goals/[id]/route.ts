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

export async function PATCH(
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
    const { endDate, daysOfWeek, description } = body;

    const updateData: Record<string, unknown> = {};
    if (endDate !== undefined) updateData.end_date = endDate;
    if (daysOfWeek !== undefined) updateData.days_of_week = daysOfWeek;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from("group_goals")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating group goal:", error);
      return NextResponse.json(
        { error: "Failed to update group goal" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Group goal not found" }, { status: 404 });
    }

    return NextResponse.json({
      groupGoal: {
        id: data.id,
        ownerId: data.owner_id,
        title: data.title,
        description: data.description,
        createdAt: data.created_at,
        isActive: data.is_active,
        startDate: data.start_date,
        endDate: data.end_date,
        daysOfWeek: data.days_of_week,
        totalSteps: data.total_steps,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Soft delete the goal
    const { error: goalError } = await supabase
      .from("group_goals")
      .update({ is_active: false })
      .eq("id", id)
      .eq("owner_id", user.id);

    if (goalError) {
      console.error("Error deleting group goal:", goalError);
      return NextResponse.json(
        { error: "Failed to delete group goal" },
        { status: 500 }
      );
    }

    // Revoke any active invites
    await supabase
      .from("group_goal_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("group_goal_id", id)
      .is("revoked_at", null);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

