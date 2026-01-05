"use client";

import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AccountCircle, Logout as LogoutIcon } from "@mui/icons-material";
import { useSupabaseAuth } from "../contexts/SupabaseAuthContext";

export const UserDropdown: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { signOut, user } = useSupabaseAuth();

  const handleUserIconClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await signOut();
    handleCloseMenu();
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
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        <MenuItem disabled>
          <ListItemText
            primary={user?.email || "User"}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </MenuItem>

        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </MenuItem>
      </Menu>
    </>
  );
};
