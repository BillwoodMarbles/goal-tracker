import { DynamoDBConfig } from "../services/dynamoDBService";
import { HybridStorageService } from "../services/hybridStorageService";

// DynamoDB configuration
export const dynamoDBConfig: DynamoDBConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  tableName: process.env.NEXT_PUBLIC_DYNAMODB_TABLE_NAME || "root-goals-data",
};

// Environment check
export const isDynamoDBConfigured = (): boolean => {
  return !!(
    dynamoDBConfig.region &&
    dynamoDBConfig.accessKeyId &&
    dynamoDBConfig.secretAccessKey &&
    dynamoDBConfig.tableName
  );
};

// Initialize DynamoDB if configured
export const initializeDynamoDB = () => {
  if (isDynamoDBConfigured()) {
    const hybridStorageService = HybridStorageService.getInstance();
    hybridStorageService.initializeDynamoDB(dynamoDBConfig);

    // Make it globally available for LocalStorageService
    (
      globalThis as { hybridStorageService?: typeof hybridStorageService }
    ).hybridStorageService = hybridStorageService;

    console.log("DynamoDB initialized successfully");
    return true;
  } else {
    console.warn("DynamoDB not configured. Using local storage only.");
    return false;
  }
};
