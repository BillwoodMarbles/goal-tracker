import dayjs from "dayjs";
import {
  Goal,
  DailyGoals,
  DailyGoalStatus,
  GoalsData,
  STORAGE_KEYS,
  DayOfWeek,
  DAYS_OF_WEEK,
  getDayOfWeekFromIndex,
  GoalType,
} from "../types";

// Utility functions for date handling
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const dayIndex = dayjs().day(); // 0 = Sunday, 1 = Monday, etc.
  return getDayOfWeekFromIndex(dayIndex);
};

// Local storage service for goals data
export class LocalStorageService {
  private static instance: LocalStorageService;

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  private getGoalsData(): GoalsData {
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

  private saveGoalsData(data: GoalsData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS_DATA, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving goals data to localStorage:", error);
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
    return data.goals[goalIndex];
  }

  deleteGoal(id: string): boolean {
    const data = this.getGoalsData();
    const goalIndex = data.goals.findIndex((goal) => goal.id === id);

    if (goalIndex === -1) return false;

    // Soft delete by setting isActive to false
    data.goals[goalIndex].isActive = false;
    this.saveGoalsData(data);
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

    // Update overall completion status
    goalStatus.completed = goalStatus.completedSteps === goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    dailyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

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
        (ws: DailyGoalStatus) => ws.goalId === goal.id
      );
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
        completedSteps: status?.completedSteps || 0,
        stepCompletions: status?.stepCompletions || [],
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
      };
      weeklyGoals.goals.push(goalStatus);
    }

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

    weeklyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    return !isStepCompleted; // Return new step status
  }

  // New method to increment weekly goal step completion
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
    let goalStatus = weeklyGoals.goals.find((gs) => gs.goalId === goalId);
    if (!goalStatus) {
      goalStatus = {
        goalId,
        completed: false,
        completedAt: undefined,
        completedSteps: 0,
        stepCompletions: [],
      };
      weeklyGoals.goals.push(goalStatus);
    }

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

      weeklyGoals.lastUpdated = new Date();
      this.saveGoalsData(data);

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

    // Update overall completion status
    goalStatus.completed = goalStatus.completedSteps === goal.totalSteps;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    weeklyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    return true; // Successfully incremented
  }

  // Get completion statistics (only for daily goals)
  getCompletionStats(date: string = getTodayString()) {
    const goalsWithStatus = this.getGoalsWithStatus(date);
    // Only count daily goals for completion stats
    const dailyGoalsWithStatus = goalsWithStatus.filter(
      (goal) => goal.goalType === GoalType.DAILY
    );
    const total = dailyGoalsWithStatus.length;
    const completed = dailyGoalsWithStatus.filter((g) => g.completed).length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // Clear all data (for testing/reset purposes)
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.GOALS_DATA);
  }
}
