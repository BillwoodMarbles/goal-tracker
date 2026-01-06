"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Checkbox,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  CheckSharp,
  InfoSharp,
  Link as LinkIcon,
  ExitToApp as ExitToAppIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { GroupGoalWithStatus, GroupGoalMemberStatus } from "../types";
import { getTodayString } from "../services/supabaseGoalsService";

interface GroupGoalItemProps {
  groupGoal: GroupGoalWithStatus;
  onToggle: (groupGoalId: string) => void;
  onRefresh?: () => void;
  selectedDate?: string;
}

export const GroupGoalItem: React.FC<GroupGoalItemProps> = ({
  groupGoal,
  onToggle,
  onRefresh,
  selectedDate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [memberStats, setMemberStats] = useState<GroupGoalMemberStatus[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = () => {
    onToggle(groupGoal.id);
  };

  const handleViewStats = async () => {
    setLoadingStats(true);
    setStatsDialogOpen(true);
    handleMenuClose();

    try {
      const date = selectedDate || getTodayString();
      const res = await fetch(
        `/api/group-goals/${groupGoal.id}/status?date=${date}`
      );
      if (res.ok) {
        const data = await res.json();
        setMemberStats(data.memberStats || []);
      }
    } catch (err) {
      console.error("Error loading member stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleShareInviteLink = async () => {
    try {
      const res = await fetch(`/api/group-goals/${groupGoal.id}/invite`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.token) return;

      const inviteUrl = `${window.location.origin}/invite/${data.token}`;
      const shareText = `You are invited to a group goal (${groupGoal.title})`;

      if (navigator.share) {
        await navigator.share({
          title: "Group Goal Invite",
          text: shareText,
          url: inviteUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(inviteUrl);
        setInviteLinkCopied(true);
        setTimeout(() => setInviteLinkCopied(false), 2000);
      }
    } catch (err) {
      console.error("Error sharing invite link:", err);
    } finally {
      handleMenuClose();
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group goal?")) {
      handleMenuClose();
      return;
    }

    try {
      const res = await fetch(`/api/group-goals/${groupGoal.id}/leave`, {
        method: "POST",
      });
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error("Error leaving group goal:", err);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this group goal? All members will lose access."
      )
    ) {
      handleMenuClose();
      return;
    }

    try {
      const res = await fetch(`/api/group-goals/${groupGoal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error("Error deleting group goal:", err);
    }
    handleMenuClose();
  };

  const getCheckboxColor = () => {
    if (groupGoal.allCompleted) return "#FFD700"; // Gold when all complete
    if (groupGoal.selfCompleted) return "success.main"; // Green when self complete
    return "primary.main";
  };

  const getProgressColor = () => {
    if (groupGoal.allCompleted) return "#FFD700"; // Gold
    if (groupGoal.selfCompleted) return "success.main"; // Green
    return "primary.main";
  };

  const getBorderColor = () => {
    if (groupGoal.allCompleted) return "#FFD700"; // Gold border
    if (groupGoal.selfCompleted) return "success.main"; // Green border
    return "background.paper";
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 1.5,
          opacity: groupGoal.selfCompleted ? 0.8 : 1,
          backgroundColor: "background.paper",
          borderColor: getBorderColor(),
          borderWidth:
            groupGoal.selfCompleted || groupGoal.allCompleted ? 2 : 1,
          transition: "all 0.2s ease-in-out",
          boxShadow: 2,
        }}
      >
        <CardContent
          sx={{ py: 1.5, pr: 2, pl: 1, "&:last-child": { pb: 1.5 } }}
        >
          <Box
            display="flex"
            flexDirection={"row-reverse"}
            justifyContent={"space-between"}
            alignItems={"center"}
            position="relative"
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent={"space-between"}
              flexGrow={1}
              gap={1}
              flexDirection={"row"}
            >
              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="h6"
                    sx={{
                      textDecoration: groupGoal.selfCompleted
                        ? "line-through"
                        : "none",
                      color: groupGoal.selfCompleted
                        ? "text.secondary"
                        : "text.primary",
                      fontWeight: groupGoal.selfCompleted ? 400 : 500,
                      fontSize: "1.1rem",
                    }}
                  >
                    {groupGoal.title}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="body1"
                  color={getProgressColor()}
                  mr={1}
                  sx={{ fontWeight: 500 }}
                >
                  {groupGoal.membersCompleted}/{groupGoal.membersTotal}
                </Typography>

                <Box position="relative">
                  <CircularProgress
                    variant="determinate"
                    value={
                      (groupGoal.membersCompleted /
                        Math.max(groupGoal.membersTotal, 1)) *
                      100
                    }
                    size={42}
                    sx={{
                      color: getProgressColor(),
                      position: "absolute",
                      top: "0",
                      left: "0",
                    }}
                  />
                  <Checkbox
                    checked={groupGoal.selfCompleted}
                    onChange={handleToggle}
                    icon={<CheckSharp />}
                    size="medium"
                    checkedIcon={<CheckSharp />}
                    sx={{
                      color: "primary.main",
                      "&.Mui-checked": {
                        color: "white",
                        backgroundColor: getCheckboxColor(),
                      },
                      transition: "all 0.3s ease-in-out",
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box>
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 250,
                    },
                  },
                }}
              >
                {groupGoal.description && (
                  <MenuItem
                    key="description"
                    sx={{ color: "text.secondary", whiteSpace: "unset" }}
                  >
                    <InfoSharp sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">
                      {groupGoal.description}
                    </Typography>
                  </MenuItem>
                )}
                {groupGoal.description && <Divider key="desc-divider" />}
                <MenuItem key="view-stats" onClick={handleViewStats}>
                  <InfoSharp sx={{ mr: 1, fontSize: 20 }} />
                  View Group Status
                </MenuItem>
                {groupGoal.role === "owner" && [
                  <MenuItem key="invite" onClick={handleShareInviteLink}>
                    <LinkIcon sx={{ mr: 1, fontSize: 20 }} />
                    {inviteLinkCopied ? "Link Copied!" : "Invite to Goal"}
                  </MenuItem>,
                  <Divider key="owner-divider" />,
                  <MenuItem
                    key="delete"
                    onClick={handleDelete}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete Group Goal
                  </MenuItem>,
                ]}
                {groupGoal.role === "member" && [
                  <Divider key="member-divider" />,
                  <MenuItem
                    key="leave"
                    onClick={handleLeave}
                    sx={{ color: "warning.main" }}
                  >
                    <ExitToAppIcon sx={{ mr: 1, fontSize: 20 }} />
                    Leave Group
                  </MenuItem>,
                ]}
              </Menu>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={statsDialogOpen}
        onClose={() => setStatsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Group Goal Status</DialogTitle>
        <DialogContent>
          {loadingStats ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {memberStats.map((member) => (
                <ListItem key={member.userId} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>
                          {member.displayName}
                          {member.role === "owner" && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                ml: 1,
                                backgroundColor: "primary.main",
                                color: "white",
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontSize: "0.65rem",
                              }}
                            >
                              OWNER
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      member.completed
                        ? `Completed ${
                            member.completedAt
                              ? new Date(
                                  member.completedAt
                                ).toLocaleTimeString()
                              : ""
                          }`
                        : "Not completed"
                    }
                  />
                  <Checkbox
                    checked={member.completed}
                    disabled
                    checkedIcon={<CheckSharp />}
                    sx={{
                      color: member.completed ? "success.main" : "default",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
