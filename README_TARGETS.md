# User Targets API Documentation

## Overview
This API allows you to manage monthly targets for users in the WorkTrack application. Users can view their targets on the home page, and admins can manage targets for all users.

## JSON Format for Excel Data Import

Based on your Excel file structure with columns:
- Field Engineer (Email)
- Target Sep'25
- Target Oct'25  
- Target Nov'25

### Required JSON Format for Bulk Import

```json
{
  "targetsData": [
    {
      "email": "user1@example.com",
      "september2025": 100,
      "october2025": 120,
      "november2025": 150
    },
    {
      "email": "user2@example.com", 
      "september2025": 80,
      "october2025": 90,
      "november2025": 110
    }
  ]
}
```

### Individual Target JSON Format

```json
{
  "email": "user@example.com",
  "month": "September",
  "year": 2025,
  "target": 100
}
```

## API Endpoints

### 1. Get Current User's Targets
**GET** `/api/user-targets/current`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Returns targets for the authenticated user

### 2. Get User Targets by Email (Admin)
**GET** `/api/user-targets/user?email=<email>`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `email` - User's email address
- **Response**: Returns targets for the specified user

### 3. Add/Update Target
**POST** `/api/user-targets/add`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**:
```json
{
  "email": "user@example.com",
  "month": "September",
  "year": 2025,
  "target": 100
}
```

### 4. Bulk Import Targets
**POST** `/api/user-targets/bulk-import`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: See JSON format above

### 5. Remove Target
**DELETE** `/api/user-targets/remove`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**:
```json
{
  "email": "user@example.com",
  "month": "September",
  "year": 2025
}
```

### 6. Get All User Targets (Admin)
**GET** `/api/user-targets/all`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Returns all user targets

## Database Schema

### UserTarget Model
```javascript
{
  user: ObjectId (ref: 'User'),
  targets: [{
    month: String (enum: months),
    year: Number,
    target: Number,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration

### Using the useUserTargets Hook
```javascript
import { useUserTargets } from '../hooks/useUserTargets';

const MyComponent = () => {
  const { getCurrentUserTargets, addOrUpdateTarget, error, isLoading } = useUserTargets();
  
  // Fetch current user's targets
  const fetchTargets = async () => {
    try {
      const response = await getCurrentUserTargets();
      console.log(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };
};
```

### UserTargets Component
The `UserTargets` component automatically displays the current user's targets on the home page. It shows:
- September 2025 target
- October 2025 target  
- November 2025 target
- Current month highlighting
- Target status (Set/Not Set)

## Example Usage

### 1. Import Excel Data
Convert your Excel data to the JSON format and use the bulk import endpoint:

```javascript
const targetsData = [
  {
    email: "john.doe@bluetown.com",
    september2025: 100,
    october2025: 120,
    november2025: 150
  },
  {
    email: "jane.smith@bluetown.com", 
    september2025: 80,
    october2025: 90,
    november2025: 110
  }
];

// POST to /api/user-targets/bulk-import
fetch('/api/user-targets/bulk-import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ targetsData })
});
```

### 2. Add Individual Target
```javascript
// Add a target for a specific user
fetch('/api/user-targets/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    email: "user@example.com",
    month: "September",
    year: 2025,
    target: 100
  })
});
```

## Error Handling
All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid token)
- `404` - Not Found (user not found)
- `500` - Internal Server Error

Error responses include a descriptive message:
```json
{
  "error": "User not found"
}
```

## Notes
- Targets are stored per user per month/year combination
- Duplicate targets for the same month/year will be updated
- The frontend automatically highlights the current month
- All target values should be positive numbers
- The system supports targets for any year, but the frontend currently displays 2025 targets
