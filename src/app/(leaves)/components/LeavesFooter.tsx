"use client";

import React from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { Home, Inventory } from "@mui/icons-material";
import { LeavesTab } from "../types";

interface LeavesFooterProps {
  activeTab: LeavesTab;
  onTabChange: (tab: LeavesTab) => void;
}

export const LeavesFooter: React.FC<LeavesFooterProps> = ({
  activeTab,
  onTabChange,
}) => {
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      onTabChange("places");
    } else if (newValue === 1) {
      onTabChange("things");
    }
  };

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={activeTab === "places" ? 0 : 1}
        onChange={handleChange}
      >
        <BottomNavigationAction
          label="Places"
          icon={<Home />}
          sx={{
            "&.Mui-selected": {
              color: "primary.main",
            },
          }}
        />
        <BottomNavigationAction
          label="Things"
          icon={<Inventory />}
          sx={{
            "&.Mui-selected": {
              color: "primary.main",
            },
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};
