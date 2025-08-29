"use client";

import { useEffect } from "react";
import { initializeDynamoDB } from "../config/dynamoDB";

export const DynamoDBInitializer: React.FC = () => {
  useEffect(() => {
    // Initialize DynamoDB on client side
    initializeDynamoDB();
  }, []);

  return null; // This component doesn't render anything
};
