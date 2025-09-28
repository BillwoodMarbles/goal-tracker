import {
  Item,
  Location,
  Category,
  CreateItemData,
  CreateLocationData,
  CreateCategoryData,
  ItemFilters,
} from "../types";

class InventoryStorageService {
  private static instance: InventoryStorageService;
  private readonly STORAGE_KEYS = {
    ITEMS: "leaves_inventory_items",
    LOCATIONS: "leaves_inventory_locations",
    CATEGORIES: "leaves_inventory_categories",
  };

  private constructor() {}

  public static getInstance(): InventoryStorageService {
    if (!InventoryStorageService.instance) {
      InventoryStorageService.instance = new InventoryStorageService();
    }
    return InventoryStorageService.instance;
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentTimestamp(): Date {
    return new Date();
  }

  // Location methods
  public async getLocations(): Promise<Location[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.LOCATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting locations:", error);
      return [];
    }
  }

  public async addLocation(
    locationData: CreateLocationData
  ): Promise<Location> {
    try {
      const locations = await this.getLocations();
      const newLocation: Location = {
        id: this.generateId(),
        ...locationData,
        createdAt: this.getCurrentTimestamp(),
        updatedAt: this.getCurrentTimestamp(),
      };

      locations.push(newLocation);
      localStorage.setItem(
        this.STORAGE_KEYS.LOCATIONS,
        JSON.stringify(locations)
      );
      return newLocation;
    } catch (error) {
      console.error("Error adding location:", error);
      throw error;
    }
  }

  public async updateLocation(
    id: string,
    updates: Partial<CreateLocationData>
  ): Promise<Location> {
    try {
      const locations = await this.getLocations();
      const index = locations.findIndex((loc) => loc.id === id);

      if (index === -1) {
        throw new Error("Location not found");
      }

      locations[index] = {
        ...locations[index],
        ...updates,
        updatedAt: this.getCurrentTimestamp(),
      };

      localStorage.setItem(
        this.STORAGE_KEYS.LOCATIONS,
        JSON.stringify(locations)
      );
      return locations[index];
    } catch (error) {
      console.error("Error updating location:", error);
      throw error;
    }
  }

  public async deleteLocation(id: string): Promise<void> {
    try {
      const locations = await this.getLocations();
      const filteredLocations = locations.filter((loc) => loc.id !== id);
      localStorage.setItem(
        this.STORAGE_KEYS.LOCATIONS,
        JSON.stringify(filteredLocations)
      );
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  }

  // Category methods
  public async getCategories(): Promise<Category[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  public async addCategory(
    categoryData: CreateCategoryData
  ): Promise<Category> {
    try {
      const categories = await this.getCategories();
      const newCategory: Category = {
        id: this.generateId(),
        ...categoryData,
        createdAt: this.getCurrentTimestamp(),
        updatedAt: this.getCurrentTimestamp(),
      };

      categories.push(newCategory);
      localStorage.setItem(
        this.STORAGE_KEYS.CATEGORIES,
        JSON.stringify(categories)
      );
      return newCategory;
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  }

  public async updateCategory(
    id: string,
    updates: Partial<CreateCategoryData>
  ): Promise<Category> {
    try {
      const categories = await this.getCategories();
      const index = categories.findIndex((cat) => cat.id === id);

      if (index === -1) {
        throw new Error("Category not found");
      }

      categories[index] = {
        ...categories[index],
        ...updates,
        updatedAt: this.getCurrentTimestamp(),
      };

      localStorage.setItem(
        this.STORAGE_KEYS.CATEGORIES,
        JSON.stringify(categories)
      );
      return categories[index];
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }

  public async deleteCategory(id: string): Promise<void> {
    try {
      const categories = await this.getCategories();
      const filteredCategories = categories.filter((cat) => cat.id !== id);
      localStorage.setItem(
        this.STORAGE_KEYS.CATEGORIES,
        JSON.stringify(filteredCategories)
      );
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  }

  // Item methods
  public async getItems(): Promise<Item[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting items:", error);
      return [];
    }
  }

  public async getItemsByFilters(filters: ItemFilters): Promise<Item[]> {
    try {
      const items = await this.getItems();
      return items.filter((item) => {
        if (filters.categoryId && item.categoryId !== filters.categoryId)
          return false;
        if (
          filters.subcategoryId &&
          item.subcategoryId !== filters.subcategoryId
        )
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
    } catch (error) {
      console.error("Error filtering items:", error);
      return [];
    }
  }

  public async addItem(itemData: CreateItemData): Promise<Item> {
    try {
      const items = await this.getItems();
      const newItem: Item = {
        id: this.generateId(),
        ...itemData,
        createdAt: this.getCurrentTimestamp(),
        updatedAt: this.getCurrentTimestamp(),
      };

      items.push(newItem);
      localStorage.setItem(this.STORAGE_KEYS.ITEMS, JSON.stringify(items));
      return newItem;
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
    }
  }

  public async updateItem(
    id: string,
    updates: Partial<CreateItemData>
  ): Promise<Item> {
    try {
      const items = await this.getItems();
      const index = items.findIndex((item) => item.id === id);

      if (index === -1) {
        throw new Error("Item not found");
      }

      items[index] = {
        ...items[index],
        ...updates,
        updatedAt: this.getCurrentTimestamp(),
      };

      localStorage.setItem(this.STORAGE_KEYS.ITEMS, JSON.stringify(items));
      return items[index];
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  }

  public async deleteItem(id: string): Promise<void> {
    try {
      const items = await this.getItems();
      const filteredItems = items.filter((item) => item.id !== id);
      localStorage.setItem(
        this.STORAGE_KEYS.ITEMS,
        JSON.stringify(filteredItems)
      );
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  }

  // Utility methods for getting related data
  public async getLocationById(id: string): Promise<Location | null> {
    const locations = await this.getLocations();
    return locations.find((loc) => loc.id === id) || null;
  }

  public async getCategoryById(id: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.id === id) || null;
  }

  public async getSubcategories(parentId: string): Promise<Category[]> {
    const categories = await this.getCategories();
    return categories.filter((cat) => cat.parentId === parentId);
  }

  // Clear all data (useful for testing or reset)
  public async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.ITEMS);
      localStorage.removeItem(this.STORAGE_KEYS.LOCATIONS);
      localStorage.removeItem(this.STORAGE_KEYS.CATEGORIES);
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }
}

export default InventoryStorageService;
