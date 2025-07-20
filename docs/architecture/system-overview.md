# System Architecture Overview

## Rabbit YouTube Analytics Platform

The Rabbit YouTube Analytics Platform is a comprehensive business intelligence solution that transforms YouTube watch history data into actionable insights through advanced analytics, data enrichment, and visualization capabilities.

## High-Level Architecture

```mermaid
graph TB
    subgraph "External APIs"
        YT_API[YouTube Data API v3]
        WEB_TARGETS[Web Scraping Targets]
    end
    
    subgraph "Frontend Layer"
        UI[Next.js Frontend]
        COMPONENTS[React Components]
        
        subgraph "UI Components"
            TAKEOUT[TakeoutGuide]
            UPLOAD[FileUpload]
            DASHBOARD[DashboardLayout]
            TABLE[VideoTable]
            FILTERS[FilterControls]
            METRICS[MetricsDisplay]
            STATUS[ProcessingStatus]
        end
    end
    
    subgraph "Backend Layer"
        API_GATEWAY[Express.js API Gateway]
        
        subgraph "Controllers"
            ANALYTICS_CTRL[AnalyticsController]
            SCRAPING_CTRL[ScrapingController]
            HP_SCRAPING_CTRL[HighPerformanceScrapingController]
        end
        
        subgraph "Core Services"
            PARSER[ParserService]
            ANALYTICS[AnalyticsService]
            VIDEO[VideoService]
            CLASSIFIER[ClassifierService]
        end
        
        subgraph "Data Enrichment Services"
            YT_API_SVC[YouTubeAPIService]
            YT_SCRAPING[YouTubeScrapingService]
            YT_HP_SCRAPING[YouTubeHighPerformanceScrapingService]
        end
    end
    
    subgraph "Data Layer"
        MONGODB[(MongoDB)]
        REDIS[(Redis Cache)]
        
        subgraph "Data Models"
            VIDEO_ENTRY[VideoEntry]
            METRICS_MODEL[Metrics]
        end
    end
    
    subgraph "Infrastructure"
        DOCKER[Docker Containers]
        ENV_CONFIG[Environment Configuration]
        LOGGING[Centralized Logging]
        MONITORING[Performance Monitoring]
    end
    
    %% Frontend to Backend Connections
    UI --> API_GATEWAY
    COMPONENTS --> UI
    TAKEOUT --> UPLOAD
    UPLOAD --> DASHBOARD
    DASHBOARD --> TABLE
    DASHBOARD --> FILTERS
    DASHBOARD --> METRICS
    DASHBOARD --> STATUS
    
    %% API Gateway to Controllers
    API_GATEWAY --> ANALYTICS_CTRL
    API_GATEWAY --> SCRAPING_CTRL
    API_GATEWAY --> HP_SCRAPING_CTRL
    
    %% Controllers to Services
    ANALYTICS_CTRL --> PARSER
    ANALYTICS_CTRL --> ANALYTICS
    ANALYTICS_CTRL --> VIDEO
    SCRAPING_CTRL --> YT_SCRAPING
    HP_SCRAPING_CTRL --> YT_HP_SCRAPING
    
    %% Service Dependencies
    PARSER --> ANALYTICS
    PARSER --> VIDEO
    PARSER --> YT_API_SVC
    PARSER --> YT_SCRAPING
    PARSER --> YT_HP_SCRAPING
    ANALYTICS --> VIDEO
    VIDEO --> CLASSIFIER
    
    %% External API Connections
    YT_API_SVC --> YT_API
    YT_SCRAPING --> WEB_TARGETS
    YT_HP_SCRAPING --> WEB_TARGETS
    
    %% Data Layer Connections
    VIDEO --> MONGODB
    VIDEO --> REDIS
    ANALYTICS --> VIDEO_ENTRY
    ANALYTICS --> METRICS_MODEL
    VIDEO_ENTRY --> MONGODB
    METRICS_MODEL --> MONGODB
    
    %% Infrastructure
    API_GATEWAY --> LOGGING
    PARSER --> MONITORING
    ANALYTICS --> MONITORING
    
    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef data fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef infrastructure fill:#fce4ec
    
    class UI,COMPONENTS,TAKEOUT,UPLOAD,DASHBOARD,TABLE,FILTERS,METRICS,STATUS frontend
    class API_GATEWAY,ANALYTICS_CTRL,SCRAPING_CTRL,HP_SCRAPING_CTRL,PARSER,ANALYTICS,VIDEO,CLASSIFIER,YT_API_SVC,YT_SCRAPING,YT_HP_SCRAPING backend
    class MONGODB,REDIS,VIDEO_ENTRY,METRICS_MODEL data
    class YT_API,WEB_TARGETS external
    class DOCKER,ENV_CONFIG,LOGGING,MONITORING infrastructure
```

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for interactive data visualization
- **State Management**: React hooks with context
- **File Handling**: Advanced drag-and-drop upload with validation
- **UI Components**: Custom component library with accessibility support

### Backend Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware stack
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for performance optimization
- **APIs**: YouTube Data API v3 integration
- **Processing**: Advanced HTML parsing and data enrichment
- **Testing**: Jest for unit and integration testing

### Infrastructure & DevOps
- **Containerization**: Docker with multi-stage builds
- **Development**: Hot reload and debugging tools
- **Monitoring**: Comprehensive logging and error tracking
- **Security**: Rate limiting, CORS, and input validation
- **Performance**: Caching strategies and query optimization

## Core Design Principles

### 1. Modular Architecture
- **Service-Oriented Design**: Each service handles a specific domain responsibility
- **Loose Coupling**: Services communicate through well-defined interfaces
- **High Cohesion**: Related functionality is grouped together
- **Dependency Injection**: Services are injected rather than hard-coded

### 2. Data-Driven Processing
- **ETL Pipeline**: Extract, Transform, Load pattern for data processing
- **Enrichment Strategy**: Multiple data sources for comprehensive insights
- **Caching Layer**: Redis caching for frequently accessed data
- **Performance Optimization**: Batch processing and concurrent operations

### 3. Scalability & Performance
- **Horizontal Scaling**: Services designed for multi-instance deployment
- **Resource Management**: Connection pooling and resource optimization
- **Rate Limiting**: API quota management and throttling
- **Monitoring**: Performance metrics and health checks

### 4. User Experience Focus
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Real-time Feedback**: Live progress updates during processing
- **Responsive Design**: Mobile-first responsive UI
- **Accessibility**: WCAG 2.1 compliance and keyboard navigation

## Security Considerations

### 1. Data Protection
- **Input Validation**: Comprehensive validation using Zod schemas
- **Sanitization**: HTML and data sanitization to prevent XSS
- **Rate Limiting**: Protection against abuse and DoS attacks
- **CORS Configuration**: Secure cross-origin resource sharing

### 2. API Security
- **Authentication**: Token-based authentication (when implemented)
- **Authorization**: Role-based access control
- **Quota Management**: YouTube API quota monitoring and optimization
- **Error Handling**: Secure error messages without information leakage

### 3. Infrastructure Security
- **Environment Variables**: Secure configuration management
- **Container Security**: Minimal attack surface in Docker images
- **Network Security**: Secure communication between services
- **Logging**: Security event logging and monitoring

## Performance Characteristics

### 1. Processing Performance
- **File Upload**: Supports files up to 50MB
- **Parsing Speed**: ~1000 entries per second
- **Enrichment Rate**: 100 API calls per day (quota dependent)
- **Database Operations**: Optimized bulk operations

### 2. Scalability Metrics
- **Concurrent Users**: Designed for 100+ concurrent sessions
- **Data Volume**: Handles watch histories with 100k+ entries
- **Memory Usage**: ~512MB base memory footprint
- **Storage**: Efficient document storage with indexing

### 3. Availability Targets
- **Uptime**: 99.9% availability target
- **Response Time**: <200ms for API endpoints
- **Recovery Time**: <5 minutes for service restart
- **Data Durability**: 99.999% with MongoDB replication

## Deployment Architecture

### Development Environment
```mermaid
graph LR
    DEV[Developer Machine] --> GIT[Git Repository]
    GIT --> CI[Continuous Integration]
    CI --> TEST[Automated Testing]
    TEST --> BUILD[Build Artifacts]
    BUILD --> DEV_DEPLOY[Development Deployment]
```

### Production Environment
```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Load Balancer]
    end
    
    subgraph "Application Tier"
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance N]
    end
    
    subgraph "Database Tier"
        MONGO_PRIMARY[(MongoDB Primary)]
        MONGO_SECONDARY[(MongoDB Secondary)]
        REDIS_CLUSTER[(Redis Cluster)]
    end
    
    subgraph "External Services"
        YT_API[YouTube API]
        MONITORING[Monitoring Services]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> MONGO_PRIMARY
    APP2 --> MONGO_PRIMARY
    APP3 --> MONGO_PRIMARY
    
    MONGO_PRIMARY --> MONGO_SECONDARY
    
    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER
    
    APP1 --> YT_API
    APP1 --> MONITORING
```

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Service-level testing with Jest
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Full workflow testing with Playwright
- **Performance Tests**: Load testing and benchmarking
- **Security Tests**: Vulnerability scanning and penetration testing

### Code Quality
- **TypeScript**: Strong typing for better code quality
- **ESLint**: Code style and quality enforcement
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **SonarQube**: Continuous code quality monitoring

This architecture provides a solid foundation for the Rabbit YouTube Analytics Platform, enabling scalable data processing, comprehensive analytics, and exceptional user experience while maintaining high performance and security standards.