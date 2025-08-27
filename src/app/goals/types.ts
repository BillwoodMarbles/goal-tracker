// Goal tracking data models

export enum GoalType {
  DAILY = "daily",
  WEEKLY = "weekly",
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  isActive: boolean;
  goalType: GoalType; // Default to DAILY
  daysOfWeek: DayOfWeek[];
  isMultiStep: boolean;
  totalSteps: number; // Default 1 for single-step goals
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// Utility function to get day of week from JavaScript's Date.getDay()
// Date.getDay() returns: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export const getDayOfWeekFromIndex = (dayIndex: number): DayOfWeek => {
  return DAYS_OF_WEEK[dayIndex];
};

export interface DailyGoalStatus {
  goalId: string;
  completed: boolean;
  completedAt?: Date;
  completedSteps: number; // Number of steps completed (0 to totalSteps)
  stepCompletions: (Date | undefined)[]; // Array of completion times for each step (undefined = incomplete)
}

export interface WeeklyGoalDailyStatus {
  goalId: string;
  completed: boolean;
  completedAt?: Date;
  completedSteps: number; // Number of steps completed (0 to totalSteps)
  stepCompletions: (Date | undefined)[]; // Array of completion times for each step (undefined = incomplete)
  dailyIncrements: Record<string, boolean>; // Track which days have been incremented (YYYY-MM-DD -> boolean)
}

export interface DailyGoals {
  date: string; // YYYY-MM-DD format
  goals: DailyGoalStatus[];
  lastUpdated: Date;
}

export interface WeeklyGoals {
  weekStart: string; // YYYY-MM-DD format (Sunday)
  goals: WeeklyGoalDailyStatus[]; // Using WeeklyGoalDailyStatus for weekly goals
  lastUpdated: Date;
}

export interface GoalsData {
  goals: Goal[];
  dailyGoals: Record<string, DailyGoals>; // key is date string
  weeklyGoals?: Record<string, WeeklyGoals>; // key is week start date string
}

// Utility types
export type GoalWithStatus = Goal & {
  completed: boolean;
  completedAt?: Date;
  completedSteps: number;
  stepCompletions: (Date | undefined)[];
  dailyIncremented?: boolean; // For weekly goals: whether incremented today
};

// Local storage keys
export const STORAGE_KEYS = {
  GOALS_DATA: "daily-goals-tracker",
} as const;
