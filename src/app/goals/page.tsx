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
  TextField,
} from "@mui/material";
import { Today as TodayIcon } from "@mui/icons-material";
import { useGoals } from "./hooks/useGoals";
import { useDateNavigation } from "./hooks/useDateNavigation";

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
    loading,
    error,
    toggleGoal,
    updateGoal,
    deleteGoal,
    getStats,
    clearError,
    refresh,
  } = useGoals(selectedDate);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    goalId: string | null;
    title: string;
    description: string;
  }>({
    open: false,
    goalId: null,
    title: "",
    description: "",
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
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const newStatus = await toggleGoal(goalId);
    const statusText = newStatus ? "completed" : "marked as pending";
    showSnackbar(`"${goal.title}" ${statusText}!`);
  };

  const handleEditGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    setEditDialog({
      open: true,
      goalId,
      title: goal.title,
      description: goal.description || "",
    });
  };

  const handleUpdateGoal = async () => {
    if (!editDialog.goalId) return;

    const result = await updateGoal(editDialog.goalId, {
      title: editDialog.title,
      description: editDialog.description || undefined,
    });

    if (result) {
      showSnackbar("Goal updated successfully!");
      setEditDialog({ open: false, goalId: null, title: "", description: "" });
    } else {
      showSnackbar("Failed to update goal", "error");
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
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
        loading={loading}
        error={error}
        onToggleGoal={handleToggleGoal}
        onEditGoal={isToday ? handleEditGoal : undefined}
        onDeleteGoal={isToday ? handleDeleteGoal : undefined}
        isReadOnly={!isToday}
        completionStats={completionStats}
      />

      {/* Edit Goal Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() =>
          setEditDialog({
            open: false,
            goalId: null,
            title: "",
            description: "",
          })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Goal</DialogTitle>
        <DialogContent>
          <TextField
            label="Goal Title"
            value={editDialog.title}
            onChange={(e) =>
              setEditDialog((prev) => ({ ...prev, title: e.target.value }))
            }
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Description (optional)"
            value={editDialog.description}
            onChange={(e) =>
              setEditDialog((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setEditDialog({
                open: false,
                goalId: null,
                title: "",
                description: "",
              })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateGoal}
            variant="contained"
            disabled={!editDialog.title.trim()}
          >
            Update
          </Button>
        </DialogActions>
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
