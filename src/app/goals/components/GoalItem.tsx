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
  Chip,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckSharp,
} from "@mui/icons-material";
import { GoalWithStatus } from "../types";

interface GoalItemProps {
  goal: GoalWithStatus;
  onToggle: (goalId: string) => void;
  onToggleStep: (goalId: string, stepIndex: number) => void;
  onIncrementStep?: (goalId: string) => void;
  onEdit?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  isReadOnly?: boolean;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  goal,
  onToggle,
  onIncrementStep,
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

  // const formatCompletedTime = (date?: Date) => {
  //   if (!date) return "";
  //   return date.toLocaleTimeString("en-US", {
  //     hour: "numeric",
  //     minute: "2-digit",
  //     hour12: true,
  //   });
  // };

  return (
    <Card
      sx={{
        mb: 1.5,
        opacity: goal.completed ? 0.8 : isReadOnly ? 0.6 : 1,
        backgroundColor: isReadOnly ? "grey.50" : "background.paper",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: isReadOnly ? 1 : 2,
        },
      }}
    >
      <CardContent sx={{ py: 2, pr: 2, pl: 1, "&:last-child": { pb: 2 } }}>
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
                    textDecoration: goal.completed ? "line-through" : "none",
                    color: goal.completed ? "text.secondary" : "text.primary",
                    fontWeight: goal.completed ? 400 : 500,
                    fontSize: "1.1rem",
                  }}
                >
                  {goal.title}
                </Typography>

                {/* {goal.completed && goal.completedAt && (
                  <Typography
                    variant="body2"
                    color="success"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: 0,
                      fontSize: "0.75rem",
                    }}
                  >
                    {`Completed at ${formatCompletedTime(goal.completedAt)}`}
                  </Typography>
                )} */}
              </Box>

              {/* {goal.description && (
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
              )} */}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {goal.isMultiStep && goal.totalSteps > 1 && (
                <Chip
                  label={`${goal.completedSteps}/${goal.totalSteps}`}
                  size="medium"
                  color={goal.completed ? "success" : "default"}
                  variant="outlined"
                />
              )}

              {/* Single step goal - show one checkbox */}
              {!goal.isMultiStep || goal.totalSteps === 1 ? (
                <Box position="relative">
                  <CircularProgress
                    variant="determinate"
                    value={goal.completed ? 100 : 0}
                    size={42}
                    sx={{
                      color: "success.main",
                      position: "absolute",
                      top: "0",
                      left: "0",
                    }}
                  />
                  <Checkbox
                    checked={goal.completed}
                    onChange={handleToggle}
                    disabled={isReadOnly}
                    icon={<CheckSharp />}
                    size="medium"
                    checkedIcon={<CheckSharp />}
                    sx={{
                      color: "grey.500",
                      "&.Mui-checked": {
                        color: "white",
                        backgroundColor: "success.main",
                      },
                      transition: "all 0.3s ease-in-out",
                    }}
                  />
                </Box>
              ) : (
                /* Multi-step goal - show single checkbox with progress */
                <Box position="relative">
                  <CircularProgress
                    variant="determinate"
                    value={(goal.completedSteps / goal.totalSteps) * 100}
                    size={42}
                    sx={{
                      color: goal.completed ? "success.main" : "primary.main",
                      position: "absolute",
                      top: "0",
                      left: "0",
                    }}
                  />
                  <Checkbox
                    checked={goal.completed}
                    onChange={() => onIncrementStep?.(goal.id)}
                    disabled={isReadOnly}
                    icon={<CheckSharp />}
                    size="medium"
                    checkedIcon={<CheckSharp />}
                    sx={{
                      color: "grey.500",
                      "&.Mui-checked": {
                        color: "white",
                        backgroundColor: "success.main",
                      },
                      transition: "all 0.3s ease-in-out",
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>

          {(onEdit || onDelete) && (
            <Box>
              <IconButton size="small" onClick={handleMenuOpen} sx={{}}>
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
