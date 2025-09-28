"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  IconButton,
  Chip,
} from "@mui/material";
import { Close, Add, PhotoCamera } from "@mui/icons-material";
import {
  CreateItemData,
  CreateLocationData,
  CreateCategoryData,
} from "../types";
import { useInventory } from "../hooks/useInventory";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateItemData) => Promise<void>;
  initialData?: Partial<CreateItemData>;
  title?: string;
}

export const ItemForm: React.FC<ItemFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title = "Add New Item",
}) => {
  const { locations, categories, addLocation, addCategory, getSubcategories } =
    useInventory();

  const [formData, setFormData] = useState<CreateItemData>({
    title: "",
    description: "",
    imageUrl: "",
    locationId: "",
    categoryId: "",
    subcategoryId: "",
    quantity: 1,
    condition: "good",
    purchaseDate: undefined,
    purchasePrice: undefined,
    notes: "",
    ...initialData,
  });

  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newLocationData, setNewLocationData] = useState<CreateLocationData>({
    name: "",
    description: "",
    type: "home",
  });
  const [newCategoryData, setNewCategoryData] = useState<CreateCategoryData>({
    name: "",
    description: "",
    parentId: formData.categoryId || undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategories = getSubcategories(formData.categoryId);

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        locationId: "",
        categoryId: "",
        subcategoryId: "",
        quantity: 1,
        condition: "good",
        purchaseDate: undefined,
        purchasePrice: undefined,
        notes: "",
        ...initialData,
      });
      setError(null);
    }
  }, [open, initialData]);

  const handleInputChange = (
    field: keyof CreateItemData,
    value: string | number | Date | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear subcategory when category changes
    if (field === "categoryId") {
      setFormData((prev) => ({ ...prev, subcategoryId: "" }));
    }
  };

  const handleAddLocation = async () => {
    try {
      setLoading(true);
      const newLocation = await addLocation(newLocationData);
      setFormData((prev) => ({ ...prev, locationId: newLocation.id }));
      setShowNewLocation(false);
      setNewLocationData({ name: "", description: "", type: "home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      setLoading(true);
      const newCategory = await addCategory(newCategoryData);
      if (newCategoryData.parentId) {
        setFormData((prev) => ({ ...prev, subcategoryId: newCategory.id }));
      } else {
        setFormData((prev) => ({ ...prev, categoryId: newCategory.id }));
      }
      setShowNewCategory(false);
      setNewCategoryData({ name: "", description: "", parentId: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, we'll just store the file name
      // In a real app, you'd upload to a service and get a URL
      setFormData((prev) => ({ ...prev, imageUrl: file.name }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {title}
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Item Title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          {/* Image Upload */}
          <Grid size={{ xs: 12 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="image-upload"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                >
                  Upload Image
                </Button>
              </label>
              {formData.imageUrl && (
                <Chip
                  label={formData.imageUrl}
                  onDelete={() => handleInputChange("imageUrl", "")}
                />
              )}
            </Box>
          </Grid>

          {/* Location */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                value={formData.locationId}
                onChange={(e) =>
                  handleInputChange("locationId", e.target.value)
                }
                required
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setShowNewLocation(true)}
              sx={{ mt: 1 }}
            >
              Add Location
            </Button>
          </Grid>

          {/* Category */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.categoryId}
                onChange={(e) =>
                  handleInputChange("categoryId", e.target.value)
                }
                required
              >
                {categories
                  .filter((cat) => !cat.parentId)
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setShowNewCategory(true)}
              sx={{ mt: 1 }}
            >
              Add Category
            </Button>
          </Grid>

          {/* Subcategory */}
          {subcategories.length > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  value={formData.subcategoryId}
                  onChange={(e) =>
                    handleInputChange("subcategoryId", e.target.value)
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {subcategories.map((subcategory) => (
                    <MenuItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Quantity and Condition */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                handleInputChange("quantity", parseInt(e.target.value) || 1)
              }
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select
                value={formData.condition}
                onChange={(e) => handleInputChange("condition", e.target.value)}
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="like_new">Like New</MenuItem>
                <MenuItem value="good">Good</MenuItem>
                <MenuItem value="fair">Fair</MenuItem>
                <MenuItem value="poor">Poor</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Purchase Information */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Purchase Date"
              type="date"
              value={
                formData.purchaseDate
                  ? formData.purchaseDate.toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                handleInputChange(
                  "purchaseDate",
                  e.target.value ? new Date(e.target.value) : undefined
                )
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice || ""}
              onChange={(e) =>
                handleInputChange(
                  "purchasePrice",
                  parseFloat(e.target.value) || undefined
                )
              }
              inputProps={{ step: 0.01, min: 0 }}
            />
          </Grid>

          {/* Notes */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Saving..." : "Save Item"}
        </Button>
      </DialogActions>

      {/* New Location Dialog */}
      <Dialog open={showNewLocation} onClose={() => setShowNewLocation(false)}>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Location Name"
                value={newLocationData.name}
                onChange={(e) =>
                  setNewLocationData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                value={newLocationData.description}
                onChange={(e) =>
                  setNewLocationData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newLocationData.type}
                  onChange={(e) =>
                    setNewLocationData((prev) => ({
                      ...prev,
                      type: e.target.value as
                        | "home"
                        | "office"
                        | "storage"
                        | "other",
                    }))
                  }
                >
                  <MenuItem value="home">Home</MenuItem>
                  <MenuItem value="office">Office</MenuItem>
                  <MenuItem value="storage">Storage</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewLocation(false)}>Cancel</Button>
          <Button
            onClick={handleAddLocation}
            variant="contained"
            disabled={loading}
          >
            Add Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategory} onClose={() => setShowNewCategory(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Category Name"
                value={newCategoryData.name}
                onChange={(e) =>
                  setNewCategoryData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                value={newCategoryData.description}
                onChange={(e) =>
                  setNewCategoryData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            {formData.categoryId && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  This will be added as a subcategory of:{" "}
                  {categories.find((c) => c.id === formData.categoryId)?.name}
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewCategory(false)}>Cancel</Button>
          <Button
            onClick={handleAddCategory}
            variant="contained"
            disabled={loading}
          >
            Add Category
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
