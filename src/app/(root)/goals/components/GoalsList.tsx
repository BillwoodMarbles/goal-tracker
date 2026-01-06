"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Collapse,
  Button,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { GoalWithStatus, GroupGoalWithStatus } from "../types";
import { GoalItem } from "./GoalItem";
import { GroupGoalItem } from "./GroupGoalItem";

interface GoalsListProps {
  goals: GoalWithStatus[];
  weeklyGoals?: GoalWithStatus[];
  inactiveGoals?: GoalWithStatus[];
  groupGoals?: GroupGoalWithStatus[];
  historicalGroupGoals?: GroupGoalWithStatus[];
  loading: boolean;
  error: string | null;
  onToggleGoal: (goalId: string) => void;
  onToggleGoalStep: (goalId: string, stepIndex: number) => void;
  onIncrementGoalStep?: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onSnoozeGoal?: (goalId: string) => void;
  onToggleGroupGoal?: (groupGoalId: string) => void;
  onEditGroupGoal?: (groupGoalId: string) => void;
  onRefreshGoals?: () => void;
  isReadOnly?: boolean;
  selectedDate?: string;
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
  groupGoals = [],
  historicalGroupGoals = [],
  loading,
  error,
  onToggleGoal,
  onToggleGoalStep,
  onIncrementGoalStep,
  onEditGoal,
  onDeleteGoal,
  onSnoozeGoal,
  onToggleGroupGoal,
  onEditGroupGoal,
  onRefreshGoals,
  isReadOnly = false,
  selectedDate,
}) => {
  const [showHistoricalGroups, setShowHistoricalGroups] = useState(false);
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

  if (
    goals.length === 0 &&
    weeklyGoals.length === 0 &&
    groupGoals.length === 0
  ) {
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
      {/* Daily Goals */}
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
              onSnooze={onSnoozeGoal}
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
              onSnooze={onSnoozeGoal}
              isReadOnly={isReadOnly}
            />
          ))}
        </Box>
      )}

      {/* Group Goals */}
      {groupGoals.length > 0 && (
        <Box mb={3}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            mb={1}
          >
            <Typography variant="h6">Group Goals</Typography>
          </Box>
          {groupGoals.map((groupGoal) => (
            <GroupGoalItem
              key={groupGoal.id}
              groupGoal={groupGoal}
              onToggle={onToggleGroupGoal || (() => {})}
              onEdit={onEditGroupGoal}
              onRefresh={onRefreshGoals}
              selectedDate={selectedDate}
            />
          ))}
        </Box>
      )}

      {/* Historical Group Goals */}
      {historicalGroupGoals.length > 0 && (
        <Box mb={3}>
          <Button
            onClick={() => setShowHistoricalGroups(!showHistoricalGroups)}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showHistoricalGroups
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.3s",
                }}
              />
            }
            sx={{ mb: 1 }}
          >
            Historical Group Goals ({historicalGroupGoals.length})
          </Button>
          <Collapse in={showHistoricalGroups}>
            <Box>
              {historicalGroupGoals.map((groupGoal) => (
                <GroupGoalItem
                  key={groupGoal.id}
                  groupGoal={groupGoal}
                  onToggle={onToggleGroupGoal || (() => {})}
                  onEdit={onEditGroupGoal}
                  onRefresh={onRefreshGoals}
                  selectedDate={selectedDate}
                />
              ))}
            </Box>
          </Collapse>
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
              onSnooze={onSnoozeGoal}
              isReadOnly={true}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
