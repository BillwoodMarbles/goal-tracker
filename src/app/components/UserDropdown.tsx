"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Person as PersonIcon,
  Sync as SyncIcon,
  CloudOff as CloudOffIcon,
  Cloud as CloudIcon,
  AccountCircle,
} from "@mui/icons-material";
import { UserService } from "../services/userService";
import { HybridStorageService } from "../services/hybridStorageService";

export const UserDropdown: React.FC = () => {
  const [userId, setUserId] = useState<string>("");
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchUserId, setSwitchUserId] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const handleUserIconClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setShowCopySuccess(true);
      handleCloseMenu();
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
      handleCloseMenu();
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
        handleCloseMenu();
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
      handleCloseMenu();
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
        <SyncIcon sx={{ fontSize: 16, color: "warning.main" }} />
      ) : (
        <CloudIcon sx={{ fontSize: 16, color: "success.main" }} />
      );
    } else {
      return <CloudOffIcon sx={{ fontSize: 16, color: "error.main" }} />;
    }
  };

  const getStatusText = () => {
    if (syncStatus.isOnline) {
      return syncStatus.pendingChanges
        ? "Online - Pending sync"
        : "Online - Synced";
    } else {
      return "Offline - Local storage only";
    }
  };

  return (
    <>
      <IconButton
        color="primary"
        onClick={handleUserIconClick}
        aria-label="user menu"
        sx={{
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
          mr: 1,
        }}
      >
        <AccountCircle sx={{ fontSize: 24 }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            minWidth: 280,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            User ID
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
          >
            {formatUserId(userId)}
          </Typography>
        </Box>

        <Divider />

        <MenuItem onClick={handleCopyUserId}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy User ID" />
        </MenuItem>

        <MenuItem
          onClick={() => setShowSwitchDialog(true)}
          disabled={!syncStatus.isOnline}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Switch User"
            secondary={
              !syncStatus.isOnline ? "Requires online connection" : undefined
            }
          />
        </MenuItem>

        <Divider />

        <MenuItem disabled>
          <ListItemIcon>{getStatusIcon()}</ListItemIcon>
          <ListItemText
            primary={getStatusText()}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </MenuItem>

        {syncStatus.pendingChanges && (
          <MenuItem onClick={handleForceSync}>
            <ListItemIcon>
              <SyncIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText primary="Force Sync" />
          </MenuItem>
        )}
      </Menu>

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
