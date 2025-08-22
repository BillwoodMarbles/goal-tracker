"use client";

import React, { useState, useEffect } from "react";
import { TextField, Button, Box, Typography, IconButton } from "@mui/material";
import { Close as CloseIcon, Save as SaveIcon } from "@mui/icons-material";
import { DayOfWeekSelector } from "./DayOfWeekSelector";
import { DayOfWeek, DAYS_OF_WEEK } from "../types";

interface GoalFormProps {
  onSubmit: (
    title: string,
    description?: string,
    daysOfWeek?: DayOfWeek[]
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when initial values change
  useEffect(() => {
    if (initialValues) {
      setGoalTitle(initialValues.title || "");
      setDescription(initialValues.description || "");
      setSelectedDays(initialValues.daysOfWeek || [...DAYS_OF_WEEK]);
    }
  }, [initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goalTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(
        goalTitle.trim(),
        description.trim() || undefined,
        selectedDays
      );

      // Reset form after successful submission
      setGoalTitle("");
      setDescription("");
      setSelectedDays([...DAYS_OF_WEEK]);
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
          <DayOfWeekSelector
            selectedDays={selectedDays}
            onDaysChange={setSelectedDays}
            disabled={isSubmitting || loading}
          />
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
            startIcon={<SaveIcon />}
            disabled={!goalTitle.trim() || isSubmitting || loading}
          >
            {isSubmitting ? "Saving..." : submitButtonText}
          </Button>
        </Box>
      </form>
    </Box>
  );
};
