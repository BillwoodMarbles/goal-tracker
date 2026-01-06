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

    // 4) Fetch group goals the user is a member of
    const { data: membershipData } = await supabase
      .from("group_goal_members")
      .select("group_goal_id, role")
      .eq("user_id", user.id)
      .is("left_at", null);

    const groupGoalIds = (membershipData || []).map((m) => m.group_goal_id);
    const membershipMap = new Map(
      (membershipData || []).map((m) => [m.group_goal_id, m.role])
    );

    const groupGoals: unknown[] = [];
    const historicalGroupGoals: unknown[] = [];

    if (groupGoalIds.length > 0) {
      // Fetch group goals
      const { data: groupGoalsData } = await supabase
        .from("group_goals")
        .select("id, owner_id, title, description, created_at, is_active, start_date, end_date, days_of_week, total_steps")
        .in("id", groupGoalIds)
        .eq("is_active", true);

      // Fetch all members for these goals
      const { data: allMembersData } = await supabase
        .from("group_goal_members")
        .select("group_goal_id, user_id")
        .in("group_goal_id", groupGoalIds)
        .is("left_at", null);

      const membersByGoal = new Map<string, string[]>();
      (allMembersData || []).forEach((m) => {
        if (!membersByGoal.has(m.group_goal_id)) {
          membersByGoal.set(m.group_goal_id, []);
        }
        membersByGoal.get(m.group_goal_id)!.push(m.user_id);
      });

      // Fetch statuses for all group goals on this date
      const { data: groupStatusData } = await supabase
        .from("group_daily_goal_status")
        .select("group_goal_id, user_id, completed, completed_at")
        .in("group_goal_id", groupGoalIds)
        .eq("date", date);

      const statusesByGoal = new Map<string, Map<string, { completed: boolean; completed_at: string | null }>>();
      (groupStatusData || []).forEach((s) => {
        if (!statusesByGoal.has(s.group_goal_id)) {
          statusesByGoal.set(s.group_goal_id, new Map());
        }
        statusesByGoal.get(s.group_goal_id)!.set(s.user_id, {
          completed: s.completed,
          completed_at: s.completed_at,
        });
      });

      // Process each group goal
      (groupGoalsData || []).forEach((gg) => {
        const members = membersByGoal.get(gg.id) || [];
        const statuses = statusesByGoal.get(gg.id) || new Map();
        
        const membersTotal = members.length;
        const membersCompleted = members.filter((uid) => statuses.get(uid)?.completed).length;
        const selfStatus = statuses.get(user.id);
        const selfCompleted = selfStatus?.completed ?? false;
        const allCompleted = membersTotal > 0 && membersCompleted === membersTotal;
        
        // Check if goal is active for this day/date
        const isActiveForDay = (gg.days_of_week || []).includes(dayOfWeek);
        const isInDateRange = 
          (!gg.start_date || gg.start_date <= date) &&
          (!gg.end_date || gg.end_date >= date);
        
        const goalData = {
          id: gg.id,
          ownerId: gg.owner_id,
          title: gg.title,
          description: gg.description ?? undefined,
          createdAt: gg.created_at,
          isActive: gg.is_active,
          startDate: gg.start_date,
          endDate: gg.end_date,
          daysOfWeek: gg.days_of_week ?? [],
          totalSteps: gg.total_steps,
          membersTotal,
          membersCompleted,
          selfCompleted,
          allCompleted,
          role: membershipMap.get(gg.id) || "member",
        };

        // Separate active vs historical
        if (gg.end_date && gg.end_date < date) {
          historicalGroupGoals.push(goalData);
        } else if (isActiveForDay && isInDateRange) {
          groupGoals.push(goalData);
        }
      });
    }

    return NextResponse.json({
      date,
      weekStart,
      goals,
      weeklyGoals,
      inactiveGoals,
      completionStats: { total, completed, percentage },
      groupGoals,
      historicalGroupGoals,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


