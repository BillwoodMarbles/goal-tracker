"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Close as CloseIcon } from "@mui/icons-material";
import { usePathname } from "next/navigation";
import { LocalStorageService } from "../goals/services/localStorageService";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const isGoalsPage = pathname === "/goals";

  const [addGoalDialog, setAddGoalDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = () => {
    setAddGoalDialog(true);
  };

  const handleCloseDialog = () => {
    setAddGoalDialog(false);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const storageService = LocalStorageService.getInstance();
      await storageService.addGoal(
        title.trim(),
        description.trim() || undefined
      );

      showSnackbar("Goal added successfully!");
      handleCloseDialog();

      // Trigger a refresh of the goals page if we're on it
      if (isGoalsPage) {
        window.dispatchEvent(new CustomEvent("goalsUpdated"));
      }
    } catch (error) {
      console.error("Error adding goal:", error);
      showSnackbar("Failed to add goal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: "grey.900" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Daily Goals Tracker
          </Typography>

          {isGoalsPage && (
            <IconButton
              color="inherit"
              onClick={handleOpenDialog}
              aria-label="add goal"
              sx={{
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <AddIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Add Goal Dialog */}
      <Dialog
        open={addGoalDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            Add New Goal
            <IconButton size="small" onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              label="Goal Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              autoFocus
              disabled={isSubmitting}
              margin="normal"
              placeholder="e.g., Exercise for 30 minutes"
            />

            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={isSubmitting}
              margin="normal"
              placeholder="Add any additional details about this goal..."
            />
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Goal"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
