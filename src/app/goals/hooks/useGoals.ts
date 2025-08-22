"use client";

import { useState, useEffect, useCallback } from "react";
import { Goal, GoalWithStatus, DayOfWeek } from "../types";
import {
  LocalStorageService,
  getTodayString,
} from "../services/localStorageService";

export const useGoals = (selectedDate?: string) => {
  const [goals, setGoals] = useState<GoalWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDate = selectedDate || getTodayString();
  const storageService = LocalStorageService.getInstance();

  // Load goals with their completion status for the selected date
  const loadGoals = useCallback(() => {
    try {
      setLoading(true);
      const goalsWithStatus = storageService.getGoalsWithStatus(currentDate);
      setGoals(goalsWithStatus);
      setError(null);
    } catch (err) {
      setError("Failed to load goals");
      console.error("Error loading goals:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, storageService]);

  // Load goals when component mounts or date changes
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Add a new goal
  const addGoal = useCallback(
    async (
      title: string,
      description?: string,
      daysOfWeek?: DayOfWeek[]
    ): Promise<Goal | null> => {
      try {
        if (!title.trim()) {
          setError("Goal title is required");
          return null;
        }

        const newGoal = storageService.addGoal(
          title.trim(),
          description?.trim(),
          daysOfWeek
        );
        loadGoals(); // Refresh the goals list
        setError(null);
        return newGoal;
      } catch (err) {
        setError("Failed to add goal");
        console.error("Error adding goal:", err);
        return null;
      }
    },
    [storageService, loadGoals]
  );

  // Toggle goal completion for the current date
  const toggleGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const newCompletionStatus = storageService.toggleGoalCompletion(
          goalId,
          currentDate
        );
        loadGoals(); // Refresh the goals list
        setError(null);
        return newCompletionStatus;
      } catch (err) {
        setError("Failed to toggle goal completion");
        console.error("Error toggling goal:", err);
        return false;
      }
    },
    [storageService, currentDate, loadGoals]
  );

  // Update an existing goal
  const updateGoal = useCallback(
    async (goalId: string, updates: Partial<Goal>): Promise<Goal | null> => {
      try {
        const updatedGoal = storageService.updateGoal(goalId, updates);
        if (updatedGoal) {
          loadGoals(); // Refresh the goals list
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
    [storageService, loadGoals]
  );

  // Delete a goal (soft delete)
  const deleteGoal = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        const success = storageService.deleteGoal(goalId);
        if (success) {
          loadGoals(); // Refresh the goals list
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
    [storageService, loadGoals]
  );

  // Get completion statistics for the current date
  const getStats = useCallback(() => {
    try {
      return storageService.getCompletionStats(currentDate);
    } catch (err) {
      console.error("Error getting stats:", err);
      return { total: 0, completed: 0, percentage: 0 };
    }
  }, [storageService, currentDate]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    goals,
    loading,
    error,
    addGoal,
    toggleGoal,
    updateGoal,
    deleteGoal,
    getStats,
    clearError,
    refresh: loadGoals,
  };
};
