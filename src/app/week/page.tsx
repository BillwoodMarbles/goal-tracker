"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LocalStorageService } from "../goals/services/localStorageService";
import { GoalType, DAYS_OF_WEEK, DayOfWeek } from "../goals/types";
import { WeekNavigation } from "../goals/components/WeekNavigation";
import { useWeekNavigation } from "../goals/hooks/useWeekNavigation";
import dayjs from "dayjs";

interface GoalWithDailyStatus {
  id: string;
  title: string;
  description?: string;
  goalType: GoalType;
  daysOfWeek: string[];
  isMultiStep: boolean;
  totalSteps: number;
  dailyStatus: {
    [date: string]: {
      completed: boolean;
      completedSteps: number;
      totalSteps: number;
      disabled?: boolean;
    };
  };
}

export default function WeekView() {
  const [goals, setGoals] = useState<GoalWithDailyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  const { selectedWeekStart, goToPrevWeek, goToNextWeek } = useWeekNavigation();

  useEffect(() => {
    const loadWeekData = () => {
      const storageService = LocalStorageService.getInstance();

      // Get the start of the week (Sunday)
      const weekStart = dayjs(selectedWeekStart).day(0); // 0 = Sunday
      const dates: string[] = [];

      // Generate all 7 days of the week
      for (let i = 0; i < 7; i++) {
        dates.push(weekStart.add(i, "day").format("YYYY-MM-DD"));
      }
      setWeekDates(dates);

      // Get all goals (both daily and weekly)
      const allGoals = storageService.getGoals();

      const goalsWithDailyStatus: GoalWithDailyStatus[] = allGoals.map(
        (goal) => {
          const dailyStatus: {
            [date: string]: {
              completed: boolean;
              completedSteps: number;
              totalSteps: number;
              disabled?: boolean;
            };
          } = {};

          dates.forEach((date) => {
            const dayOfWeek = dayjs(date)
              .format("dddd")
              .toLowerCase() as string;
            const isGoalActiveForDay = goal.daysOfWeek?.includes(
              dayOfWeek as DayOfWeek
            );

            if (goal.goalType === GoalType.DAILY && isGoalActiveForDay) {
              // For daily goals, get the status for this specific date
              const dailyGoals = storageService.getDailyGoals(date);
              const goalStatus = dailyGoals.goals.find(
                (gs) => gs.goalId === goal.id
              );

              dailyStatus[date] = {
                completed: goalStatus?.completed || false,
                completedSteps: goalStatus?.completedSteps || 0,
                totalSteps: goal.totalSteps,
              };
            } else if (goal.goalType === GoalType.WEEKLY) {
              // For weekly goals, check if this specific day has been incremented
              const weeklyGoals = storageService.getWeeklyGoalsForDate(date);
              const goalStatus = weeklyGoals.find((gs) => gs.id === goal.id);

              // Check if this specific date has been incremented for this weekly goal
              const wasIncrementedOnThisDate =
                goalStatus?.dailyIncremented || false;

              dailyStatus[date] = {
                completed: wasIncrementedOnThisDate,
                completedSteps: wasIncrementedOnThisDate ? 1 : 0,
                totalSteps: goal.totalSteps,
              };
            } else {
              // Goal not active for this day
              dailyStatus[date] = {
                completed: false,
                completedSteps: 0,
                totalSteps: goal.totalSteps,
                disabled: true,
              };
            }
          });

          return {
            ...goal,
            dailyStatus,
          };
        }
      );

      setGoals(goalsWithDailyStatus);
      setLoading(false);
    };

    loadWeekData();
  }, [selectedWeekStart]);

  const getProgressValue = (goal: GoalWithDailyStatus, date: string) => {
    const status = goal.dailyStatus[date];
    if (!status || status.disabled) return 0;

    if (goal.goalType === GoalType.WEEKLY) {
      return status.completed ? 100 : 0;
    } else if (goal.isMultiStep && goal.totalSteps > 1) {
      return (status.completedSteps / status.totalSteps) * 100;
    } else {
      return status.completed ? 100 : 0;
    }
  };

  const getProgressColor = (goal: GoalWithDailyStatus, date: string) => {
    const status = goal.dailyStatus[date];
    if (!status || status.disabled) return "grey.400";
    if (status.completed) return "success.main";
    return "primary.main";
  };

  const getWeeklyGoalProgress = (goal: GoalWithDailyStatus) => {
    if (goal.goalType !== GoalType.WEEKLY) return 0;

    // Check if the goal is fully completed for the week
    const storageService = LocalStorageService.getInstance();
    const weeklyGoals = storageService.getWeeklyGoalsForDate(selectedWeekStart);
    const goalStatus = weeklyGoals.find((gs) => gs.id === goal.id);

    if (goalStatus?.completed) {
      return 100; // Show 100% if the weekly goal is fully completed
    }

    // Otherwise, show progress based on days incremented
    const completedDays = Object.values(goal.dailyStatus).filter(
      (status) => status.completed
    ).length;
    return (completedDays / 7) * 100; // 7 days in a week
  };

  const getWeeklyCompletionStats = () => {
    let totalPossibleCompletions = 0;
    let totalActualCompletions = 0;

    goals.forEach((goal) => {
      if (goal.goalType === GoalType.WEEKLY) {
        // For weekly goals, count as 1 completion if completed
        const storageService = LocalStorageService.getInstance();
        const weeklyGoalsData =
          storageService.getWeeklyGoalsForDate(selectedWeekStart);
        const goalStatus = weeklyGoalsData.find((gs) => gs.id === goal.id);

        totalPossibleCompletions += 1;
        if (goalStatus?.completed) {
          totalActualCompletions += 1;
        }
      } else {
        // For daily goals, count each active day as a possible completion
        weekDates.forEach((date) => {
          const status = goal.dailyStatus[date];
          if (status && !status.disabled) {
            totalPossibleCompletions += 1;
            if (status.completed) {
              totalActualCompletions += 1;
            }
          }
        });
      }
    });

    return {
      total: totalPossibleCompletions,
      completed: totalActualCompletions,
      percentage:
        totalPossibleCompletions > 0
          ? Math.round(
              (totalActualCompletions / totalPossibleCompletions) * 100
            )
          : 0,
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Loading...
        </Typography>
      </Container>
    );
  }

  return (
    <Box height="100%" flexGrow={1}>
      <WeekNavigation
        selectedWeekStart={selectedWeekStart}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        completionStats={getWeeklyCompletionStats()}
      />

      {goals.length === 0 ? (
        <Alert severity="info">
          No goals found. Create some goals to see them here.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 0, boxShadow: "none" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 75,
                    p: 1,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  Goals
                </TableCell>
                {weekDates.map((date, index) => (
                  <TableCell
                    key={index}
                    align="center"
                    sx={{
                      minWidth: 30,
                      p: 0.5,
                      height: 50,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                      {DAYS_OF_WEEK[index].charAt(0).toUpperCase()}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal) => (
                <React.Fragment key={goal.id}>
                  <TableRow>
                    <TableCell sx={{ p: 1, border: "1px solid #e0e0e0" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                        }}
                      >
                        {goal.title}
                      </Typography>
                    </TableCell>
                    {weekDates.map((date, index) => (
                      <TableCell key={index} align="center" sx={{ p: 0 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: 50,
                            backgroundColor: goal.dailyStatus[date]?.disabled
                              ? "grey.100"
                              : "transparent",
                          }}
                        >
                          {goal.dailyStatus[date]?.disabled ? (
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                backgroundColor: "grey.300",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            </Box>
                          ) : (
                            <Box position="relative">
                              <CircularProgress
                                variant="determinate"
                                value={getProgressValue(goal, date)}
                                size={32}
                                sx={{
                                  color: getProgressColor(goal, date),
                                }}
                              />
                              {goal.isMultiStep &&
                                goal.totalSteps > 1 &&
                                goal.goalType !== GoalType.WEEKLY && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      position: "absolute",
                                      top: "50%",
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                      fontSize: "0.6rem",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {goal.dailyStatus[date]?.completedSteps ||
                                      null}
                                  </Typography>
                                )}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                  {goal.goalType === GoalType.WEEKLY && (
                    <TableRow>
                      <TableCell sx={{ p: 0 }}>
                        <Box sx={{ height: 4 }} />
                      </TableCell>
                      <TableCell colSpan={7} sx={{ p: 0 }}>
                        <Box sx={{ p: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={getWeeklyGoalProgress(goal)}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: "grey.200",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: "success.main",
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
