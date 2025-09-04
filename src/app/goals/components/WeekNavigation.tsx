"use client";

import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import { Box, Typography, IconButton, LinearProgress } from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

interface WeekNavigationProps {
  selectedWeekStart: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export const WeekNavigation: React.FC<WeekNavigationProps> = ({
  selectedWeekStart,
  onPrevWeek,
  onNextWeek,
  completionStats,
}) => {
  const [isClient, setIsClient] = useState(false);
  const weekStart = dayjs(selectedWeekStart);
  const weekEnd = weekStart.add(6, "day");

  // Format the week range
  const weekRange = useMemo(() => {
    const startMonth = weekStart.format("MMM");
    const endMonth = weekEnd.format("MMM");
    const startDay = weekStart.format("D");
    const endDay = weekEnd.format("D");
    const year = weekStart.format("YYYY");

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  }, [weekStart, weekEnd]);

  const progressValue = useMemo(() => {
    return completionStats.percentage || 0;
  }, [completionStats.percentage]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Box sx={{ p: 0, pb: 0.5, backgroundColor: "white" }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ py: 1, px: 2 }}>
        <IconButton onClick={onPrevWeek} size="small">
          <ChevronLeftIcon />
        </IconButton>

        <Box textAlign="center" flexGrow={1}>
          <Typography variant="h6">Week View</Typography>
          <Typography variant="caption" color="text.secondary">
            {weekRange}
          </Typography>
        </Box>

        <IconButton onClick={onNextWeek} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {isClient && (
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            height: 8,
            backgroundColor: "grey.200",
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                progressValue === 100 ? "success.main" : "primary.main",
            },
          }}
        />
      )}
    </Box>
  );
};
