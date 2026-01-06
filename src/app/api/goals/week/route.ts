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
    const weeklyGoals = allGoals.filter(
      (g) => g.goalType === "weekly"
    ) as Array<{
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

    const groupGoalsByDate: Record<string, unknown[]> = {};
    weekDates.forEach((d) => {
      groupGoalsByDate[d] = [];
    });

    if (groupGoalIds.length > 0) {
      // Fetch group goals
      const { data: groupGoalsData } = await supabase
        .from("group_goals")
        .select(
          "id, owner_id, title, description, created_at, is_active, start_date, end_date, days_of_week, total_steps"
        )
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

      // Fetch statuses for all group goals for the week
      const { data: groupStatusData } = await supabase
        .from("group_daily_goal_status")
        .select("group_goal_id, user_id, date, completed, completed_at")
        .in("group_goal_id", groupGoalIds)
        .gte("date", weekStart)
        .lte("date", weekEnd);

      const statusesByGoalAndDate = new Map<
        string,
        Map<
          string,
          Map<string, { completed: boolean; completed_at: string | null }>
        >
      >();
      (groupStatusData || []).forEach((s) => {
        if (!statusesByGoalAndDate.has(s.group_goal_id)) {
          statusesByGoalAndDate.set(s.group_goal_id, new Map());
        }
        const goalStatuses = statusesByGoalAndDate.get(s.group_goal_id)!;
        if (!goalStatuses.has(s.date)) {
          goalStatuses.set(s.date, new Map());
        }
        goalStatuses.get(s.date)!.set(s.user_id, {
          completed: s.completed,
          completed_at: s.completed_at,
        });
      });

      // Process each group goal for each date
      weekDates.forEach((d) => {
        const dayOfWeek = dayjs(d).format("dddd").toLowerCase();

        (groupGoalsData || []).forEach((gg) => {
          const members = membersByGoal.get(gg.id) || [];
          const dateStatuses =
            statusesByGoalAndDate.get(gg.id)?.get(d) || new Map();

          const membersTotal = members.length;
          const membersCompleted = members.filter(
            (uid) => dateStatuses.get(uid)?.completed
          ).length;
          const selfStatus = dateStatuses.get(user.id);
          const selfCompleted = selfStatus?.completed ?? false;
          const allCompleted =
            membersTotal > 0 && membersCompleted === membersTotal;

          // Check if goal is active for this day/date
          const isActiveForDay = (gg.days_of_week || []).includes(dayOfWeek);
          const isInDateRange =
            (!gg.start_date || gg.start_date <= d) &&
            (!gg.end_date || gg.end_date >= d);

          if (isActiveForDay && isInDateRange) {
            groupGoalsByDate[d].push({
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
            });
          }
        });
      });
    }

    return NextResponse.json({
      weekStart,
      weekDates,
      goals: allGoals,
      dailyGoals,
      weeklyGoals: weeklyGoalsByDate,
      groupGoals: groupGoalsByDate,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
