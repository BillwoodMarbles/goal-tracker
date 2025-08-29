import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  createdAt: string;
  lastActive: string;
}

const USER_ID_KEY = "root_user_id";
const USER_DATA_KEY = "root_user_data";

export class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private constructor() {}

  // Generate a new user ID
  generateUserId(): string {
    return uuidv4();
  }

  // Get or create user ID
  getUserId(): string {
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      userId = this.generateUserId();
      this.saveUserId(userId);
    }

    return userId;
  }

  // Save user ID to localStorage
  private saveUserId(userId: string): void {
    localStorage.setItem(USER_ID_KEY, userId);
  }

  // Set user ID (for when user enters an existing ID)
  setUserId(userId: string): void {
    this.saveUserId(userId);
  }

  // Get user data from localStorage
  getUserData(): User | null {
    const userData = localStorage.getItem(USER_DATA_KEY);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }

  // Save user data to localStorage
  saveUserData(user: User): void {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  // Initialize or update user
  initializeUser(): User {
    const existingUser = this.getUserData();
    const userId = this.getUserId();

    if (existingUser && existingUser.id === userId) {
      // Update last active time
      const updatedUser = {
        ...existingUser,
        lastActive: new Date().toISOString(),
      };
      this.saveUserData(updatedUser);
      return updatedUser;
    }

    // Create new user
    const newUser: User = {
      id: userId,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    this.saveUserData(newUser);
    return newUser;
  }

  // Validate user ID format
  isValidUserId(userId: string): boolean {
    // UUID v4 format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
  }

  // Clear user data (for testing/reset)
  clearUserData(): void {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  }
}
