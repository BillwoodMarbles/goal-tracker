import { useState, useEffect, useCallback } from "react";
import {
  Location,
  CreateItemData,
  CreateLocationData,
  CreateCategoryData,
  ItemFilters,
  InventoryState,
} from "../types";
import InventoryStorageService from "../services/inventoryStorageService";

export const useInventory = () => {
  const [state, setState] = useState<InventoryState>({
    items: [],
    locations: [],
    categories: [],
    filters: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageService = InventoryStorageService.getInstance();

  // Load all data on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [items, locations, categories] = await Promise.all([
        storageService.getItems(),
        storageService.getLocations(),
        storageService.getCategories(),
      ]);

      setState((prev) => ({
        ...prev,
        items,
        locations,
        categories,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [storageService]);

  // Location methods
  const addLocation = useCallback(
    async (locationData: CreateLocationData) => {
      try {
        setError(null);
        const newLocation = await storageService.addLocation(locationData);
        setState((prev) => ({
          ...prev,
          locations: [...prev.locations, newLocation],
        }));
        return newLocation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add location";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const updateLocation = useCallback(
    async (id: string, updates: Partial<CreateLocationData>) => {
      try {
        setError(null);
        const updatedLocation = await storageService.updateLocation(
          id,
          updates
        );
        setState((prev) => ({
          ...prev,
          locations: prev.locations.map((loc) =>
            loc.id === id ? updatedLocation : loc
          ),
        }));
        return updatedLocation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update location";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await storageService.deleteLocation(id);
        setState((prev) => ({
          ...prev,
          locations: prev.locations.filter((loc) => loc.id !== id),
          items: prev.items.filter((item) => item.locationId !== id),
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete location";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  // Category methods
  const addCategory = useCallback(
    async (categoryData: CreateCategoryData) => {
      try {
        setError(null);
        const newCategory = await storageService.addCategory(categoryData);
        setState((prev) => ({
          ...prev,
          categories: [...prev.categories, newCategory],
        }));
        return newCategory;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add category";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<CreateCategoryData>) => {
      try {
        setError(null);
        const updatedCategory = await storageService.updateCategory(
          id,
          updates
        );
        setState((prev) => ({
          ...prev,
          categories: prev.categories.map((cat) =>
            cat.id === id ? updatedCategory : cat
          ),
        }));
        return updatedCategory;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update category";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await storageService.deleteCategory(id);
        setState((prev) => ({
          ...prev,
          categories: prev.categories.filter((cat) => cat.id !== id),
          items: prev.items.filter(
            (item) => item.categoryId !== id && item.subcategoryId !== id
          ),
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete category";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  // Item methods
  const addItem = useCallback(
    async (itemData: CreateItemData) => {
      try {
        setError(null);
        const newItem = await storageService.addItem(itemData);
        setState((prev) => ({
          ...prev,
          items: [...prev.items, newItem],
        }));
        return newItem;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add item";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<CreateItemData>) => {
      try {
        setError(null);
        const updatedItem = await storageService.updateItem(id, updates);
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? updatedItem : item
          ),
        }));
        return updatedItem;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update item";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await storageService.deleteItem(id);
        setState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete item";
        setError(errorMessage);
        throw err;
      }
    },
    [storageService]
  );

  // Filter methods
  const setFilters = useCallback((filters: ItemFilters) => {
    setState((prev) => ({ ...prev, filters }));
  }, []);

  const clearFilters = useCallback(() => {
    setState((prev) => ({ ...prev, filters: {} }));
  }, []);

  const setSelectedLocation = useCallback((location: Location | undefined) => {
    setState((prev) => ({ ...prev, selectedLocation: location }));
  }, []);

  // Get filtered items
  const getFilteredItems = useCallback(() => {
    return state.items.filter((item) => {
      const { filters } = state;
      if (filters.categoryId && item.categoryId !== filters.categoryId)
        return false;
      if (filters.subcategoryId && item.subcategoryId !== filters.subcategoryId)
        return false;
      if (filters.locationId && item.locationId !== filters.locationId)
        return false;
      if (filters.condition && item.condition !== filters.condition)
        return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [state.items, state.filters]);

  // Get subcategories for a parent category
  const getSubcategories = useCallback(
    (parentId: string) => {
      return state.categories.filter((cat) => cat.parentId === parentId);
    },
    [state.categories]
  );

  // Get items for a specific location
  const getItemsByLocation = useCallback(
    (locationId: string) => {
      return state.items.filter((item) => item.locationId === locationId);
    },
    [state.items]
  );

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    ...state,
    loading,
    error,

    // Computed values
    filteredItems: getFilteredItems(),

    // Actions
    addLocation,
    updateLocation,
    deleteLocation,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    setFilters,
    clearFilters,
    setSelectedLocation,
    getSubcategories,
    getItemsByLocation,
    loadData,
  };
};
