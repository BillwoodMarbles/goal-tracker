"use client";

import React from "react";
import { Box, Typography, Alert, CircularProgress, Paper } from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import { GoalWithStatus } from "../types";
import { GoalItem } from "./GoalItem";

interface GoalsListProps {
  goals: GoalWithStatus[];
  weeklyGoals?: GoalWithStatus[];
  inactiveGoals?: GoalWithStatus[];
  loading: boolean;
  error: string | null;
  onToggleGoal: (goalId: string) => void;
  onToggleGoalStep: (goalId: string, stepIndex: number) => void;
  onIncrementGoalStep?: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  isReadOnly?: boolean;
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export const GoalsList: React.FC<GoalsListProps> = ({
  goals,
  weeklyGoals = [],
  inactiveGoals = [],
  loading,
  error,
  onToggleGoal,
  onToggleGoalStep,
  onIncrementGoalStep,
  onEditGoal,
  onDeleteGoal,
  isReadOnly = false,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (goals.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          backgroundColor: "grey.50",
          border: "2px dashed",
          borderColor: "grey.300",
        }}
      >
        <AssignmentIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No goals yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first goal to start tracking your daily progress!
        </Typography>
      </Paper>
    );
  }

  // const completedGoals = goals.filter((goal) => goal.completed);
  // const pendingGoals = goals.filter((goal) => !goal.completed);

  return (
    <Box>
      {/* Pending Goals */}
      {goals.length > 0 && (
        <Box mb={3}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            mb={1}
          >
            <Typography variant="h6">Daily Goals</Typography>
            {/* <CompletionChip completionStats={completionStats} /> */}
          </Box>
          {goals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onToggle={onToggleGoal}
              onToggleStep={onToggleGoalStep}
              onIncrementStep={onIncrementGoalStep}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              isReadOnly={isReadOnly}
            />
          ))}
        </Box>
      )}

      {/* Completed Goals */}
      {/* {completedGoals.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: "success.main" }}>
            Completed ({completedGoals.length})
          </Typography>
          {completedGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onToggle={onToggleGoal}
              onToggleStep={onToggleGoalStep}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              isReadOnly={isReadOnly}
            />
          ))}
        </Box>
      )} */}

      {/* Weekly Goals Section */}
      {weeklyGoals.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            mb={1}
          >
            <Typography variant="h6">Weekly Goals </Typography>
            {/* <CompletionChip
              completionStats={{
                total: weeklyGoals.length,
                completed: weeklyGoals.filter((goal) => goal.completed).length,
                percentage:
                  (weeklyGoals.filter((goal) => goal.completed).length /
                    weeklyGoals.length) *
                  100,
              }}
            /> */}
          </Box>
          {weeklyGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onToggle={onToggleGoal}
              onToggleStep={onToggleGoalStep}
              onIncrementStep={onIncrementGoalStep}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              isReadOnly={isReadOnly}
            />
          ))}
        </Box>
      )}

      {/* Inactive Goals Section */}
      {inactiveGoals.length > 0 && (
        <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "text.secondary",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            Other Goals
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontStyle: "italic" }}
          >
            These goals are not scheduled for today
          </Typography>
          {inactiveGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onToggle={() => {}} // No-op for inactive goals
              onToggleStep={() => {}} // No-op for inactive goals
              onIncrementStep={() => {}} // No-op for inactive goals
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              isReadOnly={true}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
