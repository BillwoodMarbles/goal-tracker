import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { GoalsData } from "../goals/types";

export interface DynamoDBConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  tableName: string;
}

export interface UserGoalsData {
  userId: string;
  goalsData: GoalsData;
  lastUpdated: string;
  version: number;
}

export class DynamoDBService {
  private static instance: DynamoDBService;
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private isOnline: boolean = true;

  private constructor(config: DynamoDBConfig) {
    const dynamoClient = new DynamoDBClient({
      region: config.region,
      ...(config.accessKeyId &&
        config.secretAccessKey && {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }),
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = config.tableName;
  }

  static getInstance(config?: DynamoDBConfig): DynamoDBService {
    if (!DynamoDBService.instance && config) {
      DynamoDBService.instance = new DynamoDBService(config);
    }
    return DynamoDBService.instance;
  }

  // Initialize the service with configuration
  static initialize(config: DynamoDBConfig): DynamoDBService {
    return DynamoDBService.getInstance(config);
  }

  // Check if service is online
  async checkConnection(): Promise<boolean> {
    try {
      // Simple health check - try to describe the table
      await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { userId: "health-check" },
        })
      );
      this.isOnline = true;
      return true;
    } catch (error) {
      console.warn("DynamoDB connection failed:", error);
      this.isOnline = false;
      return false;
    }
  }

  // Save user goals data to DynamoDB
  async saveUserGoals(userId: string, goalsData: GoalsData): Promise<boolean> {
    if (!this.isOnline) {
      console.warn("DynamoDB offline, skipping save");
      return false;
    }

    try {
      const userGoalsData: UserGoalsData = {
        userId,
        goalsData,
        lastUpdated: new Date().toISOString(),
        version: Date.now(), // Simple versioning
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: userGoalsData,
        })
      );

      console.log("Goals data saved to DynamoDB for user:", userId);
      return true;
    } catch (error) {
      console.error("Error saving goals data to DynamoDB:", error);
      this.isOnline = false;
      return false;
    }
  }

  // Load user goals data from DynamoDB
  async loadUserGoals(userId: string): Promise<GoalsData | null> {
    if (!this.isOnline) {
      console.warn("DynamoDB offline, cannot load data");
      return null;
    }

    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { userId },
        })
      );

      if (result.Item) {
        const userGoalsData = result.Item as UserGoalsData;
        console.log("Goals data loaded from DynamoDB for user:", userId);
        return userGoalsData.goalsData;
      }

      return null;
    } catch (error) {
      console.error("Error loading goals data from DynamoDB:", error);
      this.isOnline = false;
      return null;
    }
  }

  // Update user goals data (optimistic locking)
  async updateUserGoals(
    userId: string,
    goalsData: GoalsData,
    expectedVersion?: number
  ): Promise<boolean> {
    if (!this.isOnline) {
      console.warn("DynamoDB offline, skipping update");
      return false;
    }

    try {
      const updateExpression =
        "SET goalsData = :goalsData, lastUpdated = :lastUpdated, version = :version";
      const expressionAttributeValues: Record<
        string,
        GoalsData | string | number
      > = {
        ":goalsData": goalsData,
        ":lastUpdated": new Date().toISOString(),
        ":version": Date.now(),
      };

      const updateParams: UpdateCommandInput = {
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      // Add conditional update if version is provided
      if (expectedVersion !== undefined) {
        updateParams.ConditionExpression = "version = :expectedVersion";
        updateParams.ExpressionAttributeValues![":expectedVersion"] =
          expectedVersion;
      }

      await this.client.send(new UpdateCommand(updateParams));
      console.log("Goals data updated in DynamoDB for user:", userId);
      return true;
    } catch (error) {
      console.error("Error updating goals data in DynamoDB:", error);
      this.isOnline = false;
      return false;
    }
  }

  // Delete user goals data
  async deleteUserGoals(userId: string): Promise<boolean> {
    if (!this.isOnline) {
      console.warn("DynamoDB offline, skipping delete");
      return false;
    }

    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { userId },
        })
      );

      console.log("Goals data deleted from DynamoDB for user:", userId);
      return true;
    } catch (error) {
      console.error("Error deleting goals data from DynamoDB:", error);
      this.isOnline = false;
      return false;
    }
  }

  // Get online status
  isServiceOnline(): boolean {
    return this.isOnline;
  }

  // Force reconnect
  async reconnect(): Promise<boolean> {
    return await this.checkConnection();
  }
}
