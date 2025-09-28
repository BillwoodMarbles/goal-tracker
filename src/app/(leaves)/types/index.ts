// Base entity with common fields for database migration
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Location entity
export interface Location extends BaseEntity {
  name: string;
  description?: string;
  address?: string;
  type: "home" | "office" | "storage" | "other";
}

// Category entity
export interface Category extends BaseEntity {
  name: string;
  description?: string;
  parentId?: string; // For subcategories
  color?: string; // For UI theming
}

// Item entity
export interface Item extends BaseEntity {
  title: string;
  description?: string;
  imageUrl?: string;
  locationId: string;
  categoryId: string;
  subcategoryId?: string;
  quantity: number;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  purchaseDate?: Date;
  purchasePrice?: number;
  notes?: string;
}

// Form data types for creating/editing
export interface CreateLocationData {
  name: string;
  description?: string;
  address?: string;
  type: "home" | "office" | "storage" | "other";
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
}

export interface CreateItemData {
  title: string;
  description?: string;
  imageUrl?: string;
  locationId: string;
  categoryId: string;
  subcategoryId?: string;
  quantity: number;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  purchaseDate?: Date;
  purchasePrice?: number;
  notes?: string;
}

// Filter types
export interface ItemFilters {
  categoryId?: string;
  subcategoryId?: string;
  locationId?: string;
  condition?: string;
  searchTerm?: string;
}

// UI state types
export interface InventoryState {
  items: Item[];
  locations: Location[];
  categories: Category[];
  selectedLocation?: Location;
  filters: ItemFilters;
}

// Navigation types
export type LeavesTab = "places" | "things";
