import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import dayjs from "dayjs";

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
  goal_type: "daily" | "weekly";
  days_of_week: string[] | null;
  is_multi_step: boolean;
  total_steps: number;
};

type DailyStatusRow = {
  goal_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_steps: number;
  step_completions: (string | null)[] | null;
  snoozed: boolean | null;
};

type WeeklyStatusRow = {
  goal_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_steps: number;
  step_completions: (string | null)[] | null;
  daily_increments: Record<string, boolean> | null;
};

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

function parseDateParam(value: string | null): string {
  const fallback = dayjs().format("YYYY-MM-DD");
  if (!value) return fallback;
  // basic YYYY-MM-DD guard
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

function getWeekStart(date: string): string {
  const d = dayjs(date);
  const dayOfWeek = d.day(); // 0 = Sunday
  return d.subtract(dayOfWeek, "day").format("YYYY-MM-DD");
}

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof getSupabaseRouteHandlerClient>>,
  userId: string
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("profiles").insert({
      id: userId,
      last_active_at: new Date().toISOString(),
    });
  } else {
    // Fire-and-forget; don't block the response.
    // (Avoid .then/.catch here due to PromiseLike typing in Next route handlers.)
    void supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", userId);
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const date = parseDateParam(url.searchParams.get("date"));
    const dayOfWeek = dayjs(date).format("dddd").toLowerCase();
    const weekStart = getWeekStart(date);

    await ensureProfile(supabase, user.id);

    // 1) Goals
    const { data: goalsData, error: goalsError } = await supabase
      .from("goals")
      .select(
        "id, title, description, created_at, is_active, goal_type, days_of_week, is_multi_step, total_steps"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (goalsError) {
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      );
    }

    const allGoals = (goalsData as GoalRow[] | null) ?? [];

    const dailyGoalsForDay = allGoals.filter(
      (g) => g.goal_type === "daily" && (g.days_of_week || []).includes(dayOfWeek)
    );
    const weeklyGoalsAll = allGoals.filter((g) => g.goal_type === "weekly");
    const inactiveDailyGoals = allGoals.filter(
      (g) => g.goal_type === "daily" && !(g.days_of_week || []).includes(dayOfWeek)
    );

    // 2) Daily status for date
    const { data: dailyStatusData } = await supabase
      .from("daily_goal_status")
      .select("goal_id, completed, completed_at, completed_steps, step_completions, snoozed")
      .eq("date", date);

    // 3) Weekly status for weekStart
    const { data: weeklyStatusData } = await supabase
      .from("weekly_goal_status")
      .select("goal_id, completed, completed_at, completed_steps, step_completions, daily_increments")
      .eq("week_start", weekStart);

    const dailyStatusMap = new Map(
      ((dailyStatusData as DailyStatusRow[] | null) ?? []).map((s) => [
        s.goal_id,
        s,
      ])
    );
    const weeklyStatusMap = new Map(
      ((weeklyStatusData as WeeklyStatusRow[] | null) ?? []).map((s) => [
        s.goal_id,
        s,
      ])
    );

    const mapGoalBase = (g: GoalRow) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? undefined,
      createdAt: g.created_at,
      isActive: g.is_active,
      goalType: g.goal_type,
      daysOfWeek: g.days_of_week ?? [],
      isMultiStep: g.is_multi_step,
      totalSteps: g.total_steps,
    });

    const mapDailyGoalWithStatus = (g: GoalRow) => {
      const s = dailyStatusMap.get(g.id);
      return {
        ...mapGoalBase(g),
        completed: s?.completed ?? false,
        completedAt: s?.completed_at ?? undefined,
        completedSteps: s?.completed_steps ?? 0,
        stepCompletions: (s?.step_completions ?? []).map((ts) => ts ?? null),
        snoozed: s?.snoozed ?? false,
      };
    };

    const mapWeeklyGoalWithStatus = (g: GoalRow) => {
      const s = weeklyStatusMap.get(g.id);
      const dailyIncremented = s?.daily_increments?.[date] ?? false;
      return {
        ...mapGoalBase(g),
        completed: s?.completed ?? false,
        completedAt: s?.completed_at ?? undefined,
        completedSteps: s?.completed_steps ?? 0,
        stepCompletions: (s?.step_completions ?? []).map((ts) => ts ?? null),
        dailyIncremented,
      };
    };

    const goals = dailyGoalsForDay.map(mapDailyGoalWithStatus);
    const weeklyGoals = weeklyGoalsAll.map(mapWeeklyGoalWithStatus);
    const inactiveGoals = inactiveDailyGoals.map((g) => ({
      ...mapGoalBase(g),
      completed: false,
      completedAt: undefined,
      completedSteps: 0,
      stepCompletions: [],
      snoozed: false,
    }));

    // completion stats derived from already-loaded daily goals
    const total = goals.length;
    const completed = goals.filter((g) => g.completed).length;
    const percentage =
      total === 0
        ? 0
        : Math.round(
            goals.reduce((acc, g) => {
              if (g.isMultiStep && g.totalSteps > 1) {
                return acc + (g.completedSteps / g.totalSteps) * 100;
              }
              return acc + (g.completed ? 100 : 0);
            }, 0) / total
          );

    return NextResponse.json({
      date,
      weekStart,
      goals,
      weeklyGoals,
      inactiveGoals,
      completionStats: { total, completed, percentage },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


