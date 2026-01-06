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

    // Check if user is a member and not owner
    const { data: membership, error: membershipError } = await supabase
      .from("group_goal_members")
      .select("role")
      .eq("group_goal_id", id)
      .eq("user_id", user.id)
      .is("left_at", null)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this group goal" },
        { status: 404 }
      );
    }

    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "Owners cannot leave group goals. Delete the goal instead." },
        { status: 403 }
      );
    }

    // Set left_at to mark as left
    const { error } = await supabase
      .from("group_goal_members")
      .update({ left_at: new Date().toISOString() })
      .eq("group_goal_id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error leaving group goal:", error);
      return NextResponse.json(
        { error: "Failed to leave group goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

