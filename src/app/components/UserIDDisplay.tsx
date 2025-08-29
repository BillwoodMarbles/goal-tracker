"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Person as PersonIcon,
  Sync as SyncIcon,
  CloudOff as CloudOffIcon,
  Cloud as CloudIcon,
} from "@mui/icons-material";
import { UserService } from "../services/userService";
import { HybridStorageService } from "../services/hybridStorageService";

export const UserIDDisplay: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchUserId, setSwitchUserId] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    pendingChanges: false,
    lastSync: "",
  });

  const userService = UserService.getInstance();
  const hybridStorageService = HybridStorageService.getInstance();

  useEffect(() => {
    // Initialize user and get ID
    const user = userService.initializeUser();
    setUserId(user.id);

    // Update sync status
    updateSyncStatus();

    // Check online status periodically
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSyncStatus = async () => {
    const status = hybridStorageService.getSyncStatus();
    setSyncStatus(status);
  };

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setShowCopySuccess(true);
    } catch (error) {
      console.error("Failed to copy user ID:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = userId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowCopySuccess(true);
    }
  };

  const handleSwitchUser = async () => {
    if (!userService.isValidUserId(switchUserId)) {
      setSwitchError("Invalid user ID format");
      return;
    }

    setIsSwitching(true);
    setSwitchError("");

    try {
      const success = await hybridStorageService.switchUser(switchUserId);
      if (success) {
        setUserId(switchUserId);
        setShowSwitchDialog(false);
        setSwitchUserId("");
        // Trigger page refresh to reload data
        window.location.reload();
      } else {
        setSwitchError("Failed to switch user. User may not exist.");
      }
    } catch {
      setSwitchError("An error occurred while switching users");
    } finally {
      setIsSwitching(false);
    }
  };

  const handleForceSync = async () => {
    try {
      const success = await hybridStorageService.forceSync();
      if (success) {
        updateSyncStatus();
      }
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  };

  const formatUserId = (id: string) => {
    // Format as: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  };

  const getStatusIcon = () => {
    if (syncStatus.isOnline) {
      return syncStatus.pendingChanges ? (
        <Tooltip title="Online - Pending sync">
          <SyncIcon sx={{ fontSize: 16, color: "warning.main" }} />
        </Tooltip>
      ) : (
        <Tooltip title="Online - Synced">
          <CloudIcon sx={{ fontSize: 16, color: "success.main" }} />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="Offline - Local storage only">
          <CloudOffIcon sx={{ fontSize: 16, color: "error.main" }} />
        </Tooltip>
      );
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          backgroundColor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <PersonIcon sx={{ fontSize: 20, color: "text.secondary" }} />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontFamily: "monospace" }}
        >
          {formatUserId(userId)}
        </Typography>
        <IconButton size="small" onClick={handleCopyUserId} sx={{ ml: 1 }}>
          <CopyIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setShowSwitchDialog(true)}
          sx={{ ml: 1 }}
        >
          <PersonIcon sx={{ fontSize: 16 }} />
        </IconButton>
        {getStatusIcon()}
        {syncStatus.pendingChanges && (
          <IconButton size="small" onClick={handleForceSync} sx={{ ml: 1 }}>
            <SyncIcon sx={{ fontSize: 16, color: "warning.main" }} />
          </IconButton>
        )}
      </Box>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={showCopySuccess}
        autoHideDuration={2000}
        onClose={() => setShowCopySuccess(false)}
      >
        <Alert severity="success" onClose={() => setShowCopySuccess(false)}>
          User ID copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Switch User Dialog */}
      <Dialog
        open={showSwitchDialog}
        onClose={() => setShowSwitchDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Switch User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a user ID to switch to that user&apos;s data. This will load
            their goals and progress.
          </Typography>
          <TextField
            fullWidth
            label="User ID"
            value={switchUserId}
            onChange={(e) => setSwitchUserId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            error={!!switchError}
            helperText={switchError}
            sx={{ fontFamily: "monospace" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSwitchDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSwitchUser}
            variant="contained"
            disabled={isSwitching || !switchUserId.trim()}
          >
            {isSwitching ? "Switching..." : "Switch User"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
