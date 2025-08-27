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
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckSharp,
  InfoSharp,
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

  const getStepCounterColor = () => {
    if (goal.completedSteps === 0) return "text.secondary";
    if (goal.completed) return "success.main";
    return "primary.main";
  };

  const getBorderColor = () => {
    if (goal.completed) return "success.main";
    if (goal.dailyIncremented) return "primary.main";
    return "background.paper";
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        opacity: goal.completed ? 0.8 : isReadOnly ? 0.6 : 1,
        backgroundColor: isReadOnly ? "grey.50" : "background.paper",
        borderColor: getBorderColor(),
        transition: "all 0.2s ease-in-out",
        boxShadow: isReadOnly ? 1 : 2,
      }}
    >
      <CardContent sx={{ py: 1.5, pr: 2, pl: 1, "&:last-child": { pb: 1.5 } }}>
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
                    textDecoration:
                      goal.completed || goal.dailyIncremented
                        ? "line-through"
                        : "none",
                    color:
                      goal.completed || goal.dailyIncremented
                        ? "text.secondary"
                        : "text.primary",
                    fontWeight: goal.completed ? 400 : 500,
                    fontSize: "1.1rem",
                  }}
                >
                  {goal.title}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {goal.isMultiStep && goal.totalSteps > 1 && (
                <Typography
                  variant="body1"
                  color={getStepCounterColor()}
                  mr={1}
                  onClick={() => {
                    onIncrementStep?.(goal.id);
                  }}
                >
                  {goal.completedSteps}/{goal.totalSteps}
                </Typography>
              )}

              <Box position="relative">
                <CircularProgress
                  variant="determinate"
                  value={
                    !goal.isMultiStep || goal.totalSteps === 1
                      ? goal.completed
                        ? 100
                        : 0
                      : (goal.completedSteps / goal.totalSteps) * 100
                  }
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
                  onChange={
                    !goal.isMultiStep || goal.totalSteps === 1
                      ? handleToggle
                      : () => onIncrementStep?.(goal.id)
                  }
                  disabled={isReadOnly}
                  icon={<CheckSharp />}
                  size="medium"
                  checkedIcon={<CheckSharp />}
                  sx={{
                    color: "primary.main",
                    "&.Mui-checked": {
                      color: "white",
                      backgroundColor: "success.main",
                    },
                    transition: "all 0.3s ease-in-out",
                  }}
                />
              </Box>
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
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 250,
                    },
                  },
                }}
              >
                {goal.description && (
                  <Box>
                    <MenuItem
                      sx={{ color: "text.secondary", whiteSpace: "unset" }}
                    >
                      <InfoSharp sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        {goal.description}
                      </Typography>
                    </MenuItem>
                    <Divider />
                  </Box>
                )}
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
