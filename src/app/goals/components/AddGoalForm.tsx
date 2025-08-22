"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

interface AddGoalFormProps {
  onAddGoal: (title: string, description?: string) => Promise<void>;
  loading?: boolean;
}

export const AddGoalForm: React.FC<AddGoalFormProps> = ({
  onAddGoal,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddGoal(title.trim(), description.trim() || undefined);

      // Reset form and close
      setTitle("");
      setDescription("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setIsOpen(false);
  };

  const handleToggleForm = () => {
    if (isOpen) {
      handleCancel();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {!isOpen ? (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleToggleForm}
            fullWidth
            sx={{
              py: 1.5,
              borderStyle: "dashed",
              borderWidth: 2,
              "&:hover": {
                borderStyle: "dashed",
                borderWidth: 2,
              },
            }}
          >
            Add New Goal
          </Button>
        ) : (
          <Box>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Add New Goal</Typography>
              <IconButton size="small" onClick={handleCancel}>
                <CloseIcon />
              </IconButton>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                label="Goal Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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

              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isSubmitting || loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={!title.trim() || isSubmitting || loading}
                >
                  {isSubmitting ? "Adding..." : "Add Goal"}
                </Button>
              </Box>
            </form>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
