"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Paper,
} from "@mui/material";
import {
  Edit,
  Delete,
  FilterList,
  Search,
  Clear,
  Add,
} from "@mui/icons-material";
import { CreateItemData, Item, ItemFilters } from "../types";
import { useInventory } from "../hooks/useInventory";
import { ItemForm } from "./ItemForm";

interface InventoryListProps {
  locationId?: string;
  showAddButton?: boolean;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  locationId,
  showAddButton = true,
}) => {
  const {
    filteredItems,
    locations,
    categories,
    getSubcategories,
    setFilters,
    clearFilters,
    deleteItem,
    addItem,
  } = useInventory();

  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [localFilters, setLocalFilters] = useState<ItemFilters>({
    categoryId: "",
    subcategoryId: "",
    condition: "",
  });

  // Filter items based on location if specified
  const displayItems = locationId
    ? filteredItems.filter((item) => item.locationId === locationId)
    : filteredItems;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...localFilters, searchTerm: value || undefined });
  };

  const handleFilterChange = (field: keyof ItemFilters, value: string) => {
    const newFilters = { ...localFilters, [field]: value || undefined };
    setLocalFilters(newFilters);
    setFilters({ ...newFilters, searchTerm: searchTerm || undefined });
  };

  const handleClearFilters = () => {
    setLocalFilters({ categoryId: "", subcategoryId: "", condition: "" });
    setSearchTerm("");
    clearFilters();
  };

  const handleDeleteItem = async (item: Item) => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await deleteItem(item.id);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
  };

  const handleAddItem = async (data: CreateItemData) => {
    try {
      await addItem(data);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleUpdateItem = async (data: CreateItemData) => {
    try {
      // This would be implemented in the hook
      console.log("Update item:", data);
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  const getLocationName = (locationId: string) => {
    return (
      locations.find((loc) => loc.id === locationId)?.name || "Unknown Location"
    );
  };

  const getCategoryName = (categoryId: string) => {
    return (
      categories.find((cat) => cat.id === categoryId)?.name ||
      "Unknown Category"
    );
  };

  const getSubcategoryName = (subcategoryId: string) => {
    return categories.find((cat) => cat.id === subcategoryId)?.name || "";
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      new: "success",
      like_new: "info",
      good: "primary",
      fair: "warning",
      poor: "error",
    } as const;
    return colors[condition as keyof typeof colors] || "default";
  };

  return (
    <Box>
      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "text.secondary" }} />
                ),
                endAdornment: searchTerm && (
                  <IconButton
                    size="small"
                    onClick={() => handleSearchChange("")}
                  >
                    <Clear />
                  </IconButton>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
              >
                Clear
              </Button>
              {showAddButton && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowAddForm(true)}
                >
                  Add Item
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Filter Options */}
        {showFilters && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={localFilters.categoryId || ""}
                    onChange={(e) =>
                      handleFilterChange("categoryId", e.target.value)
                    }
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories
                      .filter((cat) => !cat.parentId)
                      .map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {localFilters.categoryId && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Subcategory</InputLabel>
                    <Select
                      value={localFilters.subcategoryId || ""}
                      onChange={(e) =>
                        handleFilterChange("subcategoryId", e.target.value)
                      }
                    >
                      <MenuItem value="">All Subcategories</MenuItem>
                      {getSubcategories(localFilters.categoryId).map(
                        (subcategory) => (
                          <MenuItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={localFilters.condition || ""}
                    onChange={(e) =>
                      handleFilterChange("condition", e.target.value)
                    }
                  >
                    <MenuItem value="">All Conditions</MenuItem>
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="like_new">Like New</MenuItem>
                    <MenuItem value="good">Good</MenuItem>
                    <MenuItem value="fair">Fair</MenuItem>
                    <MenuItem value="poor">Poor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Items Grid */}
      <Grid container spacing={2}>
        {displayItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              {item.imageUrl && (
                <CardMedia
                  component="img"
                  height="200"
                  image={item.imageUrl}
                  alt={item.title}
                  sx={{ objectFit: "cover" }}
                />
              )}

              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  {item.title}
                </Typography>

                {item.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {item.description}
                  </Typography>
                )}

                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={getConditionColor(item.condition)}
                    color={getConditionColor(item.condition)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`Qty: ${item.quantity}`}
                    variant="outlined"
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  <strong>Location:</strong> {getLocationName(item.locationId)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>Category:</strong> {getCategoryName(item.categoryId)}
                  {item.subcategoryId &&
                    ` > ${getSubcategoryName(item.subcategoryId)}`}
                </Typography>

                {item.purchasePrice && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Price:</strong> ${item.purchasePrice.toFixed(2)}
                  </Typography>
                )}
              </CardContent>

              <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
                <IconButton
                  size="small"
                  onClick={() => handleEditItem(item)}
                  color="primary"
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteItem(item)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {displayItems.length === 0 && (
        <Box textAlign="center" sx={{ py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {showAddButton
              ? "Add your first item to get started!"
              : "Try adjusting your filters."}
          </Typography>
        </Box>
      )}

      {/* Add Item Dialog */}
      <ItemForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={handleAddItem}
        title="Add New Item"
      />

      {/* Edit Item Dialog */}
      {editingItem && (
        <ItemForm
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdateItem}
          initialData={editingItem}
          title="Edit Item"
        />
      )}
    </Box>
  );
};
