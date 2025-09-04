"use client";

import React from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import {
  Flag as FlagIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";

export const AppFooter: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue === "day") {
      router.push("/");
    } else if (newValue === "week") {
      router.push("/week");
    }
  };

  return (
    <Paper
      sx={{
        borderTop: 1,
        borderColor: "divider",
      }}
      elevation={3}
    >
      <BottomNavigation
        value={pathname === "/" ? "day" : pathname === "/week" ? "week" : "day"}
        onChange={handleNavigation}
        showLabels
        sx={{
          paddingBottom: "env(safe-area-inset-bottom)",
          minHeight: 80,
        }}
      >
        <BottomNavigationAction
          label="Day View"
          value="day"
          icon={<FlagIcon />}
        />
        <BottomNavigationAction
          label="Week View"
          value="week"
          icon={<BarChartIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};
