"use client";

import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
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
  isFuture,
  onPrevDay,
  onNextDay,
}) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onPrevDay} size="small">
            <ChevronLeftIcon />
          </IconButton>

          <Box textAlign="center" flexGrow={1}>
            <Typography variant="h6" component="div">
              {displayDate}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedDate}
            </Typography>
          </Box>

          <IconButton onClick={onNextDay} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {isFuture && (
          <Box mt={2}>
            <Chip
              label="Future Date - Goals can be planned but not completed yet"
              color="info"
              variant="outlined"
              size="small"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
