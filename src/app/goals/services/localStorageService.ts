import {
  Goal,
  DailyGoals,
  GoalsData,
  STORAGE_KEYS,
  DayOfWeek,
  DAYS_OF_WEEK,
} from "../types";

// Utility functions for date handling
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayMapping: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayMapping[dayIndex];
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
  addGoal(
    title: string,
    description?: string,
    daysOfWeek: DayOfWeek[] = [...DAYS_OF_WEEK]
  ): Goal {
    const data = this.getGoalsData();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: new Date(),
      isActive: true,
      daysOfWeek,
    };

    data.goals.push(newGoal);
    this.saveGoalsData(data);
    return newGoal;
  }

  getGoals(): Goal[] {
    const data = this.getGoalsData();
    return data.goals.filter((goal) => goal.isActive);
  }

  getGoalsForDay(dayOfWeek: DayOfWeek): Goal[] {
    const data = this.getGoalsData();
    return data.goals.filter(
      (goal) => goal.isActive && goal.daysOfWeek.includes(dayOfWeek)
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
      const dateObj = new Date(date);
      const dayIndex = dateObj.getDay();
      const dayMapping: DayOfWeek[] = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayOfWeek = dayMapping[dayIndex];

      // Initialize daily goals for the date with goals active on that day
      const goalsForDay = this.getGoalsForDay(dayOfWeek);
      data.dailyGoals[date] = {
        date,
        goals: goalsForDay.map((goal) => ({
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
    // Get day of week for the given date
    const dateObj = new Date(date);
    const dayIndex = dateObj.getDay();
    const dayMapping: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayOfWeek = dayMapping[dayIndex];

    // Get goals that should be active on this day of the week
    const goalsForDay = this.getGoalsForDay(dayOfWeek);
    const dailyGoals = this.getDailyGoals(date);

    return goalsForDay.map((goal) => {
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
