import { LocalStorageService } from "../(root)/goals/services/localStorageService";
import { DynamoDBService, DynamoDBConfig } from "./dynamoDBService";
import { UserService } from "./userService";
import { GoalsData } from "../(root)/goals/types";

export interface SyncStatus {
  lastSync: string;
  isOnline: boolean;
  pendingChanges: boolean;
}

export class HybridStorageService {
  private static instance: HybridStorageService;
  private localStorageService: LocalStorageService;
  private dynamoDBService: DynamoDBService | null = null;
  private userService: UserService;
  private syncStatus: SyncStatus = {
    lastSync: "",
    isOnline: false,
    pendingChanges: false,
  };

  private constructor() {
    this.localStorageService = LocalStorageService.getInstance();
    this.userService = UserService.getInstance();
  }

  static getInstance(): HybridStorageService {
    if (!HybridStorageService.instance) {
      HybridStorageService.instance = new HybridStorageService();
    }
    return HybridStorageService.instance;
  }

  // Initialize DynamoDB service
  initializeDynamoDB(config: DynamoDBConfig): void {
    this.dynamoDBService = DynamoDBService.initialize(config);
  }

  // Get current user
  getCurrentUser() {
    return this.userService.initializeUser();
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Load data with fallback strategy
  async loadData(): Promise<GoalsData> {
    const user = this.getCurrentUser();

    // First, try to load from DynamoDB
    if (this.dynamoDBService && this.dynamoDBService.isServiceOnline()) {
      try {
        const dynamoData = await this.dynamoDBService.loadUserGoals(user.id);
        if (dynamoData) {
          // Update local storage with DynamoDB data
          this.localStorageService.saveGoalsData(dynamoData);
          this.syncStatus.lastSync = new Date().toISOString();
          this.syncStatus.isOnline = true;
          this.syncStatus.pendingChanges = false;
          return dynamoData;
        }
      } catch (error) {
        console.warn(
          "Failed to load from DynamoDB, falling back to local storage:",
          error
        );
      }
    }

    // Fallback to local storage
    this.syncStatus.isOnline = false;
    return this.localStorageService.getGoalsData();
  }

  // Save data with dual-write strategy
  async saveData(data: GoalsData): Promise<boolean> {
    const user = this.getCurrentUser();

    // Always save to local storage first (for immediate availability)
    this.localStorageService.saveGoalsData(data);

    // Try to save to DynamoDB
    if (this.dynamoDBService && this.dynamoDBService.isServiceOnline()) {
      try {
        const success = await this.dynamoDBService.saveUserGoals(user.id, data);
        if (success) {
          this.syncStatus.lastSync = new Date().toISOString();
          this.syncStatus.isOnline = true;
          this.syncStatus.pendingChanges = false;
          return true;
        } else {
          this.syncStatus.pendingChanges = true;
          this.syncStatus.isOnline = false;
        }
      } catch (error) {
        console.warn("Failed to save to DynamoDB:", error);
        this.syncStatus.pendingChanges = true;
        this.syncStatus.isOnline = false;
      }
    } else {
      this.syncStatus.pendingChanges = true;
      this.syncStatus.isOnline = false;
    }

    // Return true if local storage save was successful
    return true;
  }

  // Sync pending changes
  async syncPendingChanges(): Promise<boolean> {
    if (!this.syncStatus.pendingChanges || !this.dynamoDBService) {
      return true;
    }

    const user = this.getCurrentUser();
    const localData = this.localStorageService.getGoalsData();

    try {
      const success = await this.dynamoDBService.saveUserGoals(
        user.id,
        localData
      );
      if (success) {
        this.syncStatus.lastSync = new Date().toISOString();
        this.syncStatus.isOnline = true;
        this.syncStatus.pendingChanges = false;
        return true;
      }
    } catch (error) {
      console.error("Failed to sync pending changes:", error);
    }

    return false;
  }

  // Switch user (load different user's data)
  async switchUser(userId: string): Promise<boolean> {
    if (!this.userService.isValidUserId(userId)) {
      return false;
    }

    // Save current data before switching
    await this.syncPendingChanges();

    // Set new user ID
    this.userService.setUserId(userId);

    // Load new user's data
    try {
      const newData = await this.loadData();
      // Clear current local storage and load new data
      this.localStorageService.clearAllData();
      this.localStorageService.saveGoalsData(newData);
      return true;
    } catch (error) {
      console.error("Failed to switch user:", error);
      return false;
    }
  }

  // Get local storage service (for backward compatibility)
  getLocalStorageService(): LocalStorageService {
    return this.localStorageService;
  }

  // Get DynamoDB service
  getDynamoDBService(): DynamoDBService | null {
    return this.dynamoDBService || null;
  }

  // Check online status
  async checkOnlineStatus(): Promise<boolean> {
    if (!this.dynamoDBService) {
      this.syncStatus.isOnline = false;
      return false;
    }

    const isOnline = await this.dynamoDBService.checkConnection();
    this.syncStatus.isOnline = isOnline;
    return isOnline;
  }

  // Force sync
  async forceSync(): Promise<boolean> {
    const user = this.getCurrentUser();
    const localData = this.localStorageService.getGoalsData();

    if (!this.dynamoDBService) {
      return false;
    }

    try {
      const success = await this.dynamoDBService.saveUserGoals(
        user.id,
        localData
      );
      if (success) {
        this.syncStatus.lastSync = new Date().toISOString();
        this.syncStatus.isOnline = true;
        this.syncStatus.pendingChanges = false;
      }
      return success;
    } catch (error) {
      console.error("Force sync failed:", error);
      return false;
    }
  }
}
