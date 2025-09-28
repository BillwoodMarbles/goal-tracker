"use client";

import React, { useState } from "react";
import { AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import { ItemForm } from "./ItemForm";
import { useInventory } from "../hooks/useInventory";
import { CreateItemData } from "../types";

export const LeavesHeader: React.FC = () => {
  const { addItem } = useInventory();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddClick = () => {
    setShowAddForm(true);
  };

  const handleAddItem = async (data: CreateItemData) => {
    try {
      await addItem(data);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: "white",
        boxShadow: "none",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          Leaves
        </Typography>

        <IconButton
          color="primary"
          onClick={handleAddClick}
          aria-label="add item"
          sx={{
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
            mr: -1,
          }}
        >
          <AddCircleOutline sx={{ fontSize: 32 }} />
        </IconButton>
      </Toolbar>

      {/* Add Item Dialog */}
      <ItemForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleAddItem}
        title="Add New Item"
      />
    </AppBar>
  );
};
