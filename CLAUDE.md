# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rabbit is a comprehensive YouTube analytics platform that transforms watch history data into actionable insights. It processes YouTube watch history from Google Takeout and provides advanced analytics, visualizations, and AI-powered metadata extraction.

## Key Commands

### Development
```bash
# Start both backend and frontend
./scripts/utilities/start-app.sh

# Backend only
cd backend && npm run dev

# Frontend only  
cd frontend && npm run dev
```

### Building
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### Testing
```bash
# Run all tests
cd backend && npm test
cd frontend && npm test

# Run specific test categories
cd backend && npm run test:unit
cd backend && npm run test:integration
cd backend && npm run test:coverage

# Test LLM scraping functionality
./scripts/testing/test-llm-simple.sh
./scripts/testing/test-gemma-simple.sh
```

### Linting and Type Checking
```bash
# Backend
cd backend && npm run lint
cd backend && npm run lint:fix

# Frontend
cd frontend && npm run lint
cd frontend && npm run type-check
```

### Docker Deployment
```bash
docker-compose up -d        # Development
docker-compose -f docker-compose.prod.yml up -d  # Production
```

## High-Level Architecture

### Backend (Node.js + TypeScript + Express)

The backend follows a layered architecture with clear separation of concerns:

1. **Entry Point** (`src/index.ts`): Initializes services, middleware, and routes. Manages graceful shutdown and service lifecycle.

2. **Services Layer** (`src/services/`):
   - `YouTubeAPIService`: Official YouTube Data API v3 integration
   - `YouTubeScrapingService`: Fallback web scraping using Cheerio/Playwright
   - `YouTubeLLMScrapingService`: AI-powered extraction using LLMs via OpenRouter
   - `YouTubeHighPerformanceScrapingService`: High-throughput processing with worker threads
   - `AnalyticsService`: Core analytics computations
   - `VideoService`: Video data management
   - `ParserService`: HTML parsing and orchestration of enrichment services

3. **Controllers Layer** (`src/controllers/`): Request handlers that coordinate services

4. **Routes Layer** (`src/routes/`): API endpoint definitions

5. **Models Layer** (`src/models/`): MongoDB schemas for VideoEntry and Metrics

6. **Enrichment Service Hierarchy**:
   - Primary: YouTube API (if configured)
   - Secondary: Web scraping (if API fails/quota exceeded)
   - Tertiary: LLM-powered extraction (for missing metadata)
   - The system automatically falls back through these methods

### Frontend (Next.js 14 + TypeScript + Tailwind)

Modern React application using Next.js App Router:

1. **App Directory** (`src/app/`): Next.js 14 app router structure
2. **Components** (`src/components/`):
   - `FileUpload`: Drag-and-drop upload interface
   - `ProcessingStatus`: Real-time processing updates
   - `MetricsDisplay`: Analytics visualization
   - `VideoTable`: Data table with filtering
   - `TakeoutGuide`: Step-by-step export instructions

### Data Processing Pipeline

1. User uploads `watch-history.html` from Google Takeout
2. Backend parses HTML and extracts video IDs
3. **NEW Enhanced Enrichment Pipeline**:
   - **Primary**: AI-powered extraction using LLMs to scrape and analyze YouTube pages
   - **Fallback 1**: YouTube API for official metadata (if AI extraction fails)
   - **Fallback 2**: Traditional web scraping (final fallback)
4. Store enriched data in MongoDB
5. Compute analytics metrics
6. Return results to frontend for visualization

**Key Change**: AI extraction is now the default primary method, providing more comprehensive and adaptable metadata extraction.

## Environment Configuration

Critical environment variables (see `.env.example` for full list):

```bash
# Backend API
PORT=5000
MONGODB_URI=mongodb://localhost:27017/youtube-analytics

# Primary Extraction Method (AI-Powered)
LLM_SCRAPING_ENABLED=true
LLM_PROVIDER=google  # anthropic, openai, meta, google, mistral, deepseek
LLM_MODEL=gemma-3-4b-it
OPENROUTER_API_KEY=your_key_here

# Secondary/Fallback Methods
YOUTUBE_API_KEY=your_key_here  # Fallback to YouTube API
DEFAULT_ENRICHMENT_SERVICE=llm  # Set primary service

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Service Dependencies

- **OpenRouter API**: LLM access for AI extraction (highly recommended - primary method)
- **MongoDB**: Data persistence (optional in development)
- **Redis**: Caching layer (optional)
- **YouTube Data API**: Official metadata (optional fallback method)

## Testing Strategy

- Unit tests for individual services and utilities
- Integration tests for API endpoints
- Dedicated test scripts for LLM functionality
- Test data includes sample HTML files in `scripts/demos/`

## Common Development Tasks

### Adding a New Enrichment Service
1. Create service class in `src/services/`
2. Implement standard interface with fallback handling
3. Register in `src/index.ts` initialization
4. Update `ParserService` to include in enrichment cascade

### Modifying the Processing Pipeline
1. Update `ParserService.processWatchHistory()` for parsing logic
2. Modify enrichment methods in respective services
3. Update `VideoEntry` model if new fields needed
4. Adjust frontend components to display new data

### Performance Optimization
- Use `YouTubeHighPerformanceScrapingService` for large datasets
- Enable Redis caching for API/scraping results
- Configure worker threads for parallel processing
- Adjust batch sizes and concurrency limits in environment

## Security Considerations

- API keys stored in environment variables only
- Rate limiting applied to all endpoints
- CORS configured for specific origins
- Request size limits enforced
- Sensitive data sanitized in logs