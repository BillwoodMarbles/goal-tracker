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
  date: string;
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

type DailyGoalStatusDTO = {
  goalId: string;
  completed: boolean;
  completedAt?: string;
  completedSteps: number;
  stepCompletions: (string | null)[];
  snoozed?: boolean;
};

type DailyGoalsDTO = {
  date: string;
  goals: DailyGoalStatusDTO[];
  lastUpdated: string;
};

type WeeklyGoalWithStatusDTO = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  isActive: boolean;
  goalType: "weekly";
  daysOfWeek: string[];
  isMultiStep: boolean;
  totalSteps: number;
  completed: boolean;
  completedAt?: string;
  completedSteps: number;
  stepCompletions: (string | null)[];
  dailyIncremented: boolean;
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

function parseWeekStartParam(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function generateWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const startDate = dayjs(weekStart).day(0);
  for (let i = 0; i < 7; i++) {
    dates.push(startDate.add(i, "day").format("YYYY-MM-DD"));
  }
  return dates;
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
    const weekStart = parseWeekStartParam(url.searchParams.get("weekStart"));
    if (!weekStart) {
      return NextResponse.json(
        { error: "Missing or invalid weekStart (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    await ensureProfile(supabase, user.id);

    const weekDates = generateWeekDates(weekStart);
    const weekEnd = weekDates[weekDates.length - 1];

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

    const allGoals = ((goalsData as GoalRow[] | null) ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? undefined,
      createdAt: g.created_at,
      isActive: g.is_active,
      goalType: g.goal_type,
      daysOfWeek: g.days_of_week ?? [],
      isMultiStep: g.is_multi_step,
      totalSteps: g.total_steps,
    }));

    // 2) Daily statuses for week
    const { data: dailyStatusData } = await supabase
      .from("daily_goal_status")
      .select(
        "date, goal_id, completed, completed_at, completed_steps, step_completions, snoozed"
      )
      .gte("date", weekStart)
      .lte("date", weekEnd);

    // 3) Weekly statuses for the weekStart
    const { data: weeklyStatusData } = await supabase
      .from("weekly_goal_status")
      .select(
        "goal_id, completed, completed_at, completed_steps, step_completions, daily_increments"
      )
      .eq("week_start", weekStart);

    // Build dailyGoals map
    const dailyGoals: Record<string, DailyGoalsDTO> = {};
    weekDates.forEach((d) => {
      dailyGoals[d] = {
        date: d,
        goals: [],
        lastUpdated: new Date().toISOString(),
      };
    });

    ((dailyStatusData as DailyStatusRow[] | null) ?? []).forEach((s) => {
      const bucket = dailyGoals[s.date];
      if (!bucket) return;
      bucket.goals.push({
        goalId: s.goal_id,
        completed: s.completed,
        completedAt: s.completed_at ?? undefined,
        completedSteps: s.completed_steps,
        stepCompletions: (s.step_completions ?? []).map((ts) => ts ?? null),
        snoozed: s.snoozed ?? false,
      });
    });

    // Build weeklyGoals by date using a single weekly status payload
    const weeklyGoalsByDate: Record<string, WeeklyGoalWithStatusDTO[]> = {};
    const weeklyGoals = allGoals.filter((g) => g.goalType === "weekly") as Array<{
      id: string;
      title: string;
      description?: string;
      createdAt: string;
      isActive: boolean;
      goalType: "weekly";
      daysOfWeek: string[];
      isMultiStep: boolean;
      totalSteps: number;
    }>;
    const weeklyStatusMap = new Map(
      ((weeklyStatusData as WeeklyStatusRow[] | null) ?? []).map((s) => [
        s.goal_id,
        s,
      ])
    );

    weekDates.forEach((d) => {
      weeklyGoalsByDate[d] = weeklyGoals.map((g) => {
        const s = weeklyStatusMap.get(g.id);
        const dailyIncremented = s?.daily_increments?.[d] ?? false;
        return {
          ...g,
          completed: s?.completed ?? false,
          completedAt: s?.completed_at ?? undefined,
          completedSteps: s?.completed_steps ?? 0,
          stepCompletions: (s?.step_completions ?? []).map((ts) => ts ?? null),
          dailyIncremented,
        };
      });
    });

    return NextResponse.json({
      weekStart,
      weekDates,
      goals: allGoals,
      dailyGoals,
      weeklyGoals: weeklyGoalsByDate,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


