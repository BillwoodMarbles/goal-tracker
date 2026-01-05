import dayjs from "dayjs";
import {
  Goal,
  DailyGoals,
  WeeklyGoalDailyStatus,
  GoalsData,
  DayOfWeek,
  DAYS_OF_WEEK,
  getDayOfWeekFromIndex,
  GoalType,
  GoalWithStatus,
  DailyGoalStatus,
} from "../types";
import { getSupabaseBrowserClient } from "@/app/services/supabaseClient";

// Utility functions for date handling
export const formatDate = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DD");
};

export const getTodayString = (): string => {
  return dayjs().format("YYYY-MM-DD");
};

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const dayIndex = dayjs().day();
  return getDayOfWeekFromIndex(dayIndex);
};

// Type for goal row from database
type GoalRow = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  is_active: boolean;
  goal_type: string;
  days_of_week: string[];
  is_multi_step: boolean;
  total_steps: number;
};

// Supabase-backed Goals Service
export class SupabaseGoalsService {
  private static instance: SupabaseGoalsService;
  private supabase = getSupabaseBrowserClient();

  static getInstance(): SupabaseGoalsService {
    if (!SupabaseGoalsService.instance) {
      SupabaseGoalsService.instance = new SupabaseGoalsService();
    }
    return SupabaseGoalsService.instance;
  }

  // Initialize or get user profile
  private profileInitializedUserId: string | null = null;

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error("Not authenticated");
    return userId;
  }

  async initializeProfile(userId: string): Promise<void> {
    // Only initialize once per user session
    if (this.profileInitializedUserId === userId) {
      return;
    }

    const { data: existingProfile } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      await this.supabase.from("profiles").insert({
        id: userId,
        last_active_at: new Date().toISOString(),
      });
    } else {
      // Update last_active asynchronously, don't await
      this.supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", userId)
        .then(() => {})
        .catch((err: unknown) =>
          console.warn("Failed to update last_active_at:", err)
        );
    }

    this.profileInitializedUserId = userId;
  }

  // Private helper to transform goal rows
  private transformGoalRow(row: GoalRow): Goal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      createdAt: new Date(row.created_at),
      isActive: row.is_active,
      goalType: row.goal_type as GoalType,
      daysOfWeek: row.days_of_week as DayOfWeek[],
      isMultiStep: row.is_multi_step,
      totalSteps: row.total_steps,
    };
  }

  // Goal CRUD operations
  async getGoals(): Promise<Goal[]> {
    const { data, error } = await this.supabase
      .from("goals")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      return [];
    }

    return (data || []).map((row: GoalRow) => this.transformGoalRow(row));
  }

  async addGoal(
    title: string,
    description?: string,
    daysOfWeek: DayOfWeek[] = [...DAYS_OF_WEEK],
    isMultiStep: boolean = false,
    totalSteps: number = 1,
    goalType: GoalType = GoalType.DAILY
  ): Promise<Goal> {
    const userId = await this.requireUserId();
    await this.initializeProfile(userId);

    const { data, error } = await this.supabase
      .from("goals")
      .insert({
        user_id: userId,
        title,
        description,
        days_of_week: daysOfWeek,
        is_multi_step: isMultiStep,
        total_steps: Math.max(1, totalSteps),
        goal_type: goalType,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding goal:", error);
      throw error;
    }

    return this.transformGoalRow(data);
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.goalType !== undefined) updateData.goal_type = updates.goalType;
    if (updates.daysOfWeek !== undefined)
      updateData.days_of_week = updates.daysOfWeek;
    if (updates.isMultiStep !== undefined)
      updateData.is_multi_step = updates.isMultiStep;
    if (updates.totalSteps !== undefined)
      updateData.total_steps = updates.totalSteps;

    const { data, error } = await this.supabase
      .from("goals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating goal:", error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      createdAt: new Date(data.created_at),
      isActive: data.is_active,
      goalType: data.goal_type as GoalType,
      daysOfWeek: data.days_of_week as DayOfWeek[],
      isMultiStep: data.is_multi_step,
      totalSteps: data.total_steps,
    };
  }

  async deleteGoal(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("goals")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Error deleting goal:", error);
      return false;
    }

    return true;
  }

  getGoalsForDay(dayOfWeek: DayOfWeek, allGoals: Goal[]): Goal[] {
    return allGoals.filter(
      (goal) =>
        goal.isActive &&
        goal.goalType === GoalType.DAILY &&
        goal.daysOfWeek?.includes(dayOfWeek)
    );
  }

  async getGoalsForToday(): Promise<Goal[]> {
    const allGoals = await this.getGoals();
    return this.getGoalsForDay(getCurrentDayOfWeek(), allGoals);
  }

  // Daily goal status operations
  async getDailyGoals(date: string = getTodayString()): Promise<DailyGoals> {
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    const allGoals = await this.getGoals();
    const goalsForDay = this.getGoalsForDay(dayOfWeek, allGoals);

    const { data: statusData } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .eq("date", date);

    const statusMap = new Map(
      (statusData || []).map(
        (status: {
          goal_id: string;
          completed: boolean;
          completed_at: string | null;
          completed_steps: number;
          step_completions: (string | null)[];
          snoozed: boolean;
        }) => [status.goal_id, status]
      )
    );

    type DailyStatusRow = {
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      snoozed: boolean;
    };

    const goals: DailyGoalStatus[] = goalsForDay.map((goal) => {
      const status = statusMap.get(goal.id) as DailyStatusRow | undefined;
      if (status) {
        return {
          goalId: goal.id,
          completed: status.completed,
          completedAt: status.completed_at
            ? new Date(status.completed_at)
            : undefined,
          completedSteps: status.completed_steps,
          stepCompletions: (status.step_completions || []).map(
            (ts: string | null) => (ts ? new Date(ts) : undefined)
          ),
          snoozed: status.snoozed,
        };
      }
      return {
        goalId: goal.id,
        completed: false,
        completedSteps: 0,
        stepCompletions: [],
        snoozed: false,
      };
    });

    return {
      date,
      goals,
      lastUpdated: new Date(),
    };
  }

  async toggleGoalCompletion(
    goalId: string,
    date: string = getTodayString()
  ): Promise<boolean> {
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (!goal) return false;

    const { data: existing } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("date", date)
      .maybeSingle();

    const currentCompleted = existing?.completed || false;
    const newCompleted = !currentCompleted;

    const updateData: Record<string, unknown> = {
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    if (!goal.isMultiStep || goal.totalSteps === 1) {
      updateData.completed_steps = newCompleted ? 1 : 0;
      updateData.step_completions = newCompleted
        ? [new Date().toISOString()]
        : [];
    } else {
      if (newCompleted) {
        updateData.completed_steps = goal.totalSteps;
        updateData.step_completions = Array(goal.totalSteps).fill(
          new Date().toISOString()
        );
      } else {
        updateData.completed_steps = 0;
        updateData.step_completions = [];
      }
    }

    if (existing) {
      await this.supabase
        .from("daily_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("daily_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        date,
        ...updateData,
      });
    }

    return newCompleted;
  }

  async toggleGoalStep(
    goalId: string,
    stepIndex: number,
    date: string = getTodayString()
  ): Promise<boolean> {
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (
      !goal ||
      !goal.isMultiStep ||
      stepIndex < 0 ||
      stepIndex >= goal.totalSteps
    ) {
      return false;
    }

    const { data: existing } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("date", date)
      .maybeSingle();

    const stepCompletions = [...(existing?.step_completions || [])];
    while (stepCompletions.length < goal.totalSteps) {
      stepCompletions.push(null);
    }

    const isStepCompleted = !!stepCompletions[stepIndex];
    if (isStepCompleted) {
      stepCompletions[stepIndex] = null;
    } else {
      stepCompletions[stepIndex] = new Date().toISOString();
    }

    const completedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;
    const completed = completedSteps === goal.totalSteps;

    const updateData = {
      step_completions: stepCompletions,
      completed_steps: completedSteps,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    if (existing) {
      await this.supabase
        .from("daily_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("daily_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        date,
        ...updateData,
      });
    }

    return !isStepCompleted;
  }

  async incrementGoalStep(
    goalId: string,
    date: string = getTodayString()
  ): Promise<boolean> {
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (!goal || !goal.isMultiStep || goal.totalSteps <= 1) {
      return false;
    }

    const { data: existing } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("date", date)
      .maybeSingle();

    let stepCompletions = existing?.step_completions || [];
    while (stepCompletions.length < goal.totalSteps) {
      stepCompletions.push(null);
    }

    const completedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;

    if (completedSteps >= goal.totalSteps) {
      // Reset
      stepCompletions = Array(goal.totalSteps).fill(null);
      const updateData = {
        step_completions: stepCompletions,
        completed_steps: 0,
        completed: false,
        completed_at: null,
        last_updated: new Date().toISOString(),
      };

      if (existing) {
        await this.supabase
          .from("daily_goal_status")
          .update(updateData)
          .eq("id", existing.id);
      }
      return true;
    }

    const nextIncompleteIndex = stepCompletions.findIndex(
      (step: string | null) => !step
    );
    if (nextIncompleteIndex === -1) return false;

    stepCompletions[nextIncompleteIndex] = new Date().toISOString();
    const newCompletedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;
    const completed = newCompletedSteps >= goal.totalSteps;

    const updateData = {
      step_completions: stepCompletions,
      completed_steps: newCompletedSteps,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    if (existing) {
      await this.supabase
        .from("daily_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("daily_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        date,
        ...updateData,
      });
    }

    return true;
  }

  async getGoalsWithStatus(
    date: string = getTodayString()
  ): Promise<GoalWithStatus[]> {
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    const allGoals = await this.getGoals();
    const goalsForDay = this.getGoalsForDay(dayOfWeek, allGoals);
    const dailyGoals = await this.getDailyGoals(date);

    return goalsForDay.map((goal) => {
      const status = dailyGoals.goals.find((gs) => gs.goalId === goal.id);
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
        snoozed: status?.snoozed || false,
      };
    });
  }

  async getInactiveGoalsForDate(
    date: string = getTodayString()
  ): Promise<GoalWithStatus[]> {
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    const allGoals = await this.getGoals();
    const inactiveGoals = allGoals.filter(
      (goal) => !goal.daysOfWeek?.includes(dayOfWeek)
    );

    return inactiveGoals.map((goal) => ({
      ...goal,
      completed: false,
      completedAt: undefined,
      completedSteps: 0,
      stepCompletions: [],
    }));
  }

  async snoozeGoal(
    goalId: string,
    date: string = getTodayString()
  ): Promise<boolean> {
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (!goal || goal.goalType === GoalType.WEEKLY) {
      return false;
    }

    const { data: existing } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("date", date)
      .maybeSingle();

    const currentSnoozed = existing?.snoozed || false;
    const newSnoozed = !currentSnoozed;

    const updateData: Record<string, unknown> = {
      snoozed: newSnoozed,
      last_updated: new Date().toISOString(),
    };

    if (newSnoozed) {
      updateData.completed = false;
      updateData.completed_at = null;
      updateData.completed_steps = 0;
      updateData.step_completions = [];
    }

    if (existing) {
      await this.supabase
        .from("daily_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("daily_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        date,
        ...updateData,
      });
    }

    return true;
  }

  getCompletionStatsFromData(goalsWithStatus: GoalWithStatus[]) {
    const dailyGoalsWithStatus = goalsWithStatus.filter(
      (goal) => goal.goalType === GoalType.DAILY
    );

    const totalGoals = dailyGoalsWithStatus.length;
    let totalPercentage = 0;

    dailyGoalsWithStatus.forEach((goal) => {
      if (goal.isMultiStep && goal.totalSteps > 1) {
        const goalCompletionPercentage =
          (goal.completedSteps / goal.totalSteps) * 100;
        totalPercentage += goalCompletionPercentage / totalGoals;
      } else {
        const goalCompletionPercentage = goal.completed ? 100 : 0;
        totalPercentage += goalCompletionPercentage / totalGoals;
      }
    });

    return {
      total: totalGoals,
      completed: dailyGoalsWithStatus.filter((g) => g.completed).length,
      percentage: Math.round(totalPercentage),
    };
  }

  async getCompletionStats(date: string = getTodayString()) {
    const goalsWithStatus = await this.getGoalsWithStatus(date);
    return this.getCompletionStatsFromData(goalsWithStatus);
  }

  // Weekly goal operations
  private getWeekStart(date: string): string {
    const dateObj = dayjs(date);
    const dayOfWeek = dateObj.day();
    const weekStart = dateObj.subtract(dayOfWeek, "day");
    return weekStart.format("YYYY-MM-DD");
  }

  async getWeeklyGoalsForDate(
    date: string = getTodayString()
  ): Promise<GoalWithStatus[]> {
    const weekStart = this.getWeekStart(date);
    const allGoals = await this.getGoals();
    const weeklyGoals = allGoals.filter(
      (goal) => goal.isActive && goal.goalType === GoalType.WEEKLY
    );

    const { data: statusData } = await this.supabase
      .from("weekly_goal_status")
      .select("*")
      .eq("week_start", weekStart);

    const statusMap = new Map(
      (statusData || []).map(
        (status: {
          goal_id: string;
          completed: boolean;
          completed_at: string | null;
          completed_steps: number;
          step_completions: (string | null)[];
          daily_increments: Record<string, boolean>;
        }) => [status.goal_id, status]
      )
    );

    type WeeklyStatusRow = {
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      daily_increments: Record<string, boolean>;
    };

    return weeklyGoals.map((goal) => {
      const status = statusMap.get(goal.id) as WeeklyStatusRow | undefined;
      const dailyIncremented =
        status?.daily_increments?.[
          date as keyof typeof status.daily_increments
        ] || false;

      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completed_at
          ? new Date(status.completed_at)
          : undefined,
        completedSteps: status?.completed_steps || 0,
        stepCompletions: (status?.step_completions || []).map(
          (ts: string | null) => (ts ? new Date(ts) : undefined)
        ),
        dailyIncremented,
      };
    });
  }

  async toggleWeeklyGoal(
    goalId: string,
    date: string = getTodayString()
  ): Promise<boolean> {
    const weekStart = this.getWeekStart(date);
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (!goal) return false;

    const { data: existing } = await this.supabase
      .from("weekly_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("week_start", weekStart)
      .maybeSingle();

    const currentCompleted = existing?.completed || false;
    const newCompleted = !currentCompleted;

    const updateData: Record<string, unknown> = {
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    if (!goal.isMultiStep || goal.totalSteps === 1) {
      updateData.completed_steps = newCompleted ? 1 : 0;
      updateData.step_completions = newCompleted
        ? [new Date().toISOString()]
        : [];
    } else {
      if (newCompleted) {
        updateData.completed_steps = goal.totalSteps;
        updateData.step_completions = Array(goal.totalSteps).fill(
          new Date().toISOString()
        );
      } else {
        updateData.completed_steps = 0;
        updateData.step_completions = [];
      }
    }

    if (existing) {
      await this.supabase
        .from("weekly_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("weekly_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        week_start: weekStart,
        daily_increments: {},
        ...updateData,
      });
    }

    return newCompleted;
  }

  async toggleWeeklyGoalStep(
    goalId: string,
    stepIndex: number,
    date: string = getTodayString()
  ): Promise<boolean> {
    const weekStart = this.getWeekStart(date);
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (!goal || goal.goalType !== GoalType.WEEKLY) {
      return false;
    }

    const { data: existing } = await this.supabase
      .from("weekly_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("week_start", weekStart)
      .maybeSingle();

    const maxSteps = Math.max(goal.totalSteps * 2, stepIndex + 1);
    const stepCompletions = [...(existing?.step_completions || [])];
    while (stepCompletions.length < maxSteps) {
      stepCompletions.push(null);
    }

    const isStepCompleted = !!stepCompletions[stepIndex];
    if (isStepCompleted) {
      stepCompletions[stepIndex] = null;
    } else {
      stepCompletions[stepIndex] = new Date().toISOString();
    }

    const completedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;
    const completed = completedSteps >= goal.totalSteps;

    const updateData = {
      step_completions: stepCompletions,
      completed_steps: completedSteps,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    if (existing) {
      await this.supabase
        .from("weekly_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("weekly_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        week_start: weekStart,
        daily_increments: {},
        ...updateData,
      });
    }

    return !isStepCompleted;
  }

  async incrementWeeklyGoalStep(
    goalId: string,
    date: string = getTodayString()
  ): Promise<boolean> {
    const weekStart = this.getWeekStart(date);
    const allGoals = await this.getGoals();
    const goal = allGoals.find((g) => g.id === goalId);

    if (
      !goal ||
      goal.goalType !== GoalType.WEEKLY ||
      !goal.isMultiStep ||
      goal.totalSteps <= 1
    ) {
      return false;
    }

    const { data: existing } = await this.supabase
      .from("weekly_goal_status")
      .select("*")
      .eq("goal_id", goalId)
      .eq("week_start", weekStart)
      .single();

    const stepCompletions = [...(existing?.step_completions || [])];
    while (stepCompletions.length < goal.totalSteps) {
      stepCompletions.push(null);
    }

    const dailyIncrements = existing?.daily_increments || {};
    const alreadyIncrementedToday = dailyIncrements[date] || false;

    if (alreadyIncrementedToday) {
      // Undo last increment
      const lastCompletedIndex = stepCompletions
        .map((s: string | null, i: number) => (s ? i : -1))
        .filter((i: number) => i >= 0)
        .pop();

      if (lastCompletedIndex !== undefined && lastCompletedIndex >= 0) {
        stepCompletions[lastCompletedIndex] = null;
        dailyIncrements[date] = false;

        const completedSteps = stepCompletions.filter(
          (s: string | null) => s
        ).length;
        const completed = completedSteps >= goal.totalSteps;

        await this.supabase
          .from("weekly_goal_status")
          .update({
            step_completions: stepCompletions,
            completed_steps: completedSteps,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            daily_increments: dailyIncrements,
            last_updated: new Date().toISOString(),
          })
          .eq("id", existing.id);

        return true;
      }
      return false;
    }

    const completedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;

    if (completedSteps >= goal.totalSteps) {
      // Over-completion
      stepCompletions.push(new Date().toISOString());
      dailyIncrements[date] = true;

      const newCompletedSteps = stepCompletions.filter(
        (s: string | null) => s
      ).length;

      const updateData = {
        step_completions: stepCompletions,
        completed_steps: newCompletedSteps,
        completed: true,
        completed_at: new Date().toISOString(),
        daily_increments: dailyIncrements,
        last_updated: new Date().toISOString(),
      };

      if (existing) {
        await this.supabase
          .from("weekly_goal_status")
          .update(updateData)
          .eq("id", existing.id);
      } else {
        const userId = await this.requireUserId();
        await this.supabase.from("weekly_goal_status").insert({
          user_id: userId,
          goal_id: goalId,
          week_start: weekStart,
          ...updateData,
        });
      }
      return true;
    }

    const nextIncompleteIndex = stepCompletions.findIndex(
      (step: string | null) => !step
    );
    if (nextIncompleteIndex === -1) return false;

    stepCompletions[nextIncompleteIndex] = new Date().toISOString();
    dailyIncrements[date] = true;

    const newCompletedSteps = stepCompletions.filter(
      (s: string | null) => s
    ).length;
    const completed = newCompletedSteps >= goal.totalSteps;

    const updateData = {
      step_completions: stepCompletions,
      completed_steps: newCompletedSteps,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      daily_increments: dailyIncrements,
      last_updated: new Date().toISOString(),
    };

    if (existing) {
      await this.supabase
        .from("weekly_goal_status")
        .update(updateData)
        .eq("id", existing.id);
    } else {
      const userId = await this.requireUserId();
      await this.supabase.from("weekly_goal_status").insert({
        user_id: userId,
        goal_id: goalId,
        week_start: weekStart,
        ...updateData,
      });
    }

    return true;
  }

  // Batch loading methods for week view
  private generateWeekDates(weekStart: string): string[] {
    const dates: string[] = [];
    const startDate = dayjs(weekStart).day(0);

    for (let i = 0; i < 7; i++) {
      dates.push(startDate.add(i, "day").format("YYYY-MM-DD"));
    }

    return dates;
  }

  // OPTIMIZED: Get all data for week view in minimal queries
  // This is the PRIMARY method for loading week view - makes only 3 database queries
  async getWeekData(weekStart: string) {
    const weekDates = this.generateWeekDates(weekStart);
    const weekEnd = weekDates[weekDates.length - 1];

    // Query 1: Get all active goals
    const { data: goalsData, error: goalsError } = await this.supabase
      .from("goals")
      .select(
        "id, title, description, created_at, is_active, goal_type, days_of_week, is_multi_step, total_steps"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
      return { goals: [], dailyGoals: {}, weeklyGoals: {}, weekDates };
    }

    const allGoals = (goalsData || []).map((row: GoalRow) =>
      this.transformGoalRow(row)
    );

    // Query 2 & 3: Fetch all statuses for the entire week in parallel
    const [dailyStatusData, weeklyStatusData] = await Promise.all([
      // Get all daily statuses for the week in ONE query
      this.supabase
        .from("daily_goal_status")
        .select(
          "date, goal_id, completed, completed_at, completed_steps, step_completions, snoozed"
        )
        .gte("date", weekStart)
        .lte("date", weekEnd),
      // Get weekly status for the week
      this.supabase
        .from("weekly_goal_status")
        .select(
          "goal_id, completed, completed_at, completed_steps, step_completions, daily_increments"
        )
        .eq("week_start", weekStart),
    ]);

    // Build dailyGoals map from the batch result
    const dailyGoals: { [date: string]: DailyGoals } = {};
    weekDates.forEach((date) => {
      dailyGoals[date] = { date, goals: [], lastUpdated: new Date() };
    });

    type DailyStatusRow = {
      date: string;
      goal_id: string;
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      snoozed: boolean;
    };

    (dailyStatusData.data || []).forEach((status: DailyStatusRow) => {
      const date = status.date;
      if (dailyGoals[date]) {
        dailyGoals[date].goals.push({
          goalId: status.goal_id,
          completed: status.completed,
          completedAt: status.completed_at
            ? new Date(status.completed_at)
            : undefined,
          completedSteps: status.completed_steps,
          stepCompletions: (status.step_completions || []).map(
            (ts: string | null) => (ts ? new Date(ts) : undefined)
          ),
          snoozed: status.snoozed,
        });
      }
    });

    // Build weeklyGoals map from the batch result
    type WeeklyStatusRow = {
      goal_id: string;
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      daily_increments: Record<string, boolean>;
    };

    const weeklyGoals: { [date: string]: GoalWithStatus[] } = {};
    const weeklyStatusMap = new Map(
      (weeklyStatusData.data || []).map((status: WeeklyStatusRow) => [
        status.goal_id,
        status,
      ])
    );

    weekDates.forEach((date) => {
      const weeklyGoalsForDate = allGoals.filter(
        (goal: Goal) => goal.isActive && goal.goalType === GoalType.WEEKLY
      );

      weeklyGoals[date] = weeklyGoalsForDate.map((goal: Goal) => {
        const status = weeklyStatusMap.get(goal.id) as
          | WeeklyStatusRow
          | undefined;
        const dailyIncremented = status?.daily_increments?.[date] || false;

        return {
          ...goal,
          completed: status?.completed || false,
          completedAt: status?.completed_at
            ? new Date(status.completed_at)
            : undefined,
          completedSteps: status?.completed_steps || 0,
          stepCompletions: (status?.step_completions || []).map(
            (ts: string | null) => (ts ? new Date(ts) : undefined)
          ),
          dailyIncremented,
        };
      });
    });

    return {
      goals: allGoals,
      dailyGoals,
      weeklyGoals,
      weekDates,
    };
  }

  async getDateData(date: string) {
    // Optimize: Get all goals once and reuse for all three methods
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);
    const weekStart = this.getWeekStart(date);

    // Query 1: Get all active goals in a SINGLE query (don't call getGoals() to avoid extra abstraction)
    const { data: goalsData, error: goalsError } = await this.supabase
      .from("goals")
      .select(
        "id, title, description, created_at, is_active, goal_type, days_of_week, is_multi_step, total_steps"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
      return { goals: [], weeklyGoals: [], inactiveGoals: [] };
    }

    const allGoals = (goalsData || []).map((row: GoalRow) =>
      this.transformGoalRow(row)
    );

    // Get goals for this day of week (daily goals)
    const goalsForDay = this.getGoalsForDay(dayOfWeek, allGoals);

    // Get weekly goals
    const weeklyGoalsForDate = allGoals.filter(
      (goal: Goal) => goal.isActive && goal.goalType === GoalType.WEEKLY
    );

    // Get inactive goals (goals not active today)
    const inactiveGoalsForDate = allGoals.filter(
      (goal: Goal) => !goal.daysOfWeek?.includes(dayOfWeek)
    );

    // Query 2 & 3: Fetch ONLY the statuses needed for this date in parallel
    const [dailyStatusData, weeklyStatusData] = await Promise.all([
      this.supabase
        .from("daily_goal_status")
        .select(
          "goal_id, completed, completed_at, completed_steps, step_completions, snoozed"
        )
        .eq("date", date),
      this.supabase
        .from("weekly_goal_status")
        .select(
          "goal_id, completed, completed_at, completed_steps, step_completions, daily_increments"
        )
        .eq("week_start", weekStart),
    ]);

    // Build daily goals with status
    const dailyStatusMap = new Map(
      (dailyStatusData.data || []).map(
        (status: {
          goal_id: string;
          completed: boolean;
          completed_at: string | null;
          completed_steps: number;
          step_completions: (string | null)[];
          snoozed: boolean;
        }) => [status.goal_id, status]
      )
    );

    type DailyStatusRow2 = {
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      snoozed: boolean;
    };

    const goals = goalsForDay.map((goal: Goal) => {
      const status = dailyStatusMap.get(goal.id) as DailyStatusRow2 | undefined;
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completed_at
          ? new Date(status.completed_at)
          : undefined,
        completedSteps: status?.completed_steps || 0,
        stepCompletions: (status?.step_completions || []).map(
          (ts: string | null) => (ts ? new Date(ts) : undefined)
        ),
        snoozed: status?.snoozed || false,
      };
    });

    // Build weekly goals with status
    type WeeklyStatusRow2 = {
      completed: boolean;
      completed_at: string | null;
      completed_steps: number;
      step_completions: (string | null)[];
      daily_increments: Record<string, boolean>;
    };

    const weeklyStatusMap = new Map(
      (weeklyStatusData.data || []).map(
        (status: {
          goal_id: string;
          completed: boolean;
          completed_at: string | null;
          completed_steps: number;
          step_completions: (string | null)[];
          daily_increments: Record<string, boolean>;
        }) => [status.goal_id, status]
      )
    );

    const weeklyGoals = weeklyGoalsForDate.map((goal: Goal) => {
      const status = weeklyStatusMap.get(goal.id) as
        | WeeklyStatusRow2
        | undefined;
      const dailyIncremented =
        status?.daily_increments?.[
          date as keyof typeof status.daily_increments
        ] || false;

      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completed_at
          ? new Date(status.completed_at)
          : undefined,
        completedSteps: status?.completed_steps || 0,
        stepCompletions: (status?.step_completions || []).map(
          (ts: string | null) => (ts ? new Date(ts) : undefined)
        ),
        dailyIncremented,
      };
    });

    // Inactive goals don't need status
    const inactiveGoals = inactiveGoalsForDate.map((goal: Goal) => ({
      ...goal,
      completed: false,
      completedAt: undefined,
      completedSteps: 0,
      stepCompletions: [],
    }));

    return { goals, weeklyGoals, inactiveGoals };
  }

  // Utility method to get goals data in the legacy format
  async getGoalsData(): Promise<GoalsData> {
    // This returns goals data in the original structure for compatibility
    // In practice, we should use the individual methods above
    const allGoals = await this.getGoals();

    // Fetch all daily and weekly status for the current month
    const today = getTodayString();
    const startOfMonth = dayjs(today).startOf("month").format("YYYY-MM-DD");
    const endOfMonth = dayjs(today).endOf("month").format("YYYY-MM-DD");

    const { data: dailyStatusData } = await this.supabase
      .from("daily_goal_status")
      .select("*")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    const dailyGoals: Record<string, DailyGoals> = {};
    (dailyStatusData || []).forEach(
      (status: {
        date: string;
        goal_id: string;
        completed: boolean;
        completed_at: string | null;
        completed_steps: number;
        step_completions: (string | null)[];
        snoozed: boolean;
        last_updated: string;
      }) => {
        if (!dailyGoals[status.date]) {
          dailyGoals[status.date] = {
            date: status.date,
            goals: [],
            lastUpdated: new Date(status.last_updated),
          };
        }
        dailyGoals[status.date].goals.push({
          goalId: status.goal_id,
          completed: status.completed,
          completedAt: status.completed_at
            ? new Date(status.completed_at)
            : undefined,
          completedSteps: status.completed_steps,
          stepCompletions: (status.step_completions || []).map(
            (ts: string | null) => (ts ? new Date(ts) : undefined)
          ),
          snoozed: status.snoozed,
        });
      }
    );

    // Weekly goals
    const weekStart = this.getWeekStart(today);
    const { data: weeklyStatusData } = await this.supabase
      .from("weekly_goal_status")
      .select("*")
      .eq("week_start", weekStart);

    const weeklyGoals: Record<
      string,
      { weekStart: string; goals: WeeklyGoalDailyStatus[]; lastUpdated: Date }
    > = {};
    if (weeklyStatusData && weeklyStatusData.length > 0) {
      weeklyGoals[weekStart] = {
        weekStart,
        goals: weeklyStatusData.map(
          (status: {
            goal_id: string;
            completed: boolean;
            completed_at: string | null;
            completed_steps: number;
            step_completions: (string | null)[];
            daily_increments: Record<string, boolean>;
            last_updated: string;
          }) => ({
            goalId: status.goal_id,
            completed: status.completed,
            completedAt: status.completed_at
              ? new Date(status.completed_at)
              : undefined,
            completedSteps: status.completed_steps,
            stepCompletions: (status.step_completions || []).map(
              (ts: string | null) => (ts ? new Date(ts) : undefined)
            ),
            dailyIncrements: status.daily_increments || {},
          })
        ),
        lastUpdated: new Date(),
      };
    }

    return {
      goals: allGoals,
      dailyGoals,
      weeklyGoals,
    };
  }

  // Utility methods (no-ops for Supabase)
  saveGoalsData(): void {
    // Not used - Supabase saves data automatically on each operation
  }

  clearAllData(): void {
    // Not used - data management done through Supabase dashboard
  }

  invalidateAllCache(): void {
    // Not needed - no caching layer
  }

  logPerformance(): void {
    // Not needed - use Supabase dashboard for performance monitoring
  }
}
