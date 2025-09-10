import dayjs from "dayjs";
import {
  Goal,
  DailyGoals,
  WeeklyGoalDailyStatus,
  GoalsData,
  STORAGE_KEYS,
  DayOfWeek,
  DAYS_OF_WEEK,
  getDayOfWeekFromIndex,
  GoalType,
  GoalWithStatus,
} from "../types";

// Cache interface for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Utility functions for date handling
export const formatDate = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DD"); // YYYY-MM-DD format in local timezone
};

export const getTodayString = (): string => {
  return dayjs().format("YYYY-MM-DD"); // Today's date in local timezone
};

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const dayIndex = dayjs().day(); // 0 = Sunday, 1 = Monday, etc.
  return getDayOfWeekFromIndex(dayIndex);
};

// Local storage service for goals data
export class LocalStorageService {
  private static instance: LocalStorageService;
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    localStorageCalls: 0,
  };

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // Cache management methods
  private getCachedData<T>(
    key: string,
    ttl: number = this.DEFAULT_TTL
  ): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttl) {
      this.performanceMetrics.cacheHits++;
      return entry.data as T;
    }
    this.performanceMetrics.cacheMisses++;
    return null;
  }

  private setCachedData<T>(
    key: string,
    data: T,
    ttl: number = this.DEFAULT_TTL
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      // Invalidate cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Public method to invalidate cache when goals are updated
  public invalidateAllCache(): void {
    this.cache.clear();
    console.log("Cache invalidated - all data will be reloaded on next access");
  }

  // Performance monitoring
  logPerformance(): void {
    const totalRequests =
      this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    if (totalRequests > 0) {
      console.log("LocalStorage Performance Metrics:", {
        cacheHitRate: `${(
          (this.performanceMetrics.cacheHits / totalRequests) *
          100
        ).toFixed(1)}%`,
        localStorageCalls: this.performanceMetrics.localStorageCalls,
        cacheHits: this.performanceMetrics.cacheHits,
        cacheMisses: this.performanceMetrics.cacheMisses,
      });
    }
  }

  public getGoalsData(): GoalsData {
    this.performanceMetrics.localStorageCalls++;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS_DATA);
      if (!data) {
        return { goals: [], dailyGoals: {} };
      }

      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects and ensure backward compatibility
      parsed.goals = parsed.goals.map((goal: Goal) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        goalType: goal.goalType || GoalType.DAILY, // Default to DAILY for backward compatibility
      }));

      Object.keys(parsed.dailyGoals).forEach((dateKey) => {
        parsed.dailyGoals[dateKey].lastUpdated = new Date(
          parsed.dailyGoals[dateKey].lastUpdated
        );
        parsed.dailyGoals[dateKey].goals.forEach(
          (goalStatus: {
            goalId: string;
            completed: boolean;
            completedAt?: string | Date;
          }) => {
            if (goalStatus.completedAt) {
              goalStatus.completedAt = new Date(goalStatus.completedAt);
            }
          }
        );
      });

      // Parse weekly goals data if it exists
      if (parsed.weeklyGoals) {
        Object.keys(parsed.weeklyGoals).forEach((weekKey) => {
          parsed.weeklyGoals[weekKey].lastUpdated = new Date(
            parsed.weeklyGoals[weekKey].lastUpdated
          );
          parsed.weeklyGoals[weekKey].goals.forEach(
            (goalStatus: {
              goalId: string;
              completed: boolean;
              completedAt?: string | Date;
              completedSteps: number;
              stepCompletions: (string | Date | undefined)[];
            }) => {
              if (goalStatus.completedAt) {
                goalStatus.completedAt = new Date(goalStatus.completedAt);
              }
              // Convert stepCompletions dates
              goalStatus.stepCompletions = goalStatus.stepCompletions.map(
                (step) => (step ? new Date(step) : undefined)
              );
            }
          );
        });
      }

      return parsed;
    } catch (error) {
      console.error("Error loading goals data from localStorage:", error);
      return { goals: [], dailyGoals: {} };
    }
  }

  public saveGoalsData(data: GoalsData): void {
    this.performanceMetrics.localStorageCalls++;
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS_DATA, JSON.stringify(data));

      // Trigger DynamoDB sync if hybrid storage is available
      this.syncToDynamoDB(data);
    } catch (error) {
      console.error("Error saving goals data to localStorage:", error);
    }
  }

  // Sync data to DynamoDB
  private async syncToDynamoDB(data: GoalsData): Promise<void> {
    try {
      // Try to get hybrid storage service
      const hybridStorageService = (
        globalThis as {
          hybridStorageService?: {
            saveData: (data: GoalsData) => Promise<boolean>;
          };
        }
      ).hybridStorageService;
      if (hybridStorageService) {
        await hybridStorageService.saveData(data);
      }
    } catch (error) {
      console.warn("Failed to sync to DynamoDB:", error);
    }
  }

  // Goal management
  addGoal(
    title: string,
    description?: string,
    daysOfWeek: DayOfWeek[] = [...DAYS_OF_WEEK],
    isMultiStep: boolean = false,
    totalSteps: number = 1,
    goalType: GoalType = GoalType.DAILY
  ): Goal {
    const data = this.getGoalsData();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date(),
      isActive: true,
      goalType,
      daysOfWeek,
      isMultiStep,
      totalSteps: Math.max(1, totalSteps), // Ensure at least 1 step
    };

    data.goals.push(newGoal);
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return newGoal;
  }

  getGoals(): Goal[] {
    const data = this.getGoalsData();
    // Ensure backward compatibility by defaulting missing goalType to DAILY
    return data.goals
      .filter((goal) => goal.isActive)
      .map((goal) => ({
        ...goal,
        goalType: goal.goalType || GoalType.DAILY,
      }));
  }

  getGoalsForDay(dayOfWeek: DayOfWeek): Goal[] {
    const data = this.getGoalsData();
    return data.goals.filter(
      (goal) =>
        goal.isActive &&
        goal.goalType === GoalType.DAILY &&
        goal.daysOfWeek?.includes(dayOfWeek)
    );
  }

  getGoalsForToday(): Goal[] {
    return this.getGoalsForDay(getCurrentDayOfWeek());
  }

  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const data = this.getGoalsData();
    const goalIndex = data.goals.findIndex((goal) => goal.id === id);

    if (goalIndex === -1) return null;

    data.goals[goalIndex] = { ...data.goals[goalIndex], ...updates };
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return data.goals[goalIndex];
  }

  deleteGoal(id: string): boolean {
    const data = this.getGoalsData();
    const goalIndex = data.goals.findIndex((goal) => goal.id === id);

    if (goalIndex === -1) return false;

    // Soft delete by setting isActive to false
    data.goals[goalIndex].isActive = false;
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return true;
  }

  // Daily goal status management
  getDailyGoals(date: string = getTodayString()): DailyGoals {
    const data = this.getGoalsData();

    if (!data.dailyGoals[date]) {
      // Get day of week for the given date
      const dayIndex = dayjs(date).day();
      const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

      // Initialize daily goals for the date with goals active on that day
      const goalsForDay = this.getGoalsForDay(dayOfWeek);
      data.dailyGoals[date] = {
        date,
        goals: goalsForDay.map((goal) => ({
          goalId: goal.id,
          completed: false,
          completedSteps: 0,
          stepCompletions: [],
        })),
        lastUpdated: new Date(),
      };
      this.saveGoalsData(data);
    }

    return data.dailyGoals[date];
  }

  toggleGoalCompletion(
    goalId: string,
    date: string = getTodayString()
  ): boolean {
    const data = this.getGoalsData();
    const goal = data.goals.find((g) => g.id === goalId);

    if (!goal) return false;

    // Ensure daily goals exist for the date
    if (!data.dailyGoals[date]) {
      const activeGoals = this.getGoals();
      data.dailyGoals[date] = {
        date,
        goals: activeGoals.map((goal) => ({
          goalId: goal.id,
          completed: false,
          completedSteps: 0,
          stepCompletions: [],
        })),
        lastUpdated: new Date(),
      };
    }

    const dailyGoals = data.dailyGoals[date];
    let goalStatusIndex = dailyGoals.goals.findIndex(
      (gs) => gs.goalId === goalId
    );

    // If goal not found in daily goals, add it
    if (goalStatusIndex === -1) {
      dailyGoals.goals.push({
        goalId,
        completed: false,
        completedSteps: 0,
        stepCompletions: [],
      });
      goalStatusIndex = dailyGoals.goals.length - 1;
    }

    const goalStatus = dailyGoals.goals[goalStatusIndex];

    // For single-step goals, toggle completion as before
    if (!goal.isMultiStep || goal.totalSteps === 1) {
      goalStatus.completed = !goalStatus.completed;
      goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;
      goalStatus.completedSteps = goalStatus.completed ? 1 : 0;
      goalStatus.stepCompletions = goalStatus.completed ? [new Date()] : [];
    } else {
      // For multi-step goals, toggle entire completion
      goalStatus.completed = !goalStatus.completed;
      if (goalStatus.completed) {
        // Mark all steps as completed
        goalStatus.completedSteps = goal.totalSteps;
        goalStatus.stepCompletions = Array(goal.totalSteps).fill(new Date());
        goalStatus.completedAt = new Date();
      } else {
        // Reset all steps
        goalStatus.completedSteps = 0;
        goalStatus.stepCompletions = [];
        goalStatus.completedAt = undefined;
      }
    }

    dailyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return goalStatus.completed;
  }

  // New method to toggle individual steps for multi-step goals
  toggleGoalStep(
    goalId: string,
    stepIndex: number,
    date: string = getTodayString()
  ): boolean {
    const data = this.getGoalsData();
    const goal = data.goals.find((g) => g.id === goalId);

    if (
      !goal ||
      !goal.isMultiStep ||
      stepIndex < 0 ||
      stepIndex >= goal.totalSteps
    ) {
      return false;
    }

    // Ensure daily goals exist
    if (!data.dailyGoals[date]) {
      this.getDailyGoals(date);
    }

    const dailyGoals = data.dailyGoals[date];
    let goalStatusIndex = dailyGoals.goals.findIndex(
      (gs) => gs.goalId === goalId
    );

    if (goalStatusIndex === -1) {
      dailyGoals.goals.push({
        goalId,
        completed: false,
        completedSteps: 0,
        stepCompletions: [],
      });
      goalStatusIndex = dailyGoals.goals.length - 1;
    }

    const goalStatus = dailyGoals.goals[goalStatusIndex];

    // Ensure stepCompletions array is properly sized
    while (goalStatus.stepCompletions.length < goal.totalSteps) {
      goalStatus.stepCompletions.push(undefined);
    }

    // Toggle the specific step
    const isStepCompleted = !!goalStatus.stepCompletions[stepIndex];

    if (isStepCompleted) {
      // Uncomplete the step
      goalStatus.stepCompletions[stepIndex] = undefined;
      goalStatus.completedSteps = Math.max(0, goalStatus.completedSteps - 1);
    } else {
      // Complete the step
      goalStatus.stepCompletions[stepIndex] = new Date();
      goalStatus.completedSteps = goalStatus.stepCompletions.filter(
        (s) => s
      ).length;
    }

    // Update overall completion status
    goalStatus.completed = goalStatus.completedSteps === goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    dailyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return !isStepCompleted; // Return new step status
  }

  // New method to increment step completion for multi-step goals
  incrementGoalStep(goalId: string, date: string = getTodayString()): boolean {
    const data = this.getGoalsData();
    const goal = data.goals.find((g) => g.id === goalId);

    if (!goal || !goal.isMultiStep || goal.totalSteps <= 1) {
      return false;
    }

    // Ensure daily goals exist
    if (!data.dailyGoals[date]) {
      this.getDailyGoals(date);
    }

    const dailyGoals = data.dailyGoals[date];
    let goalStatusIndex = dailyGoals.goals.findIndex(
      (gs) => gs.goalId === goalId
    );

    if (goalStatusIndex === -1) {
      dailyGoals.goals.push({
        goalId,
        completed: false,
        completedSteps: 0,
        stepCompletions: [],
      });
      goalStatusIndex = dailyGoals.goals.length - 1;
    }

    const goalStatus = dailyGoals.goals[goalStatusIndex];

    // Ensure stepCompletions array is properly sized
    while (goalStatus.stepCompletions.length < goal.totalSteps) {
      goalStatus.stepCompletions.push(undefined);
    }

    // Check if all steps are already completed - if so, reset to 0
    if (goalStatus.completedSteps >= goal.totalSteps) {
      // Reset all steps to incomplete
      goalStatus.stepCompletions = new Array(goal.totalSteps).fill(undefined);
      goalStatus.completedSteps = 0;
      goalStatus.completed = false;
      goalStatus.completedAt = undefined;

      dailyGoals.lastUpdated = new Date();
      this.saveGoalsData(data);

      // Invalidate relevant cache
      this.invalidateCache("week_data_");
      this.invalidateCache("date_data_");

      return true; // Successfully reset
    }

    // Find the next incomplete step
    const nextIncompleteStepIndex = goalStatus.stepCompletions.findIndex(
      (step) => !step
    );

    if (nextIncompleteStepIndex === -1) {
      return false; // All steps are completed
    }

    // Complete the next step
    goalStatus.stepCompletions[nextIncompleteStepIndex] = new Date();
    goalStatus.completedSteps = goalStatus.stepCompletions.filter(
      (s) => s
    ).length;

    // Update overall completion status - goal is completed when it reaches totalSteps
    goalStatus.completed = goalStatus.completedSteps >= goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    dailyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return true; // Successfully incremented
  }

  // Get goals with their completion status for a specific date
  getGoalsWithStatus(date: string = getTodayString()) {
    // Get day of week for the given date
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    // Get goals that should be active on this day of the week
    const goalsForDay = this.getGoalsForDay(dayOfWeek);
    const dailyGoals = this.getDailyGoals(date);

    return goalsForDay.map((goal) => {
      const status = dailyGoals.goals.find((gs) => gs.goalId === goal.id);
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
      };
    });
  }

  // Get goals that are NOT active for a specific date (for read-only display)
  getInactiveGoalsForDate(date: string = getTodayString()) {
    // Get day of week for the given date
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    // Get all active goals
    const allGoals = this.getGoals();

    // Filter out goals that are active on this day (both daily and weekly)
    const inactiveGoals = allGoals.filter(
      (goal) => !goal.daysOfWeek?.includes(dayOfWeek)
    );

    return inactiveGoals.map((goal) => ({
      ...goal,
      completed: false, // Always show as incomplete since they're not active today
      completedAt: undefined,
      completedSteps: 0,
      stepCompletions: [],
    }));
  }

  // Get weekly goals for a specific date
  getWeeklyGoalsForDate(date: string = getTodayString()) {
    // Get all active weekly goals (weekly goals are always active)
    const weeklyGoals = this.getGoals().filter(
      (goal) => goal.isActive && goal.goalType === GoalType.WEEKLY
    );

    // Get weekly status for the current week
    const weeklyStatus = this.getWeeklyGoalsStatus(date);

    return weeklyGoals.map((goal) => {
      const status = weeklyStatus.find(
        (ws: WeeklyGoalDailyStatus) => ws.goalId === goal.id
      );

      // Check if this goal was incremented today
      const dailyIncremented = status?.dailyIncrements?.[date] || false;

      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
        dailyIncremented,
      };
    });
  }

  // Get weekly goals status for a specific week
  private getWeeklyGoalsStatus(date: string = getTodayString()) {
    const weekStart = this.getWeekStart(date);
    const data = this.getGoalsData();

    if (!data.weeklyGoals) {
      data.weeklyGoals = {};
      this.saveGoalsData(data);
    }

    if (!data.weeklyGoals[weekStart]) {
      data.weeklyGoals[weekStart] = {
        weekStart,
        goals: [],
        lastUpdated: new Date(),
      };
      this.saveGoalsData(data);
    }

    return data.weeklyGoals[weekStart].goals;
  }

  // Get the start of the week (Sunday) for a given date
  private getWeekStart(date: string): string {
    const dateObj = dayjs(date);
    const dayOfWeek = dateObj.day(); // 0 = Sunday, 1 = Monday, etc.
    const weekStart = dateObj.subtract(dayOfWeek, "day");
    return weekStart.format("YYYY-MM-DD");
  }

  // Toggle weekly goal completion
  toggleWeeklyGoal(goalId: string, date: string = getTodayString()): boolean {
    const data = this.getGoalsData();
    const weekStart = this.getWeekStart(date);

    if (!data.weeklyGoals) {
      data.weeklyGoals = {};
    }

    if (!data.weeklyGoals[weekStart]) {
      data.weeklyGoals[weekStart] = {
        weekStart,
        goals: [],
        lastUpdated: new Date(),
      };
    }

    const weeklyGoals = data.weeklyGoals[weekStart];
    let goalStatus = weeklyGoals.goals.find((gs) => gs.goalId === goalId);

    if (!goalStatus) {
      goalStatus = {
        goalId,
        completed: false,
        completedAt: undefined,
        completedSteps: 0,
        stepCompletions: [],
        dailyIncrements: {},
      };
      weeklyGoals.goals.push(goalStatus);
    }

    // Get the goal details to handle multi-step logic
    const goal = data.goals.find((g) => g.id === goalId);
    if (!goal) return false;

    // For single-step goals, toggle completion as before
    if (!goal.isMultiStep || goal.totalSteps === 1) {
      goalStatus.completed = !goalStatus.completed;
      goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;
      goalStatus.completedSteps = goalStatus.completed ? 1 : 0;
      goalStatus.stepCompletions = goalStatus.completed ? [new Date()] : [];
    } else {
      // For multi-step goals, toggle entire completion
      goalStatus.completed = !goalStatus.completed;
      if (goalStatus.completed) {
        // Mark all steps as completed
        goalStatus.completedSteps = goal.totalSteps;
        goalStatus.stepCompletions = Array(goal.totalSteps).fill(new Date());
        goalStatus.completedAt = new Date();
      } else {
        // Reset all steps
        goalStatus.completedSteps = 0;
        goalStatus.stepCompletions = [];
        goalStatus.completedAt = undefined;
      }
    }

    weeklyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return goalStatus.completed;
  }

  // Toggle weekly goal step completion
  toggleWeeklyGoalStep(
    goalId: string,
    stepIndex: number,
    date: string = getTodayString()
  ): boolean {
    const data = this.getGoalsData();
    const weekStart = this.getWeekStart(date);
    const goal = this.getGoals().find((g) => g.id === goalId);

    if (!goal || goal.goalType !== GoalType.WEEKLY) {
      return false;
    }

    if (!data.weeklyGoals) {
      data.weeklyGoals = {};
    }

    if (!data.weeklyGoals[weekStart]) {
      data.weeklyGoals[weekStart] = {
        weekStart,
        goals: [],
        lastUpdated: new Date(),
      };
    }

    const weeklyGoals = data.weeklyGoals[weekStart];
    let goalStatus = weeklyGoals.goals.find((gs) => gs.goalId === goalId);
    if (!goalStatus) {
      goalStatus = {
        goalId,
        completed: false,
        completedAt: undefined,
        completedSteps: 0,
        stepCompletions: [],
        dailyIncrements: {},
      };
      weeklyGoals.goals.push(goalStatus);
    }

    // Ensure stepCompletions array can accommodate more steps than totalSteps
    // Allow for up to 2x the total steps to handle over-completion
    const maxSteps = Math.max(goal.totalSteps * 2, stepIndex + 1);
    while (goalStatus.stepCompletions.length < maxSteps) {
      goalStatus.stepCompletions.push(undefined);
    }

    // Toggle the specific step
    const isStepCompleted = !!goalStatus.stepCompletions[stepIndex];

    if (isStepCompleted) {
      // Uncomplete the step
      goalStatus.stepCompletions[stepIndex] = undefined;
      goalStatus.completedSteps = goalStatus.stepCompletions.filter(
        (s) => s
      ).length;
    } else {
      // Complete the step
      goalStatus.stepCompletions[stepIndex] = new Date();
      goalStatus.completedSteps = goalStatus.stepCompletions.filter(
        (s) => s
      ).length;
    }

    // Update overall completion status - goal is completed when it reaches totalSteps
    // but can continue to be incremented beyond that
    goalStatus.completed = goalStatus.completedSteps >= goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    weeklyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return !isStepCompleted; // Return new step status
  }

  // New method to increment weekly goal step completion (one per day)
  incrementWeeklyGoalStep(
    goalId: string,
    date: string = getTodayString()
  ): boolean {
    const data = this.getGoalsData();
    const weekStart = this.getWeekStart(date);
    const goal = this.getGoals().find((g) => g.id === goalId);

    if (
      !goal ||
      goal.goalType !== GoalType.WEEKLY ||
      !goal.isMultiStep ||
      goal.totalSteps <= 1
    ) {
      return false;
    }

    if (!data.weeklyGoals) {
      data.weeklyGoals = {};
    }

    if (!data.weeklyGoals[weekStart]) {
      data.weeklyGoals[weekStart] = {
        weekStart,
        goals: [],
        lastUpdated: new Date(),
      };
    }

    const weeklyGoals = data.weeklyGoals[weekStart];
    let goalStatus: WeeklyGoalDailyStatus | undefined = weeklyGoals.goals.find(
      (gs) => gs.goalId === goalId
    );
    if (!goalStatus) {
      const newGoalStatus: WeeklyGoalDailyStatus = {
        goalId,
        completed: false,
        completedAt: undefined,
        completedSteps: 0,
        stepCompletions: [],
        dailyIncrements: {},
      };
      goalStatus = newGoalStatus;
      weeklyGoals.goals.push(newGoalStatus);
    }

    // Ensure goalStatus is defined and has required properties
    if (!goalStatus) {
      return false;
    }

    // Type assertion to ensure goalStatus is properly typed
    const typedGoalStatus = goalStatus as WeeklyGoalDailyStatus;

    // Ensure dailyIncrements exists
    if (!typedGoalStatus.dailyIncrements) {
      typedGoalStatus.dailyIncrements = {};
    }

    // Ensure stepCompletions array is properly sized
    while (goalStatus.stepCompletions.length < goal.totalSteps) {
      goalStatus.stepCompletions.push(undefined);
    }

    // Check if already incremented today
    const alreadyIncrementedToday = goalStatus.dailyIncrements[date] || false;

    if (alreadyIncrementedToday) {
      // If already incremented today, undo the last increment
      const lastCompletedStepIndex = goalStatus.stepCompletions.findLastIndex(
        (step) => step
      );

      if (lastCompletedStepIndex !== -1) {
        goalStatus.stepCompletions[lastCompletedStepIndex] = undefined;
        goalStatus.completedSteps = goalStatus.stepCompletions.filter(
          (s) => s
        ).length;
        goalStatus.dailyIncrements[date] = false;

        // Update overall completion status - goal is completed when it reaches totalSteps
        goalStatus.completed = goalStatus.completedSteps >= goal.totalSteps;
        goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

        weeklyGoals.lastUpdated = new Date();
        this.saveGoalsData(data);

        // Invalidate relevant cache
        this.invalidateCache("week_data_");
        this.invalidateCache("date_data_");

        return true; // Successfully undone
      }
      return false;
    }

    // Allow over-completion: if all steps are completed, add a new step
    if (goalStatus.completedSteps >= goal.totalSteps) {
      // Add a new step beyond the totalSteps limit
      goalStatus.stepCompletions.push(new Date());
      goalStatus.completedSteps = goalStatus.stepCompletions.filter(
        (s) => s
      ).length;
      goalStatus.dailyIncrements[date] = true;

      // Update overall completion status - goal is completed when it reaches totalSteps
      goalStatus.completed = goalStatus.completedSteps >= goal.totalSteps;
      goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

      weeklyGoals.lastUpdated = new Date();
      this.saveGoalsData(data);

      // Invalidate relevant cache
      this.invalidateCache("week_data_");
      this.invalidateCache("date_data_");

      return true; // Successfully added over-completion step
    }

    // Find the next incomplete step
    const nextIncompleteStepIndex = goalStatus.stepCompletions.findIndex(
      (step) => !step
    );

    if (nextIncompleteStepIndex === -1) {
      return false; // All steps are completed
    }

    // Complete the next step and mark today as incremented
    goalStatus.stepCompletions[nextIncompleteStepIndex] = new Date();
    goalStatus.completedSteps = goalStatus.stepCompletions.filter(
      (s) => s
    ).length;
    goalStatus.dailyIncrements[date] = true;

    // Update overall completion status - goal is completed when it reaches totalSteps
    goalStatus.completed = goalStatus.completedSteps >= goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    weeklyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    // Invalidate relevant cache
    this.invalidateCache("week_data_");
    this.invalidateCache("date_data_");

    return true; // Successfully incremented
  }

  // Get completion statistics (only for daily goals)
  getCompletionStats(date: string = getTodayString()) {
    const goalsWithStatus = this.getGoalsWithStatus(date);
    return this.getCompletionStatsFromData(goalsWithStatus);
  }

  // Get completion statistics from pre-loaded data
  getCompletionStatsFromData(goalsWithStatus: GoalWithStatus[]) {
    // Only count daily goals for completion stats
    const dailyGoalsWithStatus = goalsWithStatus.filter(
      (goal) => goal.goalType === GoalType.DAILY
    );

    const totalGoals = dailyGoalsWithStatus.length;
    let totalPercentage = 0;

    dailyGoalsWithStatus.forEach((goal) => {
      if (goal.isMultiStep && goal.totalSteps > 1) {
        // For multi-step goals, calculate completion percentage within the goal
        const goalCompletionPercentage =
          (goal.completedSteps / goal.totalSteps) * 100;
        // Each goal contributes equally to the total, so divide by total number of goals
        totalPercentage += goalCompletionPercentage / totalGoals;
      } else {
        // For single-step goals, contribute 100% if completed, 0% if not
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

  // Clear all data (for testing/reset purposes)
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.GOALS_DATA);
  }

  // Batch loading methods
  getWeekData(weekStart: string): {
    goals: Goal[];
    dailyGoals: { [date: string]: DailyGoals };
    weeklyGoals: { [date: string]: GoalWithStatus[] };
    weekDates: string[];
  } {
    const cacheKey = `week_data_${weekStart}`;
    const cached = this.getCachedData<{
      goals: Goal[];
      dailyGoals: { [date: string]: DailyGoals };
      weeklyGoals: { [date: string]: GoalWithStatus[] };
      weekDates: string[];
    }>(cacheKey);
    if (cached) return cached;

    // Load data once instead of multiple times
    const data = this.getGoalsData();
    const weekDates = this.generateWeekDates(weekStart);
    const goals = data.goals.filter((goal) => goal.isActive);

    // Batch load all daily goals for the week using pre-loaded data
    const dailyGoals: { [date: string]: DailyGoals } = {};
    weekDates.forEach((date) => {
      dailyGoals[date] = this.getDailyGoalsFromData(data, date);
    });

    // Batch load all weekly goals for the week using pre-loaded data
    const weeklyGoals: { [date: string]: GoalWithStatus[] } = {};
    weekDates.forEach((date) => {
      weeklyGoals[date] = this.getWeeklyGoalsForDateFromData(data, date);
    });

    const weekData = {
      goals,
      dailyGoals,
      weeklyGoals,
      weekDates,
    };

    this.setCachedData(cacheKey, weekData);
    return weekData;
  }

  getDateData(date: string): {
    goals: GoalWithStatus[];
    weeklyGoals: GoalWithStatus[];
    inactiveGoals: GoalWithStatus[];
  } {
    const cacheKey = `date_data_${date}`;
    const cached = this.getCachedData<{
      goals: GoalWithStatus[];
      weeklyGoals: GoalWithStatus[];
      inactiveGoals: GoalWithStatus[];
    }>(cacheKey);
    if (cached) return cached;

    // Load data once instead of multiple times
    const data = this.getGoalsData();
    const goals = this.getGoalsWithStatusFromData(data, date);
    const weeklyGoals = this.getWeeklyGoalsForDateFromData(data, date);
    const inactiveGoals = this.getInactiveGoalsForDateFromData(data, date);

    const dateData = { goals, weeklyGoals, inactiveGoals };
    this.setCachedData(cacheKey, dateData);
    return dateData;
  }

  private generateWeekDates(weekStart: string): string[] {
    const dates: string[] = [];
    const startDate = dayjs(weekStart).day(0); // 0 = Sunday

    for (let i = 0; i < 7; i++) {
      dates.push(startDate.add(i, "day").format("YYYY-MM-DD"));
    }

    return dates;
  }

  // Helper methods that accept pre-loaded data to avoid multiple getGoalsData calls
  private getDailyGoalsFromData(data: GoalsData, date: string): DailyGoals {
    if (!data.dailyGoals[date]) {
      // Get day of week for the given date
      const dayIndex = dayjs(date).day();
      const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

      // Initialize daily goals for the date with goals active on that day
      const goalsForDay = data.goals.filter(
        (goal) =>
          goal.isActive &&
          goal.goalType === GoalType.DAILY &&
          goal.daysOfWeek?.includes(dayOfWeek)
      );
      data.dailyGoals[date] = {
        date,
        goals: goalsForDay.map((goal) => ({
          goalId: goal.id,
          completed: false,
          completedSteps: 0,
          stepCompletions: [],
        })),
        lastUpdated: new Date(),
      };
      // Note: We don't save here since this is a read-only operation for batch loading
    }

    return data.dailyGoals[date];
  }

  private getWeeklyGoalsForDateFromData(
    data: GoalsData,
    date: string
  ): GoalWithStatus[] {
    // Get all active weekly goals (weekly goals are always active)
    const weeklyGoals = data.goals.filter(
      (goal) => goal.isActive && goal.goalType === GoalType.WEEKLY
    );

    // Get weekly status for the current week
    const weeklyStatus = this.getWeeklyGoalsStatusFromData(data, date);

    return weeklyGoals.map((goal) => {
      const status = weeklyStatus.find(
        (ws: WeeklyGoalDailyStatus) => ws.goalId === goal.id
      );

      // Check if this goal was incremented today
      const dailyIncremented = status?.dailyIncrements?.[date] || false;

      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
        dailyIncremented,
      };
    });
  }

  private getWeeklyGoalsStatusFromData(
    data: GoalsData,
    date: string
  ): WeeklyGoalDailyStatus[] {
    const weekStart = this.getWeekStart(date);

    if (!data.weeklyGoals) {
      data.weeklyGoals = {};
    }

    if (!data.weeklyGoals[weekStart]) {
      data.weeklyGoals[weekStart] = {
        weekStart,
        goals: [],
        lastUpdated: new Date(),
      };
      // Note: We don't save here since this is a read-only operation for batch loading
    }

    return data.weeklyGoals[weekStart].goals;
  }

  private getGoalsWithStatusFromData(
    data: GoalsData,
    date: string
  ): GoalWithStatus[] {
    // Get day of week for the given date
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    // Get goals that should be active on this day of the week
    const goalsForDay = data.goals.filter(
      (goal) =>
        goal.isActive &&
        goal.goalType === GoalType.DAILY &&
        goal.daysOfWeek?.includes(dayOfWeek)
    );
    const dailyGoals = this.getDailyGoalsFromData(data, date);

    return goalsForDay.map((goal) => {
      const status = dailyGoals.goals.find((gs) => gs.goalId === goal.id);
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
      };
    });
  }

  private getInactiveGoalsForDateFromData(
    data: GoalsData,
    date: string
  ): GoalWithStatus[] {
    // Get day of week for the given date
    const dayIndex = dayjs(date).day();
    const dayOfWeek = getDayOfWeekFromIndex(dayIndex);

    // Get all active goals
    const allGoals = data.goals.filter((goal) => goal.isActive);

    // Filter out goals that are active on this day (both daily and weekly)
    const inactiveGoals = allGoals.filter(
      (goal) => !goal.daysOfWeek?.includes(dayOfWeek)
    );

    return inactiveGoals.map((goal) => ({
      ...goal,
      completed: false, // Always show as incomplete since they're not active today
      completedAt: undefined,
      completedSteps: 0,
      stepCompletions: [],
    }));
  }
}
