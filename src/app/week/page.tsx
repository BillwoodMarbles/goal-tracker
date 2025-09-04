"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
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

const WeekView = React.memo(() => {
  const [goals, setGoals] = useState<GoalWithDailyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  const { selectedWeekStart, goToPrevWeek, goToNextWeek } = useWeekNavigation();

  const loadWeekData = useCallback(() => {
    const storageService = LocalStorageService.getInstance();

    // Use batch loading method to get all week data
    const weekData = storageService.getWeekData(selectedWeekStart);
    setWeekDates(weekData.weekDates);

    // Process goals with pre-loaded data
    const goalsWithDailyStatus: GoalWithDailyStatus[] = weekData.goals.map(
      (goal) => {
        const dailyStatus: {
          [date: string]: {
            completed: boolean;
            completedSteps: number;
            totalSteps: number;
            disabled?: boolean;
          };
        } = {};

        weekData.weekDates.forEach((date) => {
          const dayOfWeek = dayjs(date).format("dddd").toLowerCase() as string;
          const isGoalActiveForDay = goal.daysOfWeek?.includes(
            dayOfWeek as DayOfWeek
          );

          if (goal.goalType === GoalType.DAILY && isGoalActiveForDay) {
            // Use pre-loaded daily goals data
            const dailyGoals = weekData.dailyGoals[date];
            const goalStatus = dailyGoals.goals.find(
              (gs) => gs.goalId === goal.id
            );

            dailyStatus[date] = {
              completed: goalStatus?.completed || false,
              completedSteps: goalStatus?.completedSteps || 0,
              totalSteps: goal.totalSteps,
            };
          } else if (goal.goalType === GoalType.WEEKLY) {
            // Use pre-loaded weekly goals data
            const weeklyGoals = weekData.weeklyGoals[date];
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
  }, [selectedWeekStart]);

  useEffect(() => {
    loadWeekData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekStart]);

  // Listen for goal updates from the header
  useEffect(() => {
    const handleGoalsUpdated = () => {
      loadWeekData();
    };

    // Listen for custom events when goals are updated
    window.addEventListener("goalsUpdated", handleGoalsUpdated);

    return () => {
      window.removeEventListener("goalsUpdated", handleGoalsUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize expensive calculations
  const getProgressValue = useCallback(
    (goal: GoalWithDailyStatus, date: string) => {
      const status = goal.dailyStatus[date];
      if (!status || status.disabled) return 0;

      if (goal.goalType === GoalType.WEEKLY) {
        return status.completed ? 100 : 0;
      } else if (goal.isMultiStep && goal.totalSteps > 1) {
        return (status.completedSteps / status.totalSteps) * 100;
      } else {
        return status.completed ? 100 : 0;
      }
    },
    []
  );

  const getProgressColor = useCallback(
    (goal: GoalWithDailyStatus, date: string) => {
      const status = goal.dailyStatus[date];
      if (!status || status.disabled) return "grey.400";

      // Check if this is a failed daily goal (active but not completed and no steps taken)
      if (goal.goalType === GoalType.DAILY && !status.disabled) {
        const isPastDate = dayjs(date).isBefore(dayjs(), "day");
        if (isPastDate && !status.completed && status.completedSteps === 0) {
          return "error.main"; // Red for failed goals
        }
      }

      if (status.completed) return "success.main";
      return "primary.main";
    },
    []
  );

  const isGoalFailed = useCallback(
    (goal: GoalWithDailyStatus, date: string) => {
      const status = goal.dailyStatus[date];
      if (!status || status.disabled || goal.goalType !== GoalType.DAILY)
        return false;

      const isPastDate = dayjs(date).isBefore(dayjs(), "day");
      return isPastDate && !status.completed && status.completedSteps === 0;
    },
    []
  );

  const getWeeklyGoalProgress = useCallback(
    (goal: GoalWithDailyStatus) => {
      if (goal.goalType !== GoalType.WEEKLY) return 0;

      // Check if the goal is fully completed for the week
      const storageService = LocalStorageService.getInstance();
      const weeklyGoals =
        storageService.getWeeklyGoalsForDate(selectedWeekStart);
      const goalStatus = weeklyGoals.find((gs) => gs.id === goal.id);

      if (goalStatus?.completed) {
        return 100; // Show 100% if the weekly goal is fully completed
      }

      // Otherwise, show progress based on days incremented
      const completedDays = Object.values(goal.dailyStatus).filter(
        (status) => status.completed
      ).length;
      return (completedDays / goal.totalSteps) * 100; // 7 days in a week
    },
    [selectedWeekStart]
  );

  const getWeeklyCompletionStats = useMemo(() => {
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
  }, [goals, weekDates, selectedWeekStart]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box height="100%" flexGrow={1} display="flex" flexDirection="column">
      <WeekNavigation
        selectedWeekStart={selectedWeekStart}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        completionStats={getWeeklyCompletionStats}
      />

      {goals.length === 0 ? (
        <Alert severity="info">
          No goals found. Create some goals to see them here.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 0, boxShadow: "none", my: 2 }}
        >
          <Table sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    width: "30%",
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
                      width: "10%",
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
              {/* Daily Goals First */}
              {goals
                .filter((goal) => goal.goalType === GoalType.DAILY)
                .map((goal) => (
                  <React.Fragment key={goal.id}>
                    <TableRow>
                      <TableCell
                        sx={{
                          p: 1,
                          border: "1px solid #e0e0e0",
                          width: "30%",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
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
                                  margin: "auto",
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
                              <Box
                                position="relative"
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                {goal.dailyStatus[date]?.completed && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      backgroundColor: "rgba(76, 175, 80, 0.2)",
                                    }}
                                  />
                                )}
                                {!goal.dailyStatus[date]?.completed &&
                                  goal.isMultiStep &&
                                  goal.totalSteps > 1 &&
                                  goal.dailyStatus[date]?.completedSteps >
                                    0 && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        backgroundColor:
                                          "rgba(33, 150, 243, 0.2)",
                                      }}
                                    />
                                  )}
                                <CircularProgress
                                  variant="determinate"
                                  value={getProgressValue(goal, date)}
                                  size={32}
                                  sx={{
                                    color: getProgressColor(goal, date),
                                  }}
                                />
                                {goal.isMultiStep && goal.totalSteps > 1 && (
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
                                {isGoalFailed(goal, date) && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      backgroundColor: "rgba(244, 67, 54, 0.2)",
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                ))}

              {/* Weekly Goals Second */}
              {goals
                .filter((goal) => goal.goalType === GoalType.WEEKLY)
                .map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell
                      sx={{
                        p: 1,
                        border: "1px solid #e0e0e0",
                        width: "30%",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}
                      >
                        {goal.title}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={7} sx={{ p: 0, position: "relative" }}>
                      <Box
                        sx={{
                          p: 1,
                          position: "relative",
                          minHeight: 50,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <LinearProgress
                          variant="determinate"
                          value={getWeeklyGoalProgress(goal)}
                          sx={{
                            height: 4,
                            borderRadius: 3,
                            backgroundColor: "grey.200",
                            width: "100%",
                            zIndex: 1,
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "success.main",
                            },
                          }}
                        />
                        {/* Daily status circles positioned absolutely on top */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            px: 0.5,
                            zIndex: 2,
                          }}
                        >
                          {weekDates.map((date, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: 32,
                                height: 32,
                              }}
                            >
                              {goal.dailyStatus[date]?.disabled ? (
                                <Box
                                  sx={{
                                    width: 24,
                                    height: 24,
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
                                    sx={{ fontSize: "0.6rem" }}
                                  >
                                    —
                                  </Typography>
                                </Box>
                              ) : (
                                <Box
                                  position="relative"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "100%",
                                    height: "100%",
                                  }}
                                >
                                  {goal.dailyStatus[date]?.completed && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        backgroundColor:
                                          "rgba(76, 175, 80, 0.2)",
                                      }}
                                    />
                                  )}
                                  <CircularProgress
                                    variant="determinate"
                                    value={getProgressValue(goal, date)}
                                    size={24}
                                    sx={{
                                      color: getProgressColor(goal, date),
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
});

WeekView.displayName = "WeekView";

export default WeekView;
