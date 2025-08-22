"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Today as TodayIcon } from "@mui/icons-material";
import { useGoals } from "./hooks/useGoals";
import { useDateNavigation } from "./hooks/useDateNavigation";
import { GoalForm } from "./components/GoalForm";
import { DayOfWeek, DAYS_OF_WEEK, GoalType } from "./types";

import { GoalsList } from "./components/GoalsList";
import { DateNavigation } from "./components/DateNavigation";

const Goals = () => {
  const {
    selectedDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    isToday,
    isFuture,
    getDisplayDate,
  } = useDateNavigation();

  const {
    goals,
    weeklyGoals,
    inactiveGoals,
    loading,
    error,
    toggleGoal,
    toggleGoalStep,
    updateGoal,
    deleteGoal,
    getStats,
    clearError,
    refresh,
  } = useGoals(selectedDate);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    goalId: string | null;
    goalData: {
      title: string;
      description: string;
      daysOfWeek: DayOfWeek[];
      isMultiStep: boolean;
      totalSteps: number;
      goalType: GoalType;
    } | null;
  }>({
    open: false,
    goalId: null,
    goalData: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    goalId: string | null;
    goalTitle: string;
  }>({
    open: false,
    goalId: null,
    goalTitle: "",
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  // Listen for goal updates from the header
  useEffect(() => {
    const handleGoalsUpdated = () => {
      refresh();
    };

    window.addEventListener("goalsUpdated", handleGoalsUpdated);
    return () => {
      window.removeEventListener("goalsUpdated", handleGoalsUpdated);
    };
  }, [refresh]);

  const handleToggleGoal = async (goalId: string) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const newStatus = await toggleGoal(goalId);
    const statusText = newStatus ? "completed" : "marked as pending";
    showSnackbar(`"${goal.title}" ${statusText}!`);
  };

  const handleToggleGoalStep = async (goalId: string, stepIndex: number) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    await toggleGoalStep(goalId, stepIndex);
    // No snackbar for individual steps to avoid spam
  };

  const handleEditGoal = (goalId: string) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId) ||
      inactiveGoals.find((g) => g.id === goalId);

    if (!goal) return;

    setEditDialog({
      open: true,
      goalId,
      goalData: {
        title: goal.title,
        description: goal.description || "",
        daysOfWeek: goal.daysOfWeek || [...DAYS_OF_WEEK],
        isMultiStep: goal.isMultiStep || false,
        totalSteps: goal.totalSteps || 1,
        goalType: goal.goalType || GoalType.DAILY,
      },
    });
  };

  const handleUpdateGoal = async (
    title: string,
    description?: string,
    daysOfWeek?: DayOfWeek[],
    isMultiStep?: boolean,
    totalSteps?: number,
    goalType?: GoalType
  ) => {
    if (!editDialog.goalId) return;

    try {
      const result = await updateGoal(editDialog.goalId, {
        title,
        description,
        daysOfWeek,
        isMultiStep,
        totalSteps,
        goalType,
      });

      if (result) {
        showSnackbar("Goal updated successfully!");
        setEditDialog({
          open: false,
          goalId: null,
          goalData: null,
        });
      } else {
        showSnackbar("Failed to update goal", "error");
      }
    } catch (error) {
      console.error("Error updating goal:", error);
      showSnackbar("Failed to update goal", "error");
      throw error; // Re-throw to let GoalForm handle the error state
    }
  };

  const handleCancelEdit = () => {
    setEditDialog({
      open: false,
      goalId: null,
      goalData: null,
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    setDeleteDialog({
      open: true,
      goalId,
      goalTitle: goal.title,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.goalId) return;

    const result = await deleteGoal(deleteDialog.goalId);
    if (result) {
      showSnackbar("Goal deleted successfully!");
      setDeleteDialog({ open: false, goalId: null, goalTitle: "" });
    } else {
      showSnackbar("Failed to delete goal", "error");
    }
  };

  const completionStats = getStats();

  return (
    <Box>
      {!isToday && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={goToToday}
            size="medium"
          >
            Today
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <DateNavigation
        selectedDate={selectedDate}
        displayDate={getDisplayDate()}
        isFuture={isFuture}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        completionStats={completionStats}
      />

      <GoalsList
        goals={goals}
        weeklyGoals={weeklyGoals}
        inactiveGoals={inactiveGoals}
        loading={loading}
        error={error}
        onToggleGoal={handleToggleGoal}
        onToggleGoalStep={handleToggleGoalStep}
        onEditGoal={handleEditGoal}
        onDeleteGoal={handleDeleteGoal}
        isReadOnly={isFuture}
        completionStats={completionStats}
      />

      {/* Edit Goal Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={handleCancelEdit}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <GoalForm
            onSubmit={handleUpdateGoal}
            onCancel={handleCancelEdit}
            submitButtonText="Update Goal"
            title="Edit Goal"
            showCloseButton={true}
            initialValues={editDialog.goalData || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, goalId: null, goalTitle: "" })
        }
      >
        <DialogTitle>Delete Goal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteDialog.goalTitle}
            &quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteDialog({ open: false, goalId: null, goalTitle: "" })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Goals;
