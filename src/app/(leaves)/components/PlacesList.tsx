"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  Home,
  Business,
  Storage,
  LocationOn,
  ArrowBack,
} from "@mui/icons-material";
import { Location, CreateLocationData } from "../types";
import { useInventory } from "../hooks/useInventory";
import { InventoryList } from "./InventoryList";

interface PlacesListProps {
  onLocationSelect?: (location: Location) => void;
  selectedLocation?: Location;
  onBack?: () => void;
}

export const PlacesList: React.FC<PlacesListProps> = ({
  onLocationSelect,
  selectedLocation,
  onBack,
}) => {
  const {
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    getItemsByLocation,
  } = useInventory();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationData, setNewLocationData] = useState<CreateLocationData>({
    name: "",
    description: "",
    type: "home",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home />;
      case "office":
        return <Business />;
      case "storage":
        return <Storage />;
      default:
        return <LocationOn />;
    }
  };

  const getLocationTypeColor = (type: string) => {
    const colors = {
      home: "primary",
      office: "secondary",
      storage: "warning",
      other: "default",
    } as const;
    return colors[type as keyof typeof colors] || "default";
  };

  const handleAddLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      await addLocation(newLocationData);
      setShowAddForm(false);
      setNewLocationData({ name: "", description: "", type: "home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;

    try {
      setLoading(true);
      setError(null);
      await updateLocation(editingLocation.id, {
        name: editingLocation.name,
        description: editingLocation.description,
        type: editingLocation.type,
      });
      setEditingLocation(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update location"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    const itemCount = getItemsByLocation(location.id).length;
    const message =
      itemCount > 0
        ? `Are you sure you want to delete "${location.name}"? This will also delete ${itemCount} items in this location.`
        : `Are you sure you want to delete "${location.name}"?`;

    if (window.confirm(message)) {
      try {
        await deleteLocation(location.id);
      } catch (error) {
        console.error("Failed to delete location:", error);
      }
    }
  };

  const handleLocationClick = (location: Location) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  // If a location is selected, show the items in that location
  if (selectedLocation) {
    return (
      <Box>
        {/* Location Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            {onBack && (
              <IconButton onClick={onBack}>
                <ArrowBack />
              </IconButton>
            )}
            <Box>
              <Typography variant="h5" component="h1">
                {selectedLocation.name}
              </Typography>
              {selectedLocation.description && (
                <Typography variant="body2" color="text.secondary">
                  {selectedLocation.description}
                </Typography>
              )}
              <Chip
                icon={getLocationIcon(selectedLocation.type)}
                label={selectedLocation.type}
                color={getLocationTypeColor(selectedLocation.type)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Items in this location */}
        <InventoryList locationId={selectedLocation.id} showAddButton={true} />
      </Box>
    );
  }

  // Show list of all locations
  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h1">
            Places
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddForm(true)}
          >
            Add Place
          </Button>
        </Box>
      </Paper>

      {/* Locations Grid */}
      <Grid container spacing={2}>
        {locations.map((location) => {
          const itemCount = getItemsByLocation(location.id).length;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={location.id}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  "&:hover": { boxShadow: 4 },
                }}
                onClick={() => handleLocationClick(location)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    {getLocationIcon(location.type)}
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="h3">
                        {location.name}
                      </Typography>
                      <Chip
                        label={location.type}
                        color={getLocationTypeColor(location.type)}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLocation(location);
                        }}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(location);
                        }}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>

                  {location.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {location.description}
                    </Typography>
                  )}

                  <Typography variant="body2" color="text.secondary">
                    <strong>{itemCount}</strong>{" "}
                    {itemCount === 1 ? "item" : "items"}
                  </Typography>

                  {location.address && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {location.address}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {locations.length === 0 && (
        <Box textAlign="center" sx={{ py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No places found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your first place to get started!
          </Typography>
        </Box>
      )}

      {/* Add Location Dialog */}
      <Dialog
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Place</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Place Name"
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
                multiline
                rows={2}
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
          <Button onClick={() => setShowAddForm(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLocation}
            variant="contained"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Place"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      {editingLocation && (
        <Dialog
          open={!!editingLocation}
          onClose={() => setEditingLocation(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Place</DialogTitle>
          <DialogContent>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Place Name"
                  value={editingLocation.name}
                  onChange={(e) =>
                    setEditingLocation((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editingLocation.description || ""}
                  onChange={(e) =>
                    setEditingLocation((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editingLocation.type}
                    onChange={(e) =>
                      setEditingLocation((prev) =>
                        prev
                          ? {
                              ...prev,
                              type: e.target.value as
                                | "home"
                                | "office"
                                | "storage"
                                | "other",
                            }
                          : null
                      )
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
            <Button onClick={() => setEditingLocation(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLocation}
              variant="contained"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Place"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
