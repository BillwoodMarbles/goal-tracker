# DynamoDB Setup Guide

This guide will help you set up DynamoDB integration for the Root goal tracker app.

## Prerequisites

1. AWS Account
2. AWS CLI configured (optional, for local development)
3. Node.js and npm installed

## Step 1: Create DynamoDB Table

1. Go to the AWS DynamoDB Console
2. Click "Create table"
3. Use the following settings:
   - **Table name**: `root-goals-data` (or your preferred name)
   - **Partition key**: `userId` (String)
   - **Table settings**: Default settings
   - **Capacity**: On-demand (recommended for simplicity)

## Step 2: Create IAM User (Optional but Recommended)

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach the following policy (create custom policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/root-goals-data"
    }
  ]
}
```

4. Note down the Access Key ID and Secret Access Key

## Step 3: Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_access_key
NEXT_PUBLIC_DYNAMODB_TABLE_NAME=root-goals-data
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Test the Setup

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. Check the browser console for DynamoDB initialization messages
4. The user ID should appear in the header with sync status indicators

## Features

### User ID System

- Each user gets a unique UUID automatically
- User ID is displayed in the header
- Users can copy their ID to clipboard
- Users can switch to different accounts by entering an ID

### Data Synchronization

- **Dual-write strategy**: Data is saved to both local storage and DynamoDB
- **Offline support**: App works offline with local storage fallback
- **Automatic sync**: Changes are automatically synced when online
- **Conflict resolution**: Simple timestamp-based versioning

### Sync Status Indicators

- **Green cloud**: Online and synced
- **Yellow sync icon**: Online with pending changes
- **Red cloud-off**: Offline (local storage only)

## Usage

### For New Users

1. App automatically generates a unique user ID
2. User can copy their ID from the header
3. Data is automatically synced to DynamoDB when online

### For Existing Users

1. Click the person icon in the header
2. Enter their user ID
3. App will load their data from DynamoDB

### Switching Browsers/Devices

1. Copy user ID from current device
2. Open app on new device
3. Enter user ID to load data

## Security Considerations

1. **Access Keys**: Store AWS credentials securely
2. **IAM Policies**: Use least-privilege access
3. **Environment Variables**: Never commit `.env.local` to version control
4. **User Data**: Each user's data is isolated by user ID

## Troubleshooting

### DynamoDB Not Connecting

- Check AWS credentials in environment variables
- Verify table name matches configuration
- Check AWS region settings
- Ensure IAM user has proper permissions

### Sync Issues

- Check browser console for error messages
- Verify internet connection
- Check DynamoDB table exists and is accessible

### User ID Issues

- Ensure user ID format is valid UUID
- Check if user data exists in DynamoDB
- Verify local storage is not corrupted

## Production Deployment

For production deployment:

1. Use environment variables in your hosting platform
2. Consider using AWS Cognito for more secure authentication
3. Implement proper error handling and retry logic
4. Monitor DynamoDB usage and costs
5. Consider implementing data backup strategies

## Cost Optimization

- Use on-demand capacity for small applications
- Monitor DynamoDB usage in AWS Console
- Consider implementing data retention policies
- Use DynamoDB Streams for advanced features (optional)
