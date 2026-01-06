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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { Close as CloseIcon, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { DayOfWeekSelector } from "./DayOfWeekSelector";
import { DayOfWeek, DAYS_OF_WEEK, GoalType, GoalKind } from "../types";

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
  onGroupGoalCreated?: () => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  submitButtonText = "Add Goal",
  title = "Add New Goal",
  showCloseButton = true,
  initialValues,
  onGroupGoalCreated,
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
  const [goalKind, setGoalKind] = useState<GoalKind>(GoalKind.PERSONAL);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{
    open: boolean;
    token: string | null;
  }>({ open: false, token: null });
  const [linkCopied, setLinkCopied] = useState(false);

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
      if (goalKind === GoalKind.GROUP) {
        // Create group goal via API
        const res = await fetch("/api/group-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: goalTitle.trim(),
            description: description.trim() || undefined,
            daysOfWeek: selectedDays,
            startDate,
            endDate: endDate || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.inviteToken) {
            setInviteLinkDialog({ open: true, token: data.inviteToken });
          }
          onGroupGoalCreated?.();
        }
      } else {
        // Personal goal
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
      }

      // Reset form after successful submission
      setGoalTitle("");
      setDescription("");
      setSelectedDays([...DAYS_OF_WEEK]);
      setIsMultiStep(false);
      setTotalSteps(1);
      setGoalType(GoalType.DAILY);
      setGoalKind(GoalKind.PERSONAL);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
    } catch (error) {
      console.error("Error submitting goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (inviteLinkDialog.token) {
      const inviteUrl = `${window.location.origin}/invite/${inviteLinkDialog.token}`;
      navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleCloseInviteDialog = () => {
    setInviteLinkDialog({ open: false, token: null });
    setLinkCopied(false);
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
          sx={{ mb: 1 }}
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
          sx={{ mb: 2 }}
          placeholder="Add any additional details about this goal..."
        />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Goal Kind
          </Typography>
          <ToggleButtonGroup
            color="primary"
            value={goalKind}
            exclusive
            onChange={(_, newKind) => {
              if (newKind !== null) {
                setGoalKind(newKind);
                // Reset multi-step for group goals
                if (newKind === GoalKind.GROUP) {
                  setIsMultiStep(false);
                  setTotalSteps(1);
                  setGoalType(GoalType.DAILY);
                }
              }
            }}
            disabled={isSubmitting || loading}
            size="small"
            sx={{ width: "100%", mb: 2 }}
          >
            <ToggleButton value={GoalKind.PERSONAL} sx={{ flex: 1 }}>
              Personal
            </ToggleButton>
            <ToggleButton value={GoalKind.GROUP} sx={{ flex: 1 }}>
              Group
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {goalKind === GoalKind.PERSONAL && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Goal Type
            </Typography>
            <ToggleButtonGroup
              color="primary"
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
          </Box>
        )}

        {goalKind === GoalKind.GROUP && (
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              disabled={isSubmitting || loading}
              sx={{ mb: 1 }}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="End Date (optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              disabled={isSubmitting || loading}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        {(goalType === GoalType.DAILY || goalKind === GoalKind.GROUP) && (
          <Box sx={{ mb: 2 }}>
            <DayOfWeekSelector
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
              disabled={isSubmitting || loading}
            />
          </Box>
        )}

        {goalKind === GoalKind.PERSONAL && (
          <Box sx={{ mb: 2 }}>
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
                  max={7}
                  marks
                  step={1}
                  disabled={isSubmitting || loading}
                  valueLabelDisplay="auto"
                  sx={{ width: "100%" }}
                />
              </Box>
            )}
          </Box>
        )}

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

      {/* Invite Link Dialog */}
      <Dialog
        open={inviteLinkDialog.open}
        onClose={handleCloseInviteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Group Goal Created!</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your group goal has been created successfully.
          </Alert>
          <Typography variant="body2" gutterBottom>
            Share this invite link with others to let them join:
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "grey.100",
              borderRadius: 1,
              wordBreak: "break-all",
            }}
          >
            <Typography variant="body2" fontFamily="monospace">
              {inviteLinkDialog.token &&
                `${window.location.origin}/invite/${inviteLinkDialog.token}`}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyInviteLink} startIcon={<ContentCopyIcon />}>
            {linkCopied ? "Copied!" : "Copy Link"}
          </Button>
          <Button onClick={handleCloseInviteDialog} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
