// Goal tracking data models

export interface Goal {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface DailyGoalStatus {
  goalId: string;
  completed: boolean;
  completedAt?: Date;
}

export interface DailyGoals {
  date: string; // YYYY-MM-DD format
  goals: DailyGoalStatus[];
  lastUpdated: Date;
}

export interface GoalsData {
  goals: Goal[];
  dailyGoals: Record<string, DailyGoals>; // key is date string
}

// Utility types
export type GoalWithStatus = Goal & {
  completed: boolean;
  completedAt?: Date;
};

// Local storage keys
export const STORAGE_KEYS = {
  GOALS_DATA: "daily-goals-tracker",
} as const;
