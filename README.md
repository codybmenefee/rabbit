# Rabbit - YouTube Analytics Platform

A comprehensive business intelligence platform for YouTube watch history analysis. Rabbit transforms your viewing data into actionable insights through advanced analytics, trend analysis, and beautiful visualizations.

## 🚀 Features

### Core Analytics
- **Watch History Processing**: Upload and analyze YouTube watch history from Google Takeout
- **YouTube API Integration**: Enrich video data with metadata, categories, and statistics
- **LLM-Powered Scraping**: Advanced AI-powered metadata extraction using Google's Gemma 3 4B Instruct
- **High-Performance LLM Integration**: Seamless integration of AI scraping into high-performance batch processing
- **Advanced Metrics**: Hours watched, content categories, creator insights, temporal trends
- **Trend Analysis**: Month-over-month and year-over-year viewing pattern analysis

### Visualizations & Insights
- **Interactive Dashboard**: Modern, responsive analytics dashboard
- **Content Category Breakdown**: Detailed analysis of viewing preferences by topic
- **Creator Analytics**: Top channels, discovery patterns, and engagement metrics
- **Temporal Trends**: Time-based viewing patterns and habit analysis
- **Comparative Analysis**: Historical data comparison and trend forecasting

### User Experience
- **Guided Onboarding**: Step-by-step tutorial for Google Takeout data export
- **Real-time Processing**: Live updates during data processing
- **Export Capabilities**: Download insights as PDF reports or raw data
- **Dark/Light Mode**: Adaptive UI with theme preferences

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **APIs**: YouTube Data API v3 integration
- **Processing**: Advanced HTML parsing and data enrichment with AI-powered LLM integration
- **Caching**: Redis for performance optimization
- **AI Integration**: OpenRouter API with Gemma 3B 4B for intelligent data extraction

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for interactive data visualization
- **State Management**: React hooks with context
- **File Handling**: Advanced drag-and-drop upload

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Environment**: Development and production configurations
- **Testing**: Jest for unit/integration testing
- **Monitoring**: Comprehensive logging and error tracking

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or cloud)
- YouTube Data API key (optional, for enrichment)
- OpenRouter API key (optional, for LLM-powered scraping)
- Redis instance (optional, for caching)

## 🏃‍♂️ Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/codybmenefee/rabbit.git
cd rabbit
```

### 2. Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env
# Add your YouTube API key and database URLs

# For LLM-powered scraping (optional)
cp .env.gemma-example .env
# Add your OpenRouter API key for Gemma 3 4B Instruct

# Frontend environment  
cp frontend/.env.example frontend/.env.local
# Configure API endpoints
```

### 3. Development Mode
```bash
# Start all services
./start-app.sh

# Or individually:
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### 4. Production Deployment
```bash
# Using Docker
docker-compose up -d

# Manual deployment
npm run build && npm start
```

## 📖 How to Export YouTube Watch History

### Step-by-Step Guide

1. **Visit Google Takeout**
   - Go to [takeout.google.com](https://takeout.google.com)
   - Sign in with your Google account

2. **Select YouTube Data**
   - Click "Deselect all"
   - Find and select "YouTube and YouTube Music"
   - Click "Multiple formats" next to YouTube

3. **Configure Export Settings**
   - For "history": Select HTML format
   - For "subscriptions": Select JSON format (optional)
   - Leave other settings as default

4. **Create Export**
   - Choose delivery method (email link recommended)
   - Select export frequency: "Export once"
   - Choose file type and size
   - Click "Create export"

5. **Download and Extract**
   - Wait for email notification (can take hours/days)
   - Download the archive
   - Extract and locate `watch-history.html`

6. **Upload to Rabbit**
   - Open Rabbit application
   - Use the upload interface to select your `watch-history.html` file
   - Wait for processing to complete

## 🔧 API Documentation

### Core Endpoints

```bash
# Upload watch history
POST /api/analytics/upload
Content-Type: application/json
Body: { "htmlContent": "...", "options": {...} }

# Get processed metrics
GET /api/analytics/metrics

# Get detailed video data
GET /api/analytics/videos?page=1&limit=50

# Update processing options
PUT /api/analytics/settings
Body: { "enrichWithAPI": true, "includeShorts": false }
```

### Configuration Options

```typescript
interface ProcessingOptions {
  enrichWithAPI: boolean;      // Use YouTube API for metadata
  includeShorts: boolean;      // Include YouTube Shorts
  includeAds: boolean;         // Include advertisement entries
  categoryFilters: string[];   // Filter by content categories
  dateRange: {                 // Limit analysis timeframe
    start: Date;
    end: Date;
  };
}
```

## 📊 Analytics Capabilities

### Metrics Overview
- Total watch time and video count
- Average session duration
- Peak viewing times and days
- Content category distribution
- Creator diversity index

### Trend Analysis
- Monthly/yearly viewing patterns
- Content preference evolution
- Discovery method analysis
- Engagement rate trends
- Seasonal viewing behaviors

### Advanced Insights
- Content recommendation accuracy
- Channel loyalty metrics
- Viewing speed analysis
- Content completion rates
- Cross-platform correlation

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage

# Test LLM scraping (Gemma 3 4B Instruct)
./test-gemma-simple.sh
```

## 🚀 Deployment

### Docker Production
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose logs -f
```

### Manual Production
```bash
# Backend
cd backend
npm run build
NODE_ENV=production npm start

# Frontend
cd frontend
npm run build
npm start
```

## 🔐 Security & Privacy

- **Local Processing**: All data processing happens on your infrastructure
- **No Data Storage**: Watch history is not permanently stored
- **API Security**: YouTube API calls use minimal required permissions
- **Encryption**: All API communications use HTTPS
- **Data Retention**: Configurable data retention policies

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: [docs.rabbit-analytics.com](https://docs.rabbit-analytics.com)
- **Issues**: [GitHub Issues](https://github.com/codybmenefee/rabbit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codybmenefee/rabbit/discussions)

---

**Rabbit** - Transform your YouTube viewing data into actionable insights 🐰📊 