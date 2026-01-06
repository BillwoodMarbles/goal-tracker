"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Container,
  TextField,
} from "@mui/material";
import { useGoals } from "./goals/hooks/useGoals";
import { useDateNavigation } from "./goals/hooks/useDateNavigation";
import { GoalForm } from "./goals/components/GoalForm";
import { DayOfWeek, DAYS_OF_WEEK, GoalType } from "./goals/types";
import { DayOfWeekSelector } from "./goals/components/DayOfWeekSelector";

import { GoalsList } from "./goals/components/GoalsList";
import { DateNavigation } from "./goals/components/DateNavigation";

const Goals = () => {
  const {
    selectedDate,
    // goToToday,
    goToPrevDay,
    goToNextDay,
    // isToday,
    isFuture,
    getDisplayDate,
  } = useDateNavigation();

  const {
    goals,
    weeklyGoals,
    inactiveGoals,
    groupGoals,
    historicalGroupGoals,
    loading,
    error,
    toggleGoal,
    toggleGoalStep,
    incrementGoalStep,
    snoozeGoal,
    toggleGroupGoal,
    updateGoal,
    deleteGoal,
    completionStats,
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

  const [editGroupDialog, setEditGroupDialog] = useState<{
    open: boolean;
    groupGoalId: string | null;
    groupGoalData: {
      title: string;
      description: string;
      startDate: string;
      endDate: string;
      daysOfWeek: DayOfWeek[];
    } | null;
  }>({
    open: false,
    groupGoalId: null,
    groupGoalData: null,
  });

  const [groupEditSaving, setGroupEditSaving] = useState(false);

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

    await toggleGoal(goalId);
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

  const handleIncrementGoalStep = async (goalId: string) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    await incrementGoalStep(goalId);
  };

  const handleSnoozeGoal = async (goalId: string) => {
    // Search through both daily and weekly goals
    const goal =
      goals.find((g) => g.id === goalId) ||
      weeklyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    await snoozeGoal(goalId);
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
      weeklyGoals.find((g) => g.id === goalId) ||
      inactiveGoals.find((g) => g.id === goalId);
    if (!goal) return;

    setDeleteDialog({
      open: true,
      goalId,
      goalTitle: goal.title,
    });
  };

  const handleEditGroupGoal = (groupGoalId: string) => {
    const gg =
      groupGoals.find((g) => g.id === groupGoalId) ||
      historicalGroupGoals.find((g) => g.id === groupGoalId);

    if (!gg) return;

    // Only owners should be able to edit (UI also guards in GroupGoalItem)
    if (gg.role !== "owner") return;

    setEditGroupDialog({
      open: true,
      groupGoalId,
      groupGoalData: {
        title: gg.title,
        description: gg.description || "",
        startDate: gg.startDate,
        endDate: gg.endDate || "",
        daysOfWeek: gg.daysOfWeek || [...DAYS_OF_WEEK],
      },
    });
  };

  const handleCancelEditGroupGoal = () => {
    if (groupEditSaving) return;
    setEditGroupDialog({ open: false, groupGoalId: null, groupGoalData: null });
  };

  const handleUpdateGroupGoal = async () => {
    if (!editGroupDialog.groupGoalId || !editGroupDialog.groupGoalData) return;
    if (groupEditSaving) return;

    const { title, description, startDate, endDate, daysOfWeek } =
      editGroupDialog.groupGoalData;

    if (!title.trim() || !startDate) {
      showSnackbar("Title and start date are required", "error");
      return;
    }

    setGroupEditSaving(true);
    try {
      const res = await fetch(`/api/group-goals/${editGroupDialog.groupGoalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          // Send null to explicitly clear optional fields
          description: description.trim() ? description.trim() : null,
          startDate,
          endDate: endDate ? endDate : null,
          daysOfWeek,
        }),
      });

      if (!res.ok) {
        showSnackbar("Failed to update group goal", "error");
        return;
      }

      showSnackbar("Group goal updated successfully!");
      setEditGroupDialog({
        open: false,
        groupGoalId: null,
        groupGoalData: null,
      });
      refresh();
    } catch (err) {
      console.error("Error updating group goal:", err);
      showSnackbar("Failed to update group goal", "error");
    } finally {
      setGroupEditSaving(false);
    }
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

  return (
    <Box
      sx={{
        height: "100%",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
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

      <Container
        component="main"
        sx={{
          py: 2,
          overflow: "scroll",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          height: "100%",
        }}
      >
        <GoalsList
          goals={goals}
          weeklyGoals={weeklyGoals}
          inactiveGoals={inactiveGoals}
          groupGoals={groupGoals}
          historicalGroupGoals={historicalGroupGoals}
          loading={loading}
          error={error}
          onToggleGoal={handleToggleGoal}
          onToggleGoalStep={handleToggleGoalStep}
          onIncrementGoalStep={handleIncrementGoalStep}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
          onSnoozeGoal={handleSnoozeGoal}
          onToggleGroupGoal={toggleGroupGoal}
          onEditGroupGoal={handleEditGroupGoal}
          onRefreshGoals={refresh}
          isReadOnly={isFuture}
          selectedDate={selectedDate}
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

        {/* Edit Group Goal Dialog */}
        <Dialog
          open={editGroupDialog.open}
          onClose={handleCancelEditGroupGoal}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ p: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="h6">Edit Group Goal</Typography>

              <TextField
                label="Goal Title"
                value={editGroupDialog.groupGoalData?.title || ""}
                onChange={(e) =>
                  setEditGroupDialog((prev) =>
                    prev.groupGoalData
                      ? {
                          ...prev,
                          groupGoalData: {
                            ...prev.groupGoalData,
                            title: e.target.value,
                          },
                        }
                      : prev
                  )
                }
                fullWidth
                required
                disabled={groupEditSaving}
              />

              <TextField
                label="Description (optional)"
                value={editGroupDialog.groupGoalData?.description || ""}
                onChange={(e) =>
                  setEditGroupDialog((prev) =>
                    prev.groupGoalData
                      ? {
                          ...prev,
                          groupGoalData: {
                            ...prev.groupGoalData,
                            description: e.target.value,
                          },
                        }
                      : prev
                  )
                }
                fullWidth
                multiline
                rows={2}
                disabled={groupEditSaving}
              />

              <Box>
                <TextField
                  label="Start Date"
                  type="date"
                  value={editGroupDialog.groupGoalData?.startDate || ""}
                  onChange={(e) =>
                    setEditGroupDialog((prev) =>
                      prev.groupGoalData
                        ? {
                            ...prev,
                            groupGoalData: {
                              ...prev.groupGoalData,
                              startDate: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  fullWidth
                  required
                  disabled={groupEditSaving}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="End Date (optional)"
                  type="date"
                  value={editGroupDialog.groupGoalData?.endDate || ""}
                  onChange={(e) =>
                    setEditGroupDialog((prev) =>
                      prev.groupGoalData
                        ? {
                            ...prev,
                            groupGoalData: {
                              ...prev.groupGoalData,
                              endDate: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  fullWidth
                  disabled={groupEditSaving}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <DayOfWeekSelector
                selectedDays={editGroupDialog.groupGoalData?.daysOfWeek || []}
                onDaysChange={(days) =>
                  setEditGroupDialog((prev) =>
                    prev.groupGoalData
                      ? {
                          ...prev,
                          groupGoalData: { ...prev.groupGoalData, daysOfWeek: days },
                        }
                      : prev
                  )
                }
                disabled={groupEditSaving}
              />

              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCancelEditGroupGoal}
                  disabled={groupEditSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdateGroupGoal}
                  disabled={
                    groupEditSaving ||
                    !editGroupDialog.groupGoalData?.title?.trim() ||
                    !editGroupDialog.groupGoalData?.startDate
                  }
                >
                  {groupEditSaving ? "Saving..." : "Update Group Goal"}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() =>
            setDeleteDialog({ open: false, goalId: null, goalTitle: "" })
          }
        >
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Delete Goal
            </Typography>
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
      </Container>
    </Box>
  );
};

export default Goals;
