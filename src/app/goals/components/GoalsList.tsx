"use client";

import React from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  LinearProgress,
} from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import { GoalWithStatus } from "../types";
import { GoalItem } from "./GoalItem";
import { CompletionChip } from "./CompletionChip";

interface GoalsListProps {
  goals: GoalWithStatus[];
  weeklyGoals?: GoalWithStatus[];
  inactiveGoals?: GoalWithStatus[];
  loading: boolean;
  error: string | null;
  onToggleGoal: (goalId: string) => void;
  onToggleGoalStep: (goalId: string, stepIndex: number) => void;
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
  onEditGoal,
  onDeleteGoal,
  isReadOnly = false,
  completionStats,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading goals...
        </Typography>
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

  const completedGoals = goals.filter((goal) => goal.completed);
  const pendingGoals = goals.filter((goal) => !goal.completed);

  return (
    <Box>
      {/* Progress Overview */}
      {completionStats.total > 0 && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: "primary.50" }}>
          <LinearProgress
            variant="determinate"
            value={completionStats.percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "grey.200",
              mb: 1,
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                backgroundColor:
                  completionStats.percentage === 100
                    ? "success.main"
                    : "primary.main",
              },
            }}
          />

          <Box
            display="flex"
            alignItems="center"
            gap={1}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              {completionStats.percentage}% complete
            </Typography>

            <CompletionChip completionStats={completionStats} />
          </Box>
        </Paper>
      )}

      {/* Pending Goals */}
      {pendingGoals.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Daily Goals ({pendingGoals.length})
          </Typography>
          {pendingGoals.map((goal) => (
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
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
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
      )}

      {/* Weekly Goals Section */}
      {weeklyGoals.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: "info.main" }}>
            Weekly Goals ({weeklyGoals.length})
          </Typography>
          {weeklyGoals.map((goal) => (
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
