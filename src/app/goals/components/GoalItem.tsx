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
  CheckCircleOutline,
} from "@mui/icons-material";
import { GoalWithStatus } from "../types";

interface GoalItemProps {
  goal: GoalWithStatus;
  onToggle: (goalId: string) => void;
  onToggleStep: (goalId: string, stepIndex: number) => void;
  onEdit?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  isReadOnly?: boolean;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  goal,
  onToggle,
  onToggleStep,
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
        opacity: goal.completed ? 0.8 : isReadOnly ? 0.6 : 1,
        backgroundColor: isReadOnly ? "grey.50" : "background.paper",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: isReadOnly ? 1 : 2,
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          display="flex"
          flexDirection={"row"}
          justifyContent={"space-between"}
          gap={2}
        >
          <Box
            display="flex"
            alignItems="flex-start"
            flexGrow={1}
            gap={1}
            flexDirection={"column"}
          >
            <Box flex={1} minWidth={0}>
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                mb={goal.description ? 0.5 : 0}
              >
                <Typography
                  variant="h6"
                  sx={{
                    textDecoration: goal.completed ? "line-through" : "none",
                    color: goal.completed ? "text.secondary" : "text.primary",
                    fontWeight: goal.completed ? 400 : 500,
                    fontSize: "1.1rem",
                  }}
                >
                  {goal.title}
                </Typography>

                {goal.isMultiStep && goal.totalSteps > 1 && (
                  <Chip
                    label={`${goal.completedSteps}/${goal.totalSteps}`}
                    size="small"
                    color={goal.completed ? "success" : "default"}
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.75rem" }}
                  />
                )}

                {goal.completed && goal.completedAt && (
                  <Chip
                    label={`Completed at ${formatCompletedTime(
                      goal.completedAt
                    )}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>

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
            </Box>

            {/* Single step goal - show one checkbox */}
            {!goal.isMultiStep || goal.totalSteps === 1 ? (
              <Checkbox
                checked={goal.completed}
                onChange={handleToggle}
                disabled={isReadOnly}
                icon={<CheckCircleIcon />}
                size="large"
                checkedIcon={<CheckCircleIcon />}
                sx={{
                  color: "primary.main",
                  "&.Mui-checked": {
                    color: "success.main",
                  },
                  mt: -0.5,
                  p: 0.25,
                }}
              />
            ) : (
              /* Multi-step goal - show multiple checkboxes */
              <Box
                display="flex"
                flexDirection="row"
                width={"100%"}
                gap={0.15}
                sx={{ mt: -0.5 }}
              >
                {Array.from({ length: goal.totalSteps }, (_, index) => {
                  const isStepCompleted =
                    goal.stepCompletions && goal.stepCompletions[index];
                  return (
                    <Checkbox
                      key={index}
                      checked={!!isStepCompleted}
                      onChange={() => onToggleStep(goal.id, index)}
                      disabled={isReadOnly}
                      icon={<CheckCircleOutline />}
                      checkedIcon={<CheckCircleIcon />}
                      size={goal.totalSteps > 5 ? "medium" : "large"}
                      sx={{
                        color: "primary.main",
                        "&.Mui-checked": {
                          color: "success.main",
                        },
                        p: 0.25,
                      }}
                    />
                  );
                })}
              </Box>
            )}
          </Box>

          {(onEdit || onDelete) && (
            <Box>
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
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
