# Excel Target Upload Feature

## Overview
The Excel Target Upload feature allows administrators to upload Excel files containing user targets and automatically import them into the system. Users can then view their targets on their home page.

## Features

### 🎯 **Admin Dashboard Integration**
- New "Target Management" tab in the admin dashboard
- Drag-and-drop Excel file upload
- Real-time data preview before upload
- Bulk import with error handling

### 📊 **Excel Format Support**
The system expects Excel files with the following structure:

| Field Engineer | Target Sep'25 | Target Oct'25 | Target Nov'25 |
|----------------|---------------|---------------|---------------|
| user@example.com | 100 | 120 | 150 |
| user2@example.com | 80 | 90 | 110 |

### 🔧 **Technical Implementation**

#### Frontend Components
1. **ExcelTargetUpload.js** - Main upload component
2. **AdminDashboard.js** - Integration with admin dashboard
3. **useUserTargets.js** - API integration hook

#### Backend API
- **POST** `/api/user-targets/bulk-import` - Bulk import endpoint
- **GET** `/api/user-targets/current` - Get current user targets
- **GET** `/api/user-targets/all` - Get all targets (admin)

## Usage Instructions

### For Administrators

1. **Access Target Management**
   - Login as admin
   - Navigate to Admin Dashboard
   - Click on "Target Management" tab

2. **Upload Excel File**
   - Drag and drop your Excel file or click "Choose File"
   - Ensure your Excel file follows the required format:
     - Column 1: Field Engineer (Email addresses)
     - Column 2: Target Sep'25 (September 2025 targets)
     - Column 3: Target Oct'25 (October 2025 targets)
     - Column 4: Target Nov'25 (November 2025 targets)

3. **Preview and Upload**
   - Review the parsed data in the preview table
   - Click "Upload X Targets" to import the data
   - Monitor success/error messages

### For Users

1. **View Targets**
   - Login to your account
   - Navigate to the Home page
   - View your monthly targets in the "Monthly Targets" card
   - Current month is highlighted in orange

## Excel File Requirements

### ✅ **Supported Formats**
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma-separated values)

### 📋 **Required Structure**
```
Field Engineer          | Target Sep'25 | Target Oct'25 | Target Nov'25
user1@bluetown.com      | 100           | 120           | 150
user2@bluetown.com      | 80            | 90            | 110
```

### ⚠️ **Important Notes**
- Email addresses must be valid and exist in the system
- Target values should be numeric
- Column headers should contain "Sep", "Oct", "Nov" for 2025
- First column must contain email addresses

## Error Handling

### Common Issues and Solutions

1. **"Email column not found"**
   - Ensure the first column contains email addresses
   - Column header should include "Engineer" or "Email"

2. **"No valid data found"**
   - Check that your Excel file has data rows
   - Ensure email addresses are in the first column

3. **"User not found" errors**
   - Verify that email addresses exist in the system
   - Check for typos in email addresses

4. **Invalid file format**
   - Use supported formats: .xlsx, .xls, .csv
   - Ensure file is not corrupted

## API Endpoints

### Bulk Import Targets
```javascript
POST /api/user-targets/bulk-import
Content-Type: application/json
Authorization: Bearer <token>

{
  "targetsData": [
    {
      "email": "user@example.com",
      "september2025": 100,
      "october2025": 120,
      "november2025": 150
    }
  ]
}
```

### Response Format
```javascript
{
  "success": true,
  "message": "Bulk import completed",
  "results": [
    { "email": "user@example.com", "status": "success" }
  ],
  "errors": [
    { "email": "invalid@example.com", "error": "User not found" }
  ]
}
```

## Database Schema

### UserTarget Collection
```javascript
{
  user: ObjectId, // Reference to User
  targets: [{
    month: String, // "September", "October", "November"
    year: Number,  // 2025
    target: Number, // Target value
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- **Authentication Required**: Only authenticated admins can upload
- **Data Validation**: Email format and target value validation
- **Error Isolation**: Failed records don't affect successful ones
- **User Verification**: Only existing users can have targets assigned

## Performance Considerations

- **Batch Processing**: Handles large Excel files efficiently
- **Progress Feedback**: Real-time upload status
- **Memory Management**: Processes files in chunks
- **Error Recovery**: Continues processing even if some records fail

## Troubleshooting

### Upload Issues
1. **File not uploading**
   - Check file size (should be < 10MB)
   - Verify file format is supported
   - Ensure stable internet connection

2. **Data not appearing**
   - Check if users exist in the system
   - Verify email addresses are correct
   - Check browser console for errors

3. **Preview not showing**
   - Ensure Excel file has proper headers
   - Check that data starts from row 2
   - Verify column names match expected format

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Enhancements

- **Template Download**: Download Excel template
- **Bulk Edit**: Edit targets in bulk
- **Target History**: Track target changes over time
- **Advanced Validation**: More sophisticated data validation
- **Scheduled Imports**: Automated target updates

## Support

For technical support or questions about the Excel upload feature:
1. Check the browser console for error messages
2. Verify your Excel file format matches requirements
3. Ensure all users exist in the system before uploading
4. Contact system administrator for assistance
