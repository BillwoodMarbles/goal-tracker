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
  Chip,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { GoalWithStatus } from "../types";

interface GoalItemProps {
  goal: GoalWithStatus;
  onToggle: (goalId: string) => void;
  onEdit?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  isReadOnly?: boolean;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  goal,
  onToggle,
  onEdit,
  onDelete,
  isReadOnly = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit?.(goal.id);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(goal.id);
    handleMenuClose();
  };

  const handleToggle = () => {
    if (!isReadOnly) {
      onToggle(goal.id);
    }
  };

  const formatCompletedTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card
      sx={{
        mb: 2,
        opacity: goal.completed ? 0.8 : 1,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Checkbox
            checked={goal.completed}
            onChange={handleToggle}
            disabled={isReadOnly}
            icon={<CheckCircleIcon />}
            checkedIcon={<CheckCircleIcon />}
            sx={{
              color: "primary.main",
              "&.Mui-checked": {
                color: "success.main",
              },
              mt: -0.5,
            }}
          />

          <Box flex={1} minWidth={0}>
            <Typography
              variant="h6"
              sx={{
                textDecoration: goal.completed ? "line-through" : "none",
                color: goal.completed ? "text.secondary" : "text.primary",
                fontWeight: goal.completed ? 400 : 500,
                fontSize: "1.1rem",
                mb: goal.description ? 0.5 : 0,
              }}
            >
              {goal.title}
            </Typography>

            {goal.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textDecoration: goal.completed ? "line-through" : "none",
                  mb: 1,
                }}
              >
                {goal.description}
              </Typography>
            )}

            {goal.completed && goal.completedAt && (
              <Chip
                label={`Completed at ${formatCompletedTime(goal.completedAt)}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>

          {(onEdit || onDelete) && (
            <>
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ mt: -0.5 }}
              >
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
              >
                {onEdit && (
                  <MenuItem onClick={handleEdit}>
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
