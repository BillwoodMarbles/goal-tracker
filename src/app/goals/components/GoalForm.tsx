"use client";

import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { DayOfWeekSelector } from "./DayOfWeekSelector";
import { DayOfWeek, DAYS_OF_WEEK, GoalType } from "../types";

interface GoalFormProps {
  onSubmit: (
    title: string,
    description?: string,
    daysOfWeek?: DayOfWeek[],
    isMultiStep?: boolean,
    totalSteps?: number,
    goalType?: GoalType
  ) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  submitButtonText?: string;
  title?: string;
  showCloseButton?: boolean;
  initialValues?: {
    title?: string;
    description?: string;
    daysOfWeek?: DayOfWeek[];
    isMultiStep?: boolean;
    totalSteps?: number;
    goalType?: GoalType;
  };
}

export const GoalForm: React.FC<GoalFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  submitButtonText = "Add Goal",
  title = "Add New Goal",
  showCloseButton = true,
  initialValues,
}) => {
  const [goalTitle, setGoalTitle] = useState(initialValues?.title || "");
  const [description, setDescription] = useState(
    initialValues?.description || ""
  );
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(
    initialValues?.daysOfWeek || [...DAYS_OF_WEEK]
  );
  const [isMultiStep, setIsMultiStep] = useState(
    initialValues?.isMultiStep || false
  );
  const [totalSteps, setTotalSteps] = useState(initialValues?.totalSteps || 1);
  const [goalType, setGoalType] = useState<GoalType>(
    initialValues?.goalType || GoalType.DAILY
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when initial values change
  useEffect(() => {
    if (initialValues) {
      setGoalTitle(initialValues.title || "");
      setDescription(initialValues.description || "");
      setSelectedDays(initialValues.daysOfWeek || [...DAYS_OF_WEEK]);
      setIsMultiStep(initialValues.isMultiStep || false);
      setTotalSteps(initialValues.totalSteps || 1);
      setGoalType(initialValues.goalType || GoalType.DAILY);
    }
  }, [initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goalTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // For weekly goals, use all days of the week since they're tracked weekly
      const daysForGoal =
        goalType === GoalType.WEEKLY ? [...DAYS_OF_WEEK] : selectedDays;

      await onSubmit(
        goalTitle.trim(),
        description.trim() || undefined,
        daysForGoal,
        isMultiStep,
        totalSteps,
        goalType
      );

      // Reset form after successful submission
      setGoalTitle("");
      setDescription("");
      setSelectedDays([...DAYS_OF_WEEK]);
      setIsMultiStep(false);
      setTotalSteps(1);
      setGoalType(GoalType.DAILY);
    } catch (error) {
      console.error("Error submitting goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setGoalTitle("");
    setDescription("");
    setSelectedDays([...DAYS_OF_WEEK]);
    onCancel?.();
  };

  return (
    <Box>
      {title && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">{title}</Typography>
          {showCloseButton && onCancel && (
            <IconButton size="small" onClick={handleCancel}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Goal Title"
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          fullWidth
          required
          autoFocus
          disabled={isSubmitting || loading}
          sx={{ mb: 2 }}
          placeholder="e.g., Exercise for 30 minutes"
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          disabled={isSubmitting || loading}
          sx={{ mb: 3 }}
          placeholder="Add any additional details about this goal..."
        />

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Goal Type
          </Typography>
          <ToggleButtonGroup
            value={goalType}
            exclusive
            onChange={(_, newGoalType) => {
              if (newGoalType !== null) {
                setGoalType(newGoalType);
              }
            }}
            disabled={isSubmitting || loading}
            size="small"
            sx={{ width: "100%" }}
          >
            <ToggleButton value={GoalType.DAILY} sx={{ flex: 1 }}>
              Daily
            </ToggleButton>
            <ToggleButton value={GoalType.WEEKLY} sx={{ flex: 1 }}>
              Weekly
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            {goalType === GoalType.DAILY
              ? "Daily goals count towards daily completion progress"
              : "Weekly goals will be tracked on a weekly basis"}
          </Typography>
        </Box>

        {goalType === GoalType.DAILY && (
          <Box sx={{ mb: 3 }}>
            <DayOfWeekSelector
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
              disabled={isSubmitting || loading}
            />
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isMultiStep}
                onChange={(e) => setIsMultiStep(e.target.checked)}
                disabled={isSubmitting || loading}
              />
            }
            label="Multi-step goal"
          />

          {isMultiStep && (
            <Box sx={{ mt: 2 }}>
              <Typography>Number of steps: {totalSteps}</Typography>
              <Slider
                value={totalSteps}
                onChange={(_, value) => setTotalSteps(value as number)}
                min={2}
                max={10}
                marks
                step={1}
                disabled={isSubmitting || loading}
                valueLabelDisplay="auto"
                sx={{ width: "100%" }}
              />
            </Box>
          )}
        </Box>

        <Box display="flex" gap={2} justifyContent="flex-end">
          {onCancel && (
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isSubmitting || loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={!goalTitle.trim() || isSubmitting || loading}
          >
            {isSubmitting ? "Saving..." : submitButtonText}
          </Button>
        </Box>
      </form>
    </Box>
  );
};
