"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Goal,
  GoalWithStatus,
  DayOfWeek,
  GoalType,
  GroupGoalWithStatus,
} from "../types";
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

type GroupGoalWithStatusDTO = {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  createdAt: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  daysOfWeek: string[];
  totalSteps: number;
  membersTotal: number;
  membersCompleted: number;
  selfCompleted: boolean;
  allCompleted: boolean;
  role: "owner" | "member";
};

type DailyResponseDTO = {
  date: string;
  goals: GoalWithStatusDTO[];
  weeklyGoals: GoalWithStatusDTO[];
  inactiveGoals: GoalWithStatusDTO[];
  completionStats: CompletionStats;
  groupGoals?: GroupGoalWithStatusDTO[];
  historicalGroupGoals?: GroupGoalWithStatusDTO[];
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
  const [groupGoals, setGroupGoals] = useState<GroupGoalWithStatus[]>([]);
  const [historicalGroupGoals, setHistoricalGroupGoals] = useState<
    GroupGoalWithStatus[]
  >([]);
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
  // Used to ignore stale async mutation completions when users tap quickly.
  const mutationSeqRef = useRef(new Map<string, number>());

  // Load goals with their completion status for the selected date
  const loadGoals = useCallback(
    async (opts: { showLoader?: boolean } = {}) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      const requestKey = `${userId}:${currentDate}`;
      const showLoader = opts.showLoader ?? true;

      try {
        if (showLoader) setLoading(true);
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
        const nextWeeklyGoals = (dto.weeklyGoals || []).map(
          dtoToGoalWithStatus
        );
        const nextInactiveGoals = (dto.inactiveGoals || []).map(
          dtoToGoalWithStatus
        );
        const nextGroupGoals = (dto.groupGoals || []).map(
          (gg: GroupGoalWithStatusDTO) => ({
            ...gg,
            createdAt: new Date(gg.createdAt),
            daysOfWeek: toDayOfWeekArray(gg.daysOfWeek || []),
          })
        );
        const nextHistoricalGroupGoals = (dto.historicalGroupGoals || []).map(
          (gg: GroupGoalWithStatusDTO) => ({
            ...gg,
            createdAt: new Date(gg.createdAt),
            daysOfWeek: toDayOfWeekArray(gg.daysOfWeek || []),
          })
        );

        if (!mountedRef.current) return;

        setGoals(nextGoals);
        setWeeklyGoals(nextWeeklyGoals);
        setInactiveGoals(nextInactiveGoals);
        setGroupGoals(nextGroupGoals);
        setHistoricalGroupGoals(nextHistoricalGroupGoals);
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
        if (mountedRef.current && showLoader) {
          setLoading(false);
        }
      }
    },
    [currentDate, userId]
  );

  // Load goals when component mounts or date changes
  useEffect(() => {
    mountedRef.current = true;
    loadGoals({ showLoader: true });

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
        // Refresh without showing the full-page loader
        await loadGoals({ showLoader: false });
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
      // Optimistic UI update: flip locally immediately, submit in background, silently re-sync.
      const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
      if (!goal) return false;

      const nextCompleted = !goal.completed;
      const now = new Date();

      const nextGoal: GoalWithStatus = {
        ...goal,
        completed: nextCompleted,
        completedAt: nextCompleted ? now : undefined,
        // If this goal is multi-step, toggling completion should reflect immediately in the ring.
        ...(goal.isMultiStep && goal.totalSteps > 1
          ? {
              completedSteps: nextCompleted ? goal.totalSteps : 0,
              stepCompletions: nextCompleted
                ? Array(goal.totalSteps).fill(now)
                : Array(goal.totalSteps).fill(undefined),
            }
          : {}),
      };

      const isWeekly = goal.goalType === GoalType.WEEKLY;
      (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
        prev.map((g) => (g.id === goalId ? nextGoal : g))
      );
      setError(null);

      const seq = (mutationSeqRef.current.get(goalId) ?? 0) + 1;
      mutationSeqRef.current.set(goalId, seq);

      void (async () => {
        try {
          const storageService = SupabaseGoalsService.getInstance();
          if (isWeekly) {
            await storageService.toggleWeeklyGoal(goalId, currentDate);
          } else {
            await storageService.toggleGoalCompletion(goalId, currentDate);
          }
          // Silent re-sync to ensure server truth (no list loader).
          await loadGoals({ showLoader: false });
        } catch (err) {
          // Ignore stale completions if the user has already toggled again.
          if (mutationSeqRef.current.get(goalId) !== seq) return;

          // Revert optimistic update
          (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
            prev.map((g) => (g.id === goalId ? goal : g))
          );
          setError("Failed to toggle goal completion");
          console.error("Error toggling goal:", err);
        }
      })();

      return nextCompleted;
    },
    [currentDate, loadGoals, goals, weeklyGoals]
  );

  // Toggle individual step for multi-step goals
  const toggleGoalStep = useCallback(
    async (goalId: string, stepIndex: number): Promise<boolean> => {
      const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
      if (!goal || !goal.isMultiStep) return false;
      if (stepIndex < 0 || stepIndex >= goal.totalSteps) return false;

      const isWeekly = goal.goalType === GoalType.WEEKLY;
      const now = new Date();
      const stepCompletions = [...(goal.stepCompletions || [])];
      while (stepCompletions.length < goal.totalSteps)
        stepCompletions.push(undefined);

      const wasCompleted = Boolean(stepCompletions[stepIndex]);
      stepCompletions[stepIndex] = wasCompleted ? undefined : now;

      const completedSteps = stepCompletions.filter(Boolean).length;
      const completed = completedSteps >= goal.totalSteps;

      const nextGoal: GoalWithStatus = {
        ...goal,
        stepCompletions,
        completedSteps,
        completed,
        completedAt: completed ? now : undefined,
      };

      (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
        prev.map((g) => (g.id === goalId ? nextGoal : g))
      );
      setError(null);

      const seqKey = `${goalId}:step:${stepIndex}`;
      const seq = (mutationSeqRef.current.get(seqKey) ?? 0) + 1;
      mutationSeqRef.current.set(seqKey, seq);

      void (async () => {
        try {
          const storageService = SupabaseGoalsService.getInstance();
          if (isWeekly) {
            await storageService.toggleWeeklyGoalStep(
              goalId,
              stepIndex,
              currentDate
            );
          } else {
            await storageService.toggleGoalStep(goalId, stepIndex, currentDate);
          }
          await loadGoals({ showLoader: false });
        } catch (err) {
          if (mutationSeqRef.current.get(seqKey) !== seq) return;
          (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
            prev.map((g) => (g.id === goalId ? goal : g))
          );
          setError("Failed to toggle goal step");
          console.error("Error toggling goal step:", err);
        }
      })();

      return !wasCompleted;
    },
    [currentDate, loadGoals, goals, weeklyGoals]
  );

  // Increment step completion for multi-step goals
  const incrementGoalStep = useCallback(
    async (goalId: string): Promise<boolean> => {
      // Optimistic multi-step increment (this is the common path used by the UI checkbox for multi-step goals)
      const goal = [...goals, ...weeklyGoals].find((g) => g.id === goalId);
      if (!goal || !goal.isMultiStep || goal.totalSteps <= 1) return false;

      const isWeekly = goal.goalType === GoalType.WEEKLY;
      const now = new Date();

      const stepCompletions = [...(goal.stepCompletions || [])];
      while (stepCompletions.length < goal.totalSteps)
        stepCompletions.push(undefined);

      const completedSteps = stepCompletions.filter(Boolean).length;
      let nextStepCompletions = stepCompletions;
      let nextDailyIncremented = goal.dailyIncremented;

      if (isWeekly) {
        if (goal.dailyIncremented) {
          // Undo last increment for today (matches server behavior)
          const lastCompletedIndex = [...nextStepCompletions]
            .map((s, i) => (s ? i : -1))
            .filter((i) => i >= 0)
            .pop();
          if (lastCompletedIndex !== undefined) {
            nextStepCompletions = [...nextStepCompletions];
            nextStepCompletions[lastCompletedIndex] = undefined;
          }
          nextDailyIncremented = false;
        } else {
          // Increment next incomplete, or over-complete by appending if already complete
          const nextIncompleteIndex = nextStepCompletions.findIndex((s) => !s);
          nextStepCompletions = [...nextStepCompletions];
          if (nextIncompleteIndex === -1) {
            nextStepCompletions.push(now);
          } else {
            nextStepCompletions[nextIncompleteIndex] = now;
          }
          nextDailyIncremented = true;
        }
      } else {
        if (completedSteps >= goal.totalSteps) {
          // Reset (matches server behavior)
          nextStepCompletions = Array(goal.totalSteps).fill(undefined);
        } else {
          const nextIncompleteIndex = nextStepCompletions.findIndex((s) => !s);
          if (nextIncompleteIndex !== -1) {
            nextStepCompletions = [...nextStepCompletions];
            nextStepCompletions[nextIncompleteIndex] = now;
          }
        }
      }

      const nextCompletedSteps = nextStepCompletions.filter(Boolean).length;
      const nextCompleted = nextCompletedSteps >= goal.totalSteps;

      const nextGoal: GoalWithStatus = {
        ...goal,
        stepCompletions: nextStepCompletions,
        completedSteps: isWeekly
          ? nextCompletedSteps
          : Math.min(nextCompletedSteps, goal.totalSteps),
        completed: nextCompleted,
        completedAt: nextCompleted ? now : undefined,
        ...(isWeekly ? { dailyIncremented: nextDailyIncremented } : {}),
      };

      (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
        prev.map((g) => (g.id === goalId ? nextGoal : g))
      );
      setError(null);

      const seqKey = `${goalId}:inc`;
      const seq = (mutationSeqRef.current.get(seqKey) ?? 0) + 1;
      mutationSeqRef.current.set(seqKey, seq);

      void (async () => {
        try {
          const storageService = SupabaseGoalsService.getInstance();
          if (isWeekly) {
            await storageService.incrementWeeklyGoalStep(goalId, currentDate);
          } else {
            await storageService.incrementGoalStep(goalId, currentDate);
          }
          await loadGoals({ showLoader: false });
        } catch (err) {
          if (mutationSeqRef.current.get(seqKey) !== seq) return;
          (isWeekly ? setWeeklyGoals : setGoals)((prev) =>
            prev.map((g) => (g.id === goalId ? goal : g))
          );
          setError("Failed to increment goal step");
          console.error("Error incrementing goal step:", err);
        }
      })();

      return true;
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
          // Refresh without showing the full-page loader
          await loadGoals({ showLoader: false });
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
          // Refresh without showing the full-page loader
          await loadGoals({ showLoader: false });
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
          // Refresh without showing the full-page loader
          await loadGoals({ showLoader: false });
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

  const refresh = useCallback(
    (opts?: { showLoader?: boolean }) =>
      loadGoals({ showLoader: false, ...(opts || {}) }),
    [loadGoals]
  );

  // Toggle group goal completion
  const toggleGroupGoal = useCallback(
    async (groupGoalId: string): Promise<void> => {
      try {
        const res = await fetch(`/api/group-goals/${groupGoalId}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate }),
        });

        if (!res.ok) {
          throw new Error("Failed to toggle group goal");
        }

        await loadGoals({ showLoader: false });
      } catch (err) {
        console.error("Error toggling group goal:", err);
        setError("Failed to toggle group goal");
      }
    },
    [currentDate, loadGoals]
  );

  return {
    goals,
    weeklyGoals,
    inactiveGoals,
    groupGoals,
    historicalGroupGoals,
    loading,
    error,
    addGoal,
    toggleGoal,
    toggleGoalStep,
    incrementGoalStep,
    updateGoal,
    deleteGoal,
    snoozeGoal,
    toggleGroupGoal,
    getStats,
    completionStats,
    clearError,
    // By default, refresh should not trigger the full-page loader (keeps UI snappy).
    refresh,
  };
};
