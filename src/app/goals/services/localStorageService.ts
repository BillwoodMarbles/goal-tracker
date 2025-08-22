import { Goal, DailyGoals, GoalsData, STORAGE_KEYS } from "../types";

// Utility functions for date handling
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

export const getTodayString = (): string => {
  return formatDate(new Date());
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
      // Convert date strings back to Date objects
      parsed.goals = parsed.goals.map((goal: Goal) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
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
  addGoal(title: string, description?: string): Goal {
    const data = this.getGoalsData();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date(),
      isActive: true,
    };

    data.goals.push(newGoal);
    this.saveGoalsData(data);
    return newGoal;
  }

  getGoals(): Goal[] {
    const data = this.getGoalsData();
    return data.goals.filter((goal) => goal.isActive);
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
      // Initialize daily goals for the date with all active goals
      const activeGoals = this.getGoals();
      data.dailyGoals[date] = {
        date,
        goals: activeGoals.map((goal) => ({
          goalId: goal.id,
          completed: false,
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

    // Ensure daily goals exist for the date
    if (!data.dailyGoals[date]) {
      const activeGoals = this.getGoals();
      data.dailyGoals[date] = {
        date,
        goals: activeGoals.map((goal) => ({
          goalId: goal.id,
          completed: false,
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
      });
      goalStatusIndex = dailyGoals.goals.length - 1;
    }

    // Toggle the completion status
    const goalStatus = dailyGoals.goals[goalStatusIndex];
    goalStatus.completed = !goalStatus.completed;
    goalStatus.completedAt = goalStatus.completed ? new Date() : undefined;

    dailyGoals.lastUpdated = new Date();
    this.saveGoalsData(data);

    return goalStatus.completed;
  }

  // Get goals with their completion status for a specific date
  getGoalsWithStatus(date: string = getTodayString()) {
    const goals = this.getGoals();
    const dailyGoals = this.getDailyGoals(date);

    return goals.map((goal) => {
      const status = dailyGoals.goals.find((gs) => gs.goalId === goal.id);
      return {
        ...goal,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
      };
    });
  }

  // Get completion statistics
  getCompletionStats(date: string = getTodayString()) {
    const goalsWithStatus = this.getGoalsWithStatus(date);
    const total = goalsWithStatus.length;
    const completed = goalsWithStatus.filter((g) => g.completed).length;

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
