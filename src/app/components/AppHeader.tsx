"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogContent,
  Snackbar,
  Alert,
} from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import { SupabaseGoalsService } from "../(root)/goals/services/supabaseGoalsService";
import { GoalForm } from "../(root)/goals/components/GoalForm";
import { DayOfWeek, GoalType } from "../(root)/goals/types";
import { UserDropdown } from "./UserDropdown";
import Image from "next/image";

export const AppHeader: React.FC = () => {
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
    daysOfWeek?: DayOfWeek[],
    isMultiStep?: boolean,
    totalSteps?: number,
    goalType?: GoalType
  ) => {
    try {
      const storageService = SupabaseGoalsService.getInstance();
      await storageService.addGoal(
        title,
        description,
        daysOfWeek,
        isMultiStep,
        totalSteps,
        goalType
      );

      showSnackbar("Goal added successfully!");
      handleCloseDialog();

      // Trigger a refresh of the goals page if we're on it
      window.dispatchEvent(new CustomEvent("goalsUpdated"));
    } catch (error) {
      console.error("Error adding goal:", error);
      showSnackbar("Failed to add goal", "error");
      throw error; // Re-throw to let GoalForm handle the error state
    }
  };

  const handleGroupGoalCreated = () => {
    showSnackbar("Group goal created successfully!");
    handleCloseDialog();
    // Trigger a refresh of the goals page
    window.dispatchEvent(new CustomEvent("goalsUpdated"));
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          bgcolor: "white",
          boxShadow: "none",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
        >
          <Image src="/logo_full_wide.svg" alt="Root" width={90} height={50} />

          <div>
            <UserDropdown />
            <IconButton
              color="primary"
              onClick={handleOpenDialog}
              aria-label="add goal"
              sx={{
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
                mr: -1,
              }}
            >
              <AddCircleOutline sx={{ fontSize: 32 }} />
            </IconButton>
          </div>
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
            onGroupGoalCreated={handleGroupGoalCreated}
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
