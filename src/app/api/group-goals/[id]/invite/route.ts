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

    // Get the active invite for this goal
    const { data: invite, error } = await supabase
      .from("group_goal_invites")
      .select("token")
      .eq("group_goal_id", id)
      .is("revoked_at", null)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching invite:", error);
      return NextResponse.json(
        { error: "Failed to fetch invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: invite?.token || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
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

    // Verify ownership
    const { data: goal, error: goalError } = await supabase
      .from("group_goals")
      .select("id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Group goal not found or unauthorized" },
        { status: 404 }
      );
    }

    // Revoke existing invite
    await supabase
      .from("group_goal_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("group_goal_id", id)
      .is("revoked_at", null);

    // Create new invite
    const token = generateInviteToken();
    const { data: invite, error: inviteError } = await supabase
      .from("group_goal_invites")
      .insert({
        group_goal_id: id,
        token,
        created_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: invite.token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

