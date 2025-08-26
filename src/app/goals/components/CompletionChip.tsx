"use client";

import React from "react";
import { Chip } from "@mui/material";

interface CompletionChipProps {
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
  size?: "small" | "medium";
  variant?: "filled" | "outlined";
}

export const CompletionChip: React.FC<CompletionChipProps> = ({
  completionStats,
  size = "small",
  variant,
}) => {
  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return "success";
    // if (percentage >= 75) return "info";
    // if (percentage >= 50) return "warning";
    if (percentage > 0) return "info";
    return "default";
  };

  const getCompletionText = (stats: typeof completionStats) => {
    if (stats.total === 0) return "No goals";
    return `${stats.completed}/${stats.total}`;
  };

  // Don't render if no goals
  if (completionStats.total === 0) {
    return null;
  }

  // Determine variant based on completion percentage if not specified
  const chipVariant =
    variant || (completionStats.percentage === 100 ? "filled" : "outlined");

  return (
    <Chip
      label={getCompletionText(completionStats)}
      color={getCompletionColor(completionStats.percentage)}
      variant={chipVariant}
      size={size}
    />
  );
};
