"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { usePathname } from "next/navigation";
import { LocalStorageService } from "../goals/services/localStorageService";
import { GoalForm } from "../goals/components/GoalForm";
import { DayOfWeek } from "../goals/types";
import Image from "next/image";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const isGoalsPage = pathname === "/goals";

  const [addGoalDialog, setAddGoalDialog] = useState(false);
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
  };

  const handleSubmitGoal = async (
    title: string,
    description?: string,
    daysOfWeek?: DayOfWeek[]
  ) => {
    try {
      const storageService = LocalStorageService.getInstance();
      await storageService.addGoal(title, description, daysOfWeek);

      showSnackbar("Goal added successfully!");
      handleCloseDialog();

      // Trigger a refresh of the goals page if we're on it
      if (isGoalsPage) {
        window.dispatchEvent(new CustomEvent("goalsUpdated"));
      }
    } catch (error) {
      console.error("Error adding goal:", error);
      showSnackbar("Failed to add goal", "error");
      throw error; // Re-throw to let GoalForm handle the error state
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: "white" }}>
        <Toolbar>
          <Image src="/logo_full_wide.svg" alt="Root" width={100} height={50} />

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
        <DialogContent sx={{ p: 3 }}>
          <GoalForm
            onSubmit={handleSubmitGoal}
            onCancel={handleCloseDialog}
            submitButtonText="Add Goal"
            title="Add New Goal"
            showCloseButton={true}
          />
        </DialogContent>
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
