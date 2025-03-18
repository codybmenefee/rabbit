# Developer Documentation
# YouTube Watch History Analytics App

## Architecture Overview

The YouTube Watch History Analytics App is built using a modern web application architecture with a clear separation between frontend and backend components.

### Backend Architecture

The backend is built with Node.js and Express, using TypeScript for type safety. It follows a modular architecture:

- **Controllers**: Handle HTTP requests and responses
- **Models**: Define database schemas using Mongoose
- **Routes**: Define API endpoints
- **Utils**: Contain utility functions like the HTML parser

The backend provides RESTful API endpoints for:
- File upload and processing
- Data retrieval for analytics
- Data filtering and manipulation

### Frontend Architecture

The frontend is built with Next.js and React, using TypeScript. It follows a component-based architecture:

- **Pages**: Define the application routes
- **Components**: Reusable UI elements
- **Hooks**: Custom React hooks for state management and side effects

### Database

MongoDB is used as the database, with Mongoose as the ODM (Object Document Mapper). The database schema includes:

- **Video**: Stores information about watched videos
- **User**: Stores user information (for future authentication)

## API Documentation

### Upload Endpoints

#### POST /api/upload/upload
Uploads and processes a YouTube watch history HTML file.

**Request:**
- Content-Type: multipart/form-data
- Body:
  - watchHistory: HTML file
  - userId: string (optional)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "data": {
    "count": 123,
    "filePath": "/path/to/file"
  }
}
```

#### GET /api/upload/videos/:userId
Retrieves all videos for a specific user.

**Response:**
```json
{
  "success": true,
  "count": 123,
  "data": [
    {
      "title": "Video Title",
      "channelName": "Channel Name",
      "watchDate": "2025-03-15T10:00:00Z",
      "videoId": "abcdefghijk"
    }
  ]
}
```

#### DELETE /api/upload/videos/:userId
Deletes all videos for a specific user.

**Response:**
```json
{
  "success": true,
  "message": "Deleted 123 videos",
  "data": {
    "deletedCount": 123
  }
}
```

### Analytics Endpoints

#### GET /api/analytics/time/:userId
Retrieves time-based analytics for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 123,
    "dailyData": {
      "2025-03-15": 5,
      "2025-03-16": 8
    },
    "hourlyDistribution": {
      "10": 15,
      "14": 20
    },
    "peakWatchHour": {
      "hour": 14,
      "count": 20
    }
  }
}
```

#### GET /api/analytics/content/:userId
Retrieves content-based analytics for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 123,
    "uniqueChannels": 45,
    "topChannels": [
      {
        "channel": "Channel Name",
        "count": 20
      }
    ]
  }
}
```

#### GET /api/analytics/summary/:userId
Retrieves summary statistics for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 123,
    "dateRange": 30,
    "oldestVideo": "2025-02-15T10:00:00Z",
    "newestVideo": "2025-03-15T10:00:00Z",
    "averageVideosPerDay": "4.1"
  }
}
```

## Component Documentation

### Frontend Components

#### FileUpload
Handles file selection and upload using React-Dropzone.

**Props:**
- `onUploadSuccess`: Callback function called when upload is successful

#### Dashboard
Main dashboard component that displays analytics.

**Props:**
- `userId`: User ID for data retrieval

#### TimeAnalytics
Displays time-based analytics visualizations.

**Props:**
- `data`: Time analytics data object

#### ContentAnalytics
Displays content-based analytics visualizations.

**Props:**
- `data`: Content analytics data object

#### FilterControls
Provides filtering controls for analytics data.

**Props:**
- `onFilterChange`: Callback function for filter changes
- `dateRange`: Array containing min and max dates

#### ExportData
Provides data export functionality.

**Props:**
- `data`: Data to export
- `fileName`: Name for the exported file

### Backend Components

#### parseWatchHistory
Parses YouTube watch history HTML files and extracts video information.

**Parameters:**
- `filePath`: Path to the uploaded HTML file
- `userId`: User ID to associate with the videos

**Returns:**
- Array of saved video documents

## Testing

### Backend Tests

The backend includes unit tests for:
- Parser functionality
- Upload controller
- Analytics controller

Run tests with:
```
npm test
```

### Frontend Testing

For frontend testing, consider implementing:
- Component tests with React Testing Library
- End-to-end tests with Cypress

## Deployment

### Docker Deployment

The application includes Docker configuration for easy deployment:
- `docker-compose.yml`: Orchestrates the entire application
- `backend/Dockerfile`: Builds the backend container
- `frontend/Dockerfile`: Builds the frontend container

Build and run with:
```
docker-compose up -d
```

### Cloud Deployment

For production deployment:
1. Frontend: Deploy to Vercel or Netlify
2. Backend: Deploy to AWS, GCP, or Heroku
3. Database: Use MongoDB Atlas

## Future Enhancements

Potential areas for future development:
- User authentication and accounts
- Integration with YouTube API for additional data
- Advanced analytics and machine learning insights
- Mobile app version
- Social sharing of analytics
