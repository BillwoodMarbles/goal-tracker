"use client";

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { DayOfWeek, DAYS_OF_WEEK, DAY_ABBREVIATIONS } from "../types";

interface DayOfWeekSelectorProps {
  selectedDays: DayOfWeek[];
  onDaysChange: (days: DayOfWeek[]) => void;
  label?: string;
  disabled?: boolean;
}

export const DayOfWeekSelector: React.FC<DayOfWeekSelectorProps> = ({
  selectedDays,
  onDaysChange,
  label = "Active Days",
  disabled = false,
}) => {
  const toggleDay = (day: DayOfWeek) => {
    if (disabled) return;

    const isSelected = selectedDays.includes(day);
    if (isSelected) {
      // Remove day (but keep at least one day selected)
      if (selectedDays.length > 1) {
        onDaysChange(selectedDays.filter((d) => d !== day));
      }
    } else {
      // Add day
      onDaysChange([...selectedDays, day]);
    }
  };

  const selectAllDays = () => {
    if (disabled) return;
    onDaysChange([...DAYS_OF_WEEK]);
  };

  const isAllSelected = selectedDays.length === DAYS_OF_WEEK.length;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {!isAllSelected && (
          <Button
            size="small"
            onClick={selectAllDays}
            disabled={disabled}
            sx={{
              fontSize: "0.75rem",
              minWidth: "auto",
              px: 1,
              minHeight: "auto",
              lineHeight: "normal",
              py: 0,
            }}
          >
            Select All
          </Button>
        )}
      </Box>

      <Box display="flex" gap={0.5} justifyContent={"space-between"}>
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <Button
              key={day}
              variant={isSelected ? "contained" : "outlined"}
              size="small"
              onClick={() => toggleDay(day)}
              disabled={disabled}
              sx={{
                minWidth: 36,
                height: 36,
                fontSize: "0.75rem",
                fontWeight: isSelected ? 600 : 400,
                backgroundColor: isSelected ? "primary.main" : "transparent",
                color: isSelected ? "primary.contrastText" : "text.primary",
                borderColor: isSelected ? "primary.main" : "divider",
                "&:hover": {
                  backgroundColor: isSelected ? "primary.dark" : "action.hover",
                },
                "&.Mui-disabled": {
                  opacity: 0.6,
                },
              }}
            >
              {DAY_ABBREVIATIONS[day]}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};
