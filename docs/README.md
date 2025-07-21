# Rabbit YouTube Analytics Platform - Documentation

Complete documentation for the Rabbit YouTube Analytics Platform, a comprehensive business intelligence tool for YouTube watch history analysis.

## 📚 Documentation Structure

### 🏗️ Architecture
- **[System Overview](architecture/system-overview.md)** - High-level system architecture and components
- **[API Design](architecture/api-design.md)** - RESTful API design and endpoints
- **[Data Flow](architecture/data-flow.md)** - Data processing and enrichment pipeline
- **[Service Dependencies](architecture/service-dependencies.md)** - Service interactions and dependencies

### 🔧 Services
- **[Analytics Service](services/analytics-service.md)** - Core analytics engine and metrics calculation
- **[Parser Service](services/parser-service.md)** - HTML parsing and data extraction
- **[Enrichment Services](services/enrichment-services.md)** - YouTube API and web scraping services

### 🚀 Development
- **[Getting Started](development/getting-started.md)** - Setup and development workflow
- **[Developer Guide](developer-guide.md)** - Comprehensive development guide
- **[Git Workflow](git-workflow.md)** - Git practices and contribution guidelines

### 📖 User Guides
- **[User Guide](user-guide.md)** - End-user documentation and tutorials
- **[Scraping Service Guide](scraping-service-guide.md)** - Web scraping configuration and usage

### 🤖 LLM Integration
- **[Codebase Summary](llm-context/codebase-summary.md)** - LLM-friendly codebase overview

## 🌟 Key Features

### Core Analytics
- **Watch History Processing**: Upload and analyze YouTube watch history from Google Takeout
- **YouTube API Integration**: Enrich video data with metadata, categories, and statistics  
- **LLM-Powered Scraping**: AI-powered metadata extraction using Google's Gemma 3 4B Instruct
- **High-Performance Processing**: Seamless integration of AI scraping into batch processing
- **Advanced Metrics**: Hours watched, content categories, creator insights, temporal trends
- **Trend Analysis**: Month-over-month and year-over-year viewing pattern analysis

### AI Integration
- **OpenRouter Integration**: Unified access to multiple AI models (Anthropic, OpenAI, Meta, Google, Mistral)
- **Cost-Effective LLM Usage**: Optimized for large datasets with intelligent chunking and caching
- **Fallback Mechanisms**: Automatic fallback between API, scraping, and LLM methods
- **Real-time Cost Monitoring**: Built-in cost limits and usage tracking

### Performance Features
- **Multi-Service Architecture**: YouTube API, web scraping, and LLM integration
- **Intelligent Caching**: Redis-based caching for performance optimization
- **Batch Processing**: Efficient processing of large datasets
- **Rate Limiting**: Respect API quotas and avoid service abuse
- **Connection Pooling**: Optimized HTTP connections for external services

## 🛠 Technical Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **APIs**: YouTube Data API v3 integration
- **AI Integration**: OpenRouter API with multiple model support
- **Caching**: Redis for performance optimization
- **Processing**: Advanced HTML parsing and data enrichment

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

## 📊 Development Summary

### Recent Implementations

#### LLM Integration (Latest)
- **Google Gemma 3 4B Integration**: Ultra-cost-effective AI model for structured data extraction
- **OpenRouter Migration**: Unified API access to multiple AI providers
- **Cost Optimization**: Intelligent chunking, caching, and cost limits
- **Performance Monitoring**: Real-time cost and usage tracking

#### Web Scraping Service
- **Multi-Strategy Extraction**: 4 distinct methods for robust data extraction
- **Anti-Detection Measures**: User-agent rotation, rate limiting, circuit breaker
- **Fallback Integration**: Seamless fallback between YouTube API and scraping
- **Performance Features**: Concurrent processing, caching, batch operations

#### Analytics Engine
- **Advanced Metrics**: Comprehensive analytics with temporal patterns
- **MongoDB Integration**: Persistent data storage with optimized indexes
- **Real-time Processing**: Live updates during data processing
- **Export Capabilities**: PDF reports and raw data export

### Testing Framework
- **Multi-Layer Testing**: Unit, integration, and end-to-end tests
- **Backend Testing**: Jest + TypeScript for services and controllers
- **Frontend Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright for user workflow testing

## 🔬 Performance Metrics

### Cost Analysis (LLM Services)
- **Gemma 3 4B Instruct**: ~$0.000006 per video (ultra-low cost)
- **Claude 3 Haiku**: ~$0.0015 per video (balanced performance)
- **GPT-3.5 Turbo**: ~$0.003 per video (reliable performance)
- **Llama 3.1 8B**: ~$0.0004 per video (open source)

### Processing Capacity
- **Large Datasets**: Tested with 18,000+ video entries
- **Concurrent Processing**: Up to 500 concurrent requests (high-performance mode)
- **Caching Efficiency**: 24-hour TTL for scraping, 2-hour TTL for LLM results
- **Fallback Reliability**: 99%+ uptime with intelligent service switching

## 🚀 Quick Start

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Configure with your API keys
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Start Services**:
   ```bash
   ./scripts/utilities/start-services.sh
   ```

4. **Run Tests**:
   ```bash
   node scripts/testing/test-gemma-3-4b-demo.js
   ```

## 📈 Future Roadmap

### Planned Features
- **Real-time Analytics**: Live dashboard updates
- **Advanced Visualizations**: Interactive charts and graphs
- **Export Enhancements**: Additional export formats
- **Mobile Optimization**: Responsive design improvements
- **API Expansion**: Public API for third-party integrations

### Performance Improvements
- **Edge Caching**: CDN integration for static assets
- **Database Optimization**: Advanced indexing and query optimization
- **Parallel Processing**: Enhanced concurrent processing capabilities
- **Memory Optimization**: Reduced memory footprint for large datasets

## 🤝 Contributing

See [Developer Guide](developer-guide.md) and [Git Workflow](git-workflow.md) for contribution guidelines.

## 📞 Support

For technical support and questions, refer to the appropriate documentation section or check the troubleshooting guides in each service documentation.