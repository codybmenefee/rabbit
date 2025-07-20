# API Design Documentation

## Overview

The Rabbit YouTube Analytics Platform exposes a comprehensive REST API that follows modern design principles and provides a consistent interface for data processing, analytics generation, and system management.

## API Endpoint Structure

```mermaid
graph TB
    subgraph "Analytics Endpoints"
        ANALYTICS_BASE["/api/analytics"]
        UPLOAD["/upload - POST"]
        PROGRESS["/progress/:sessionId - GET"]
        METRICS["/metrics/:sessionId - GET"]
        ENTRIES["/entries - GET"]
        SETTINGS["/settings - POST"]
        QUOTA["/quota - GET"]
        EXPORT["/export - GET"]
    end
    
    subgraph "Scraping Endpoints"
        SCRAPING_BASE["/api/scraping"]
        SCRAPING_STATS["/stats - GET"]
        SCRAPING_CACHE["/cache - DELETE"]
        SCRAPING_TEST["/test/:videoId - GET"]
        SCRAPING_EXTRACT["/extract-video-id - POST"]
        SCRAPING_HEALTH["/health - GET"]
    end
    
    subgraph "High-Performance Endpoints"
        HP_BASE["/api/high-performance"]
        HP_DEMO["/demo - POST"]
        HP_STATS["/stats - GET"]
        HP_TEST["/test/:videoId - GET"]
        HP_BATCH["/batch - POST"]
        HP_HEALTH["/health - GET"]
    end
    
    ANALYTICS_BASE --> UPLOAD
    ANALYTICS_BASE --> PROGRESS
    ANALYTICS_BASE --> METRICS
    ANALYTICS_BASE --> ENTRIES
    ANALYTICS_BASE --> SETTINGS
    ANALYTICS_BASE --> QUOTA
    ANALYTICS_BASE --> EXPORT
    
    SCRAPING_BASE --> SCRAPING_STATS
    SCRAPING_BASE --> SCRAPING_CACHE
    SCRAPING_BASE --> SCRAPING_TEST
    SCRAPING_BASE --> SCRAPING_EXTRACT
    SCRAPING_BASE --> SCRAPING_HEALTH
    
    HP_BASE --> HP_DEMO
    HP_BASE --> HP_STATS
    HP_BASE --> HP_TEST
    HP_BASE --> HP_BATCH
    HP_BASE --> HP_HEALTH
    
    style ANALYTICS_BASE fill:#e3f2fd
    style SCRAPING_BASE fill:#f3e5f5
    style HP_BASE fill:#fce4ec
```

## Request/Response Flow

```mermaid
sequenceDiagram
    participant Client
    participant API_Gateway
    participant Controller
    participant Service
    participant Database
    participant Cache
    participant External_API
    
    Client->>API_Gateway: HTTP Request
    
    Note over API_Gateway: Middleware Processing
    API_Gateway->>API_Gateway: Rate Limiting
    API_Gateway->>API_Gateway: CORS Validation
    API_Gateway->>API_Gateway: Request Logging
    API_Gateway->>API_Gateway: Body Parsing
    
    API_Gateway->>Controller: Route to Controller
    
    Note over Controller: Request Validation
    Controller->>Controller: Schema Validation (Zod)
    Controller->>Controller: Authentication Check
    Controller->>Controller: Authorization Check
    
    Controller->>Service: Business Logic Call
    
    Note over Service: Data Processing
    Service->>Cache: Check Cache
    Cache-->>Service: Cache Result
    
    alt Cache Miss
        Service->>Database: Query Database
        Database-->>Service: Database Result
        Service->>Cache: Update Cache
    end
    
    opt External Enrichment
        Service->>External_API: API Call
        External_API-->>Service: External Data
    end
    
    Service-->>Controller: Processed Result
    Controller->>Controller: Response Formatting
    Controller-->>API_Gateway: HTTP Response
    API_Gateway-->>Client: Final Response
```

## Analytics API Endpoints

### Upload Endpoint

```mermaid
graph LR
    A[POST /api/analytics/upload] --> B[Request Validation]
    B --> C[File Processing]
    C --> D[Session Creation]
    D --> E[Background Processing]
    E --> F[Response with Session ID]
    
    subgraph "Request Body"
        G[htmlContent: string]
        H[options: ParseOptions]
    end
    
    subgraph "Response"
        I[sessionId: string]
        J[message: string]
        K[timestamp: ISO string]
    end
    
    A --> G
    A --> H
    F --> I
    F --> J
    F --> K
```

#### Request Schema
```typescript
interface UploadRequest {
  htmlContent: string;
  options: {
    enrichWithAPI: boolean;
    useScrapingService: boolean;
    useHighPerformanceService: boolean;
    forceReprocessing: boolean;
    includeAds: boolean;
    includeShorts: boolean;
    dateRange?: {
      start: string; // ISO date
      end: string;   // ISO date
    };
    categoryFilters?: string[];
  };
}
```

#### Response Schema
```typescript
interface UploadResponse {
  success: boolean;
  sessionId: string;
  message: string;
  timestamp: string;
  estimatedProcessingTime?: number;
}
```

### Progress Tracking Endpoint

```mermaid
sequenceDiagram
    participant Client
    participant ProgressEndpoint
    participant ParserService
    participant ProgressTracker
    
    Client->>ProgressEndpoint: GET /api/analytics/progress/:sessionId
    ProgressEndpoint->>ParserService: getProgress(sessionId)
    ParserService->>ProgressTracker: retrieveProgress(sessionId)
    ProgressTracker-->>ParserService: Current Progress Data
    ParserService-->>ProgressEndpoint: Progress Object
    ProgressEndpoint-->>Client: Progress Response
    
    Note over Client: Poll every 2 seconds until complete
```

#### Progress Response Schema
```typescript
interface ProgressResponse {
  success: boolean;
  progress: {
    sessionId: string;
    stage: string;
    progress: number; // 0-100
    message: string;
    details: {
      totalEntries?: number;
      processedEntries?: number;
      enrichedEntries?: number;
      errors?: number;
    };
    isComplete: boolean;
    error?: string;
  };
  timestamp: string;
}
```

### Metrics Endpoint

```mermaid
graph TD
    A[GET /api/analytics/metrics/:sessionId] --> B{Session Exists?}
    B -->|No| C[404 Not Found]
    B -->|Yes| D{Processing Complete?}
    D -->|No| E[202 Processing]
    D -->|Yes| F[Retrieve Metrics]
    F --> G[Format Response]
    G --> H[200 OK with Metrics]
    
    style C fill:#ffebee
    style E fill:#fff3e0
    style H fill:#e8f5e8
```

#### Metrics Response Schema
```typescript
interface MetricsResponse {
  success: boolean;
  metrics: VideoMetrics;
  processingStats: {
    totalEntries: number;
    validEntries: number;
    duplicatesRemoved: number;
    errors: string[];
    processingTime: number;
  };
  timestamp: string;
}
```

### Entries Query Endpoint

```mermaid
graph LR
    A[GET /api/analytics/entries] --> B[Query Parameters]
    B --> C[Filter Application]
    C --> D[Pagination]
    D --> E[Sort & Format]
    E --> F[Response]
    
    subgraph "Query Parameters"
        G[page: number]
        H[limit: number]
        I[sortBy: string]
        J[sortOrder: asc/desc]
        K[filters: object]
    end
    
    B --> G
    B --> H
    B --> I
    B --> J
    B --> K
```

#### Query Parameters Schema
```typescript
interface EntriesQuery {
  page?: number;
  limit?: number;
  sortBy?: 'watchedAt' | 'title' | 'channel' | 'duration';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    channel?: string;
    category?: VideoCategory;
    contentType?: ContentType;
    dateRange?: {
      start: string;
      end: string;
    };
    searchTerm?: string;
  };
}
```

## Scraping API Endpoints

### Statistics Endpoint

```mermaid
graph TB
    A[GET /api/scraping/stats] --> B[Service Statistics]
    B --> C[Cache Statistics]
    C --> D[Performance Metrics]
    D --> E[Error Rates]
    E --> F[Response]
    
    subgraph "Statistics Collected"
        G[Total Requests]
        H[Success Rate]
        I[Average Response Time]
        J[Cache Hit Rate]
        K[Error Breakdown]
    end
    
    B --> G
    B --> H
    C --> I
    C --> J
    D --> K
```

#### Statistics Response Schema
```typescript
interface ScrapingStatsResponse {
  success: boolean;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheStats: {
      hits: number;
      misses: number;
      hitRate: number;
      totalKeys: number;
    };
    errorBreakdown: Record<string, number>;
    lastReset: string;
  };
  timestamp: string;
}
```

### Video Testing Endpoint

```mermaid
sequenceDiagram
    participant Client
    participant TestEndpoint
    participant ScrapingService
    participant WebTarget
    participant Cache
    
    Client->>TestEndpoint: GET /api/scraping/test/:videoId
    TestEndpoint->>ScrapingService: testVideoScraping(videoId)
    
    ScrapingService->>Cache: Check Cache
    Cache-->>ScrapingService: Cache Result
    
    alt Cache Miss
        ScrapingService->>WebTarget: Scrape Video Data
        WebTarget-->>ScrapingService: Video Metadata
        ScrapingService->>Cache: Store Result
    end
    
    ScrapingService-->>TestEndpoint: Test Results
    TestEndpoint-->>Client: Test Response
```

## High-Performance API Endpoints

### Demo Endpoint

```mermaid
graph TD
    A[POST /api/high-performance/demo] --> B[Request Validation]
    B --> C[Video ID Extraction]
    C --> D[Parallel Processing]
    D --> E[Result Aggregation]
    E --> F[Performance Metrics]
    F --> G[Response]
    
    subgraph "Processing Options"
        H[Batch Size]
        I[Concurrency Limit]
        J[Timeout Settings]
        K[Retry Strategy]
    end
    
    D --> H
    D --> I
    D --> J
    D --> K
```

#### Demo Request Schema
```typescript
interface HighPerformanceDemoRequest {
  videoIds: string[];
  options?: {
    batchSize?: number;
    concurrencyLimit?: number;
    timeoutMs?: number;
    retryAttempts?: number;
    enableCaching?: boolean;
  };
}
```

## Error Handling Design

```mermaid
graph TD
    A[API Error] --> B{Error Type}
    
    B -->|Validation Error| C[400 Bad Request]
    B -->|Authentication Error| D[401 Unauthorized]
    B -->|Authorization Error| E[403 Forbidden]
    B -->|Not Found Error| F[404 Not Found]
    B -->|Method Not Allowed| G[405 Method Not Allowed]
    B -->|Rate Limit Exceeded| H[429 Too Many Requests]
    B -->|Internal Server Error| I[500 Internal Server Error]
    B -->|Service Unavailable| J[503 Service Unavailable]
    B -->|Gateway Error| K[502 Bad Gateway]
    
    C --> L[Error Response Format]
    D --> L
    E --> L
    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M[Client Error Handling]
    
    style C fill:#ffecb3
    style D fill:#ffebee
    style E fill:#ffebee
    style F fill:#fff3e0
    style I fill:#ffebee
    style J fill:#fff3e0
```

### Standard Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: {
    field?: string;
    code?: string;
    constraint?: string;
  };
  requestId?: string;
}
```

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant API_Gateway
    participant Auth_Service
    participant Protected_Endpoint
    
    Client->>API_Gateway: Request with Auth Header
    API_Gateway->>Auth_Service: Validate Token
    
    alt Valid Token
        Auth_Service-->>API_Gateway: User Context
        API_Gateway->>Protected_Endpoint: Authorized Request
        Protected_Endpoint-->>API_Gateway: Response
        API_Gateway-->>Client: Success Response
    else Invalid Token
        Auth_Service-->>API_Gateway: Authentication Error
        API_Gateway-->>Client: 401 Unauthorized
    end
```

## Rate Limiting Strategy

```mermaid
graph TB
    A[Incoming Request] --> B[Rate Limiter]
    B --> C{Within Limits?}
    
    C -->|Yes| D[Process Request]
    C -->|No| E[429 Rate Limited]
    
    D --> F[Update Counter]
    F --> G[Continue Processing]
    
    E --> H[Rate Limit Headers]
    H --> I[Error Response]
    
    subgraph "Rate Limit Configuration"
        J[Window: 15 minutes]
        K[Max Requests: 100]
        L[Per IP Address]
        M[Headers: X-RateLimit-*]
    end
    
    B --> J
    B --> K
    B --> L
    H --> M
    
    style E fill:#ffebee
    style G fill:#e8f5e8
```

## API Versioning Strategy

```mermaid
graph LR
    A[Client Request] --> B{Version Specified?}
    
    B -->|Header: API-Version| C[Use Specified Version]
    B -->|URL: /api/v2/...| D[Use URL Version]
    B -->|No Version| E[Use Default Version]
    
    C --> F[Route to Version Handler]
    D --> F
    E --> F
    
    F --> G[Version-Specific Controller]
    G --> H[Response]
    
    subgraph "Version Support"
        I[v1: Legacy Support]
        J[v2: Current Version]
        K[v3: Beta Features]
    end
    
    F --> I
    F --> J
    F --> K
```

## Content Negotiation

```mermaid
graph TD
    A[Client Request] --> B[Accept Header Analysis]
    
    B --> C{Content Type?}
    C -->|application/json| D[JSON Response]
    C -->|text/csv| E[CSV Export]
    C -->|application/pdf| F[PDF Report]
    C -->|application/xml| G[XML Response]
    
    D --> H[JSON Formatter]
    E --> I[CSV Formatter]
    F --> J[PDF Generator]
    G --> K[XML Formatter]
    
    H --> L[Response]
    I --> L
    J --> L
    K --> L
    
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#ffecb3
```

## Performance Monitoring

```mermaid
graph TB
    A[API Request] --> B[Performance Middleware]
    B --> C[Start Timer]
    C --> D[Process Request]
    D --> E[End Timer]
    E --> F[Log Metrics]
    
    F --> G[Response Time]
    F --> H[Memory Usage]
    F --> I[CPU Usage]
    F --> J[Database Queries]
    F --> K[Cache Operations]
    
    G --> L[Monitoring Dashboard]
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M[Performance Alerts]
    L --> N[Scaling Decisions]
    
    style M fill:#ffebee
    style N fill:#e8f5e8
```

## API Documentation Standards

### OpenAPI Specification
- **Schema Definitions**: Complete request/response schemas
- **Authentication**: Security scheme documentation
- **Examples**: Real-world request/response examples
- **Error Codes**: Comprehensive error documentation

### Best Practices
- **Consistent Naming**: camelCase for JSON properties
- **Resource Naming**: Plural nouns for collections
- **HTTP Methods**: Semantic HTTP verb usage
- **Status Codes**: Appropriate HTTP status codes
- **Idempotency**: Safe operations for GET, PUT, DELETE

This API design provides a robust, scalable, and developer-friendly interface that follows REST principles while supporting the complex data processing requirements of the YouTube Analytics Platform.