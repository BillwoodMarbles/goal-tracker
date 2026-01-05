"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Goal, GoalWithStatus, DayOfWeek, GoalType } from "../types";
import {
  SupabaseGoalsService,
  getTodayString,
} from "../services/supabaseGoalsService";
import { useSupabaseAuth } from "@/app/contexts/SupabaseAuthContext";

type CompletionStats = { total: number; completed: number; percentage: number };

const DAY_SET = new Set([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

type GoalWithStatusDTO = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  isActive: boolean;
  goalType: "daily" | "weekly";
  daysOfWeek: string[];
  isMultiStep: boolean;
  totalSteps: number;
  completed: boolean;
  completedAt?: string;
  completedSteps: number;
  stepCompletions: (string | null)[];
  snoozed?: boolean;
  dailyIncremented?: boolean;
};

type DailyResponseDTO = {
  date: string;
  goals: GoalWithStatusDTO[];
  weeklyGoals: GoalWithStatusDTO[];
  inactiveGoals: GoalWithStatusDTO[];
  completionStats: CompletionStats;
};

/**
 * React StrictMode (dev) mounts/unmounts components twice to detect side effects.
 * If we abort fetches during cleanup, DevTools will show a "cancelled" request.
 *
 * To guarantee only ONE network request for a given (userId, date), we single-flight
 * dedupe in-flight requests across mounts.
 */
const dailyInflightByKey = new Map<string, Promise<DailyResponseDTO>>();

function toDayOfWeekArray(days: string[]): DayOfWeek[] {
  return (days || []).filter((d): d is DayOfWeek => DAY_SET.has(d));
}

function dtoToGoalWithStatus(dto: GoalWithStatusDTO): GoalWithStatus {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    createdAt: new Date(dto.createdAt),
    isActive: dto.isActive,
    goalType: dto.goalType as GoalType,
    daysOfWeek: toDayOfWeekArray(dto.daysOfWeek || []),
    isMultiStep: dto.isMultiStep,
    totalSteps: dto.totalSteps,
    completed: dto.completed,
    completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
    completedSteps: dto.completedSteps,
    stepCompletions: (dto.stepCompletions || []).map((ts) =>
      ts ? new Date(ts) : undefined
    ),
    snoozed: dto.snoozed,
    dailyIncremented: dto.dailyIncremented,
  };
}

export const useGoals = (selectedDate?: string) => {
  const [goals, setGoals] = useState<GoalWithStatus[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalWithStatus[]>([]);
  const [inactiveGoals, setInactiveGoals] = useState<GoalWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionStats, setCompletionStats] = useState<CompletionStats>({
    total: 0,
    completed: 0,
    percentage: 0,
  });

  const currentDate = selectedDate || getTodayString();
  const { user } = useSupabaseAuth();
  const userId = user?.id ?? null;

  // Prevent setting state after unmount (StrictMode dev cycle, navigation, etc.)
  const mountedRef = useRef(false);

  // Load goals with their completion status for the selected date
  const loadGoals = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const requestKey = `${userId}:${currentDate}`;

    try {
      setLoading(true);
      const inflight =
        dailyInflightByKey.get(requestKey) ??
        (async () => {
          const res = await fetch(`/api/goals/daily?date=${currentDate}`);

          if (!res.ok) {
            if (res.status === 401) {
              throw Object.assign(new Error("Not signed in"), {
                name: "UnauthorizedError",
              });
            }
            throw new Error(`Failed to load daily data (${res.status})`);
          }

          return (await res.json()) as DailyResponseDTO;
        })();

      if (!dailyInflightByKey.has(requestKey)) {
        dailyInflightByKey.set(requestKey, inflight);
        void inflight.finally(() => {
          // Only clear if the same promise is still registered.
          if (dailyInflightByKey.get(requestKey) === inflight) {
            dailyInflightByKey.delete(requestKey);
          }
        });
      }

      const dto = await inflight;
      const nextGoals = (dto.goals || []).map(dtoToGoalWithStatus);
      const nextWeeklyGoals = (dto.weeklyGoals || []).map(dtoToGoalWithStatus);
      const nextInactiveGoals = (dto.inactiveGoals || []).map(
        dtoToGoalWithStatus
      );

      if (!mountedRef.current) return;

      setGoals(nextGoals);
      setWeeklyGoals(nextWeeklyGoals);
      setInactiveGoals(nextInactiveGoals);
      setCompletionStats(
        dto.completionStats || { total: 0, completed: 0, percentage: 0 }
      );
      setError(null);
    } catch (err) {
      if (mountedRef.current) {
        if ((err as { name?: string } | null)?.name === "UnauthorizedError") {
          setError("Not signed in");
          return;
        }
        setError("Failed to load goals");
        console.error("Error loading goals:", err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentDate, userId]);

  // Load goals when component mounts or date changes
  useEffect(() => {
    mountedRef.current = true;
    loadGoals();

    return () => {
      mountedRef.current = false;
    };
  }, [loadGoals]);

  // Add a new goal
  const addGoal = useCallback(
    async (
      title: string,
      description?: string,
      daysOfWeek?: DayOfWeek[],
      isMultiStep?: boolean,
      totalSteps?: number,
      goalType?: GoalType
    ): Promise<Goal | null> => {
      try {
        if (!title.trim()) {
          setError("Goal title is required");
          return null;
        }

        const storageService = SupabaseGoalsService.getInstance();
        const newGoal = await storageService.addGoal(
          title.trim(),
          description?.trim(),
          daysOfWeek,
          isMultiStep,
          totalSteps,
          goalType
        );
        // Reload data
        await loadGoals(); // Refresh the goals list
        setError(null);
        return newGoal;
      } catch (err) {
        setError("Failed to add goal");
        console.error("Error adding goal:", err);
        return null;
      }
    },
    [loadGoals]
  );

  // Toggle goal completion for the current date
  const toggleGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        // Check if it's a weekly goal using already-loaded data
        const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
        if (goal?.goalType === GoalType.WEEKLY) {
          const newCompletionStatus = await storageService.toggleWeeklyGoal(
            goalId,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return newCompletionStatus;
        } else {
          const newCompletionStatus = await storageService.toggleGoalCompletion(
            goalId,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return newCompletionStatus;
        }
      } catch (err) {
        setError("Failed to toggle goal completion");
        console.error("Error toggling goal:", err);
        return false;
      }
    },
    [currentDate, loadGoals, goals, weeklyGoals]
  );

  // Toggle individual step for multi-step goals
  const toggleGoalStep = useCallback(
    async (goalId: string, stepIndex: number): Promise<boolean> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        // Check if it's a weekly goal using already-loaded data
        const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
        if (goal?.goalType === GoalType.WEEKLY) {
          const newStepStatus = await storageService.toggleWeeklyGoalStep(
            goalId,
            stepIndex,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return newStepStatus;
        } else {
          const newStepStatus = await storageService.toggleGoalStep(
            goalId,
            stepIndex,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return newStepStatus;
        }
      } catch (err) {
        setError("Failed to toggle goal step");
        console.error("Error toggling goal step:", err);
        return false;
      }
    },
    [currentDate, loadGoals, goals, weeklyGoals]
  );

  // Increment step completion for multi-step goals
  const incrementGoalStep = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        // Check if it's a weekly goal using already-loaded data
        const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
        if (goal?.goalType === GoalType.WEEKLY) {
          const success = await storageService.incrementWeeklyGoalStep(
            goalId,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return success;
        } else {
          const success = await storageService.incrementGoalStep(
            goalId,
            currentDate
          );
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
          return success;
        }
      } catch (err) {
        setError("Failed to increment goal step");
        console.error("Error incrementing goal step:", err);
        return false;
      }
    },
    [currentDate, loadGoals, goals, weeklyGoals]
  );

  // Update an existing goal
  const updateGoal = useCallback(
    async (goalId: string, updates: Partial<Goal>): Promise<Goal | null> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        const updatedGoal = await storageService.updateGoal(goalId, updates);
        if (updatedGoal) {
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
        } else {
          setError("Goal not found");
        }
        return updatedGoal;
      } catch (err) {
        setError("Failed to update goal");
        console.error("Error updating goal:", err);
        return null;
      }
    },
    [loadGoals]
  );

  // Delete a goal (soft delete)
  const deleteGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        const success = await storageService.deleteGoal(goalId);
        if (success) {
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
        } else {
          setError("Goal not found");
        }
        return success;
      } catch (err) {
        setError("Failed to delete goal");
        console.error("Error deleting goal:", err);
        return false;
      }
    },
    [loadGoals]
  );

  // Get completion statistics for the current date
  const getStats = useCallback(() => {
    // Never do network reads from render; stats are derived from the API response.
    return completionStats;
  }, [completionStats]);

  // Snooze a goal
  const snoozeGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const storageService = SupabaseGoalsService.getInstance();
        const success = await storageService.snoozeGoal(goalId, currentDate);

        if (success) {
          // Reload data
          await loadGoals(); // Refresh the goals list
          setError(null);
        } else {
          setError("Failed to snooze goal");
        }
        return success;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setError("Failed to snooze goal");
        return false;
      }
    },
    [currentDate, loadGoals]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    goals,
    weeklyGoals,
    inactiveGoals,
    loading,
    error,
    addGoal,
    toggleGoal,
    toggleGoalStep,
    incrementGoalStep,
    updateGoal,
    deleteGoal,
    snoozeGoal,
    getStats,
    completionStats,
    clearError,
    refresh: loadGoals,
  };
};
