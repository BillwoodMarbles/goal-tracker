"use client";

import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import { Box, Typography, IconButton, LinearProgress } from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

interface DateNavigationProps {
  selectedDate: string;
  displayDate: string;
  isFuture: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export const DateNavigation: React.FC<DateNavigationProps> = ({
  selectedDate,
  displayDate,
  onPrevDay,
  onNextDay,
  completionStats,
}) => {
  const [isClient, setIsClient] = useState(false);
  const selectedDay = dayjs(selectedDate);

  // Extract just the day name from displayDate or use dayjs format
  const dayOfWeek = displayDate.includes(" - ")
    ? displayDate.split(" - ")[0]
    : selectedDay.format("dddd");

  const fullDate = selectedDay.format("MMMM D, YYYY");

  const progressValue = useMemo(() => {
    return completionStats.percentage || 0;
  }, [completionStats.percentage]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Box sx={{ mb: 2, p: 0, pb: 0.5, backgroundColor: "white" }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ py: 1, px: 2 }}>
        <IconButton onClick={onPrevDay} size="small">
          <ChevronLeftIcon />
        </IconButton>

        <Box textAlign="center" flexGrow={1}>
          <Typography variant="h6">{dayOfWeek}</Typography>
          <Typography variant="caption" color="text.secondary">
            {fullDate}
          </Typography>
        </Box>

        <IconButton onClick={onNextDay} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* {isFuture && (
        <Box mt={2}>
          <Chip
            label="Future Date - Goals can be planned but not completed yet"
            color="info"
            variant="outlined"
            size="small"
          />
        </Box>
      )} */}

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
