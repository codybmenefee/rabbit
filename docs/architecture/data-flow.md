# Data Processing Flow

## Overview

The Rabbit YouTube Analytics Platform processes YouTube watch history data through a sophisticated ETL (Extract, Transform, Load) pipeline that enriches raw HTML data with metadata from multiple sources and generates comprehensive analytics.

## Primary Data Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AnalyticsController
    participant ParserService
    participant VideoService
    participant EnrichmentService
    participant AnalyticsService
    participant Database
    
    User->>Frontend: Upload HTML File
    Frontend->>AnalyticsController: POST /api/analytics/upload
    
    Note over AnalyticsController: Validate request & create session
    AnalyticsController->>ParserService: parseWatchHistory(htmlContent, options)
    
    Note over ParserService: Stage 1: HTML Parsing
    ParserService->>ParserService: extractWatchHistoryEntries()
    ParserService->>ParserService: parseVideoData()
    ParserService->>ParserService: normalizeEntries()
    
    Note over ParserService: Stage 2: Duplicate Detection
    ParserService->>VideoService: checkForDuplicates(entries)
    VideoService->>Database: Query existing videos
    Database-->>VideoService: Return duplicate check results
    VideoService-->>ParserService: Return filtered entries
    
    Note over ParserService: Stage 3: Data Enrichment
    alt Enrichment Enabled
        ParserService->>EnrichmentService: enrichVideoEntries(entries)
        
        Note over EnrichmentService: Batch process videos
        loop For each video batch
            EnrichmentService->>EnrichmentService: getVideoMetadata()
            Note over EnrichmentService: API/Scraping call
        end
        
        EnrichmentService-->>ParserService: Return enriched data
    end
    
    Note over ParserService: Stage 4: Data Persistence
    ParserService->>VideoService: bulkUpsert(processedEntries)
    VideoService->>Database: Save processed videos
    Database-->>VideoService: Confirm save
    VideoService-->>ParserService: Return save results
    
    Note over ParserService: Stage 5: Analytics Generation
    ParserService->>AnalyticsService: generateMetrics(entries)
    AnalyticsService->>AnalyticsService: calculateOverviewMetrics()
    AnalyticsService->>AnalyticsService: calculateCategoryMetrics()
    AnalyticsService->>AnalyticsService: calculateChannelMetrics()
    AnalyticsService->>AnalyticsService: calculateTemporalMetrics()
    AnalyticsService-->>ParserService: Return analytics
    
    ParserService-->>AnalyticsController: Return complete results
    AnalyticsController-->>Frontend: Return session & metrics
    Frontend-->>User: Display Dashboard
```

## Enrichment Service Flow

```mermaid
sequenceDiagram
    participant ParserService
    participant EnrichmentStrategy
    participant YouTubeAPIService
    participant YouTubeScrapingService
    participant YouTubeHPScrapingService
    participant ExternalAPI
    participant Cache
    participant Database
    
    ParserService->>EnrichmentStrategy: enrichVideoEntries(entries)
    
    Note over EnrichmentStrategy: Determine enrichment method
    alt API Service Available & Quota Available
        EnrichmentStrategy->>YouTubeAPIService: getVideoMetadata(videoIds)
        YouTubeAPIService->>Cache: Check cache
        Cache-->>YouTubeAPIService: Cache miss/hit
        
        alt Cache Miss
            YouTubeAPIService->>ExternalAPI: YouTube Data API v3 call
            ExternalAPI-->>YouTubeAPIService: Return video metadata
            YouTubeAPIService->>Cache: Store in cache
        end
        
        YouTubeAPIService-->>EnrichmentStrategy: Return enriched data
        
    else API Unavailable or Quota Exceeded
        EnrichmentStrategy->>YouTubeScrapingService: getVideoMetadata(videoIds)
        
        Note over YouTubeScrapingService: Web scraping fallback
        YouTubeScrapingService->>YouTubeScrapingService: scrapeVideoData()
        YouTubeScrapingService->>Cache: Store scraped data
        YouTubeScrapingService-->>EnrichmentStrategy: Return scraped data
        
    else High Performance Mode
        EnrichmentStrategy->>YouTubeHPScrapingService: getVideoMetadata(videoIds)
        
        Note over YouTubeHPScrapingService: High-speed parallel scraping
        YouTubeHPScrapingService->>YouTubeHPScrapingService: parallelScrapeVideos()
        YouTubeHPScrapingService->>Cache: Batch cache storage
        YouTubeHPScrapingService-->>EnrichmentStrategy: Return batch results
    end
    
    EnrichmentStrategy->>Database: Store enriched entries
    EnrichmentStrategy-->>ParserService: Return enrichment results
```

## Real-time Progress Tracking

```mermaid
sequenceDiagram
    participant Frontend
    participant AnalyticsController
    participant ParserService
    participant ProgressTracker
    
    Note over Frontend: User uploads file, processing starts
    Frontend->>AnalyticsController: POST /api/analytics/upload
    AnalyticsController->>ParserService: Start processing with sessionId
    
    Note over ParserService: Processing begins
    ParserService->>ProgressTracker: updateProgress(sessionId, "parsing", 10%, "Extracting entries")
    ParserService->>ProgressTracker: updateProgress(sessionId, "duplicates", 25%, "Checking duplicates")
    ParserService->>ProgressTracker: updateProgress(sessionId, "enrichment", 50%, "Enriching videos")
    ParserService->>ProgressTracker: updateProgress(sessionId, "analytics", 85%, "Generating metrics")
    ParserService->>ProgressTracker: updateProgress(sessionId, "complete", 100%, "Processing complete")
    
    Note over Frontend: Polls for progress updates
    loop Every 2 seconds
        Frontend->>AnalyticsController: GET /api/analytics/progress/:sessionId
        AnalyticsController->>ProgressTracker: getProgress(sessionId)
        ProgressTracker-->>AnalyticsController: Return current progress
        AnalyticsController-->>Frontend: Return progress data
        Frontend->>Frontend: Update UI with progress
    end
    
    Note over Frontend: Processing complete, load results
    Frontend->>AnalyticsController: GET /api/analytics/metrics/:sessionId
    AnalyticsController-->>Frontend: Return complete analytics
```

## Error Handling and Recovery Flow

```mermaid
flowchart TD
    A[Start Processing] --> B[Parse HTML]
    B --> C{Parsing Success?}
    C -->|No| D[Log Parse Error]
    C -->|Yes| E[Check Duplicates]
    
    D --> F[Return Partial Results]
    
    E --> G{Duplicate Check Success?}
    G -->|No| H[Log DB Error]
    G -->|Yes| I[Enrich Videos]
    
    H --> I
    
    I --> J{Enrichment Success?}
    J -->|Partial| K[Continue with Available Data]
    J -->|Failed| L[Use Original Data]
    J -->|Success| M[Generate Analytics]
    
    K --> M
    L --> M
    
    M --> N{Analytics Success?}
    N -->|No| O[Return Basic Metrics]
    N -->|Yes| P[Return Complete Results]
    
    O --> Q[Log Error & Notify User]
    P --> R[Success Response]
    
    Q --> S[End]
    R --> S
    
    style D fill:#ffebee
    style H fill:#ffebee
    style L fill:#fff3e0
    style O fill:#fff3e0
    style Q fill:#ffebee
    style R fill:#e8f5e8
```

## Data Transformation Pipeline

### Stage 1: HTML Parsing and Extraction

```mermaid
flowchart LR
    A[Raw HTML Content] --> B[Regex Pattern Matching]
    B --> C[Extract Watch History Entries]
    C --> D[Parse Video URLs]
    D --> E[Extract Timestamps]
    E --> F[Normalize Channel Names]
    F --> G[Initial VideoEntry Objects]
    
    subgraph "Validation"
        H[Validate Required Fields]
        I[Filter Invalid Entries]
        J[Apply Date Range Filters]
    end
    
    G --> H
    H --> I
    I --> J
    J --> K[Validated Entries]
    
    style A fill:#e3f2fd
    style K fill:#e8f5e8
```

### Stage 2: Data Enrichment and Classification

```mermaid
flowchart TD
    A[Validated Entries] --> B[Extract Video IDs]
    B --> C[Batch Processing]
    
    C --> D{Enrichment Method}
    D -->|API| E[YouTube Data API v3]
    D -->|Scraping| F[Web Scraping Service]
    D -->|High Performance| G[Parallel Scraping]
    
    E --> H[API Response Processing]
    F --> I[HTML Parsing & Data Extraction]
    G --> J[Batch Response Processing]
    
    H --> K[Normalize API Data]
    I --> L[Normalize Scraped Data]
    J --> M[Normalize Batch Data]
    
    K --> N[Content Classification]
    L --> N
    M --> N
    
    N --> O{Content Type Detection}
    O -->|Short| P[Mark as SHORT]
    O -->|Livestream| Q[Mark as LIVESTREAM]
    O -->|Standard| R[Mark as VIDEO]
    O -->|Ad| S[Mark as ADVERTISEMENT]
    
    P --> T[Category Classification]
    Q --> T
    R --> T
    S --> U[Filter if Ads Excluded]
    
    U --> T
    T --> V[Enriched VideoEntry Objects]
    
    style A fill:#e3f2fd
    style V fill:#e8f5e8
```

### Stage 3: Analytics Generation

```mermaid
flowchart TB
    A[Enriched Video Entries] --> B[Overview Metrics Calculation]
    A --> C[Content Type Distribution]
    A --> D[Category Analysis]
    A --> E[Channel Metrics]
    A --> F[Temporal Analysis]
    A --> G[Discovery Patterns]
    A --> H[Trend Analysis]
    
    B --> I[Total Watch Time]
    B --> J[Video Count]
    B --> K[Date Range Analysis]
    
    C --> L[Video vs Shorts vs Ads]
    D --> M[Top Categories by Time]
    D --> N[Category Trends]
    
    E --> O[Top Channels]
    E --> P[Channel Engagement]
    E --> Q[Subscription Analysis]
    
    F --> R[Hourly Patterns]
    F --> S[Daily Patterns]
    F --> T[Seasonal Trends]
    
    G --> U[Discovery Methods]
    G --> V[Content Completion Rates]
    
    H --> W[Month-over-Month Growth]
    H --> X[Year-over-Year Comparison]
    
    I --> Y[Comprehensive Metrics Object]
    J --> Y
    K --> Y
    L --> Y
    M --> Y
    N --> Y
    O --> Y
    P --> Y
    Q --> Y
    R --> Y
    S --> Y
    T --> Y
    U --> Y
    V --> Y
    W --> Y
    X --> Y
    
    style A fill:#e3f2fd
    style Y fill:#e8f5e8
```

## Data Model Transformations

### Raw HTML → VideoEntry

```mermaid
graph LR
    subgraph "Raw HTML Structure"
        A["<a href='youtube.com/watch?v=xyz'>Video Title</a>"]
        B["<div>Channel Name</div>"]
        C["<div>Watched on Jan 1, 2024</div>"]
    end
    
    subgraph "Parsing Logic"
        D[URL Pattern Extraction]
        E[Title Text Extraction]
        F[Channel Name Parsing]
        G[Date/Time Parsing]
    end
    
    subgraph "VideoEntry Object"
        H[title: string]
        I[channel: string]
        J[videoId: string]
        K[watchedAt: Date]
        L[url: string]
        M[contentType: ContentType]
        N[category: VideoCategory]
    end
    
    A --> D
    A --> E
    B --> F
    C --> G
    
    D --> J
    E --> H
    F --> I
    G --> K
    D --> L
    
    J --> O[Enrichment Process]
    O --> M
    O --> N
    
    style A fill:#ffecb3
    style H fill:#e8f5e8
```

### VideoEntry → Analytics Metrics

```mermaid
graph TD
    A[VideoEntry Collection] --> B[Aggregation Functions]
    
    B --> C[Time-based Grouping]
    B --> D[Category Grouping]
    B --> E[Channel Grouping]
    B --> F[Content Type Grouping]
    
    C --> G[Daily/Weekly/Monthly Metrics]
    D --> H[Category Distribution]
    E --> I[Channel Performance]
    F --> J[Content Type Analysis]
    
    G --> K[Temporal Trends]
    H --> L[Category Insights]
    I --> M[Creator Analytics]
    J --> N[Viewing Patterns]
    
    K --> O[VideoMetrics Object]
    L --> O
    M --> O
    N --> O
    
    style A fill:#e3f2fd
    style O fill:#e8f5e8
```

## Performance Optimization Strategies

### 1. Batch Processing
- **Video Enrichment**: Process videos in batches of 50
- **Database Operations**: Bulk insert/update operations
- **API Calls**: Batch YouTube API requests

### 2. Caching Strategy
- **Redis Caching**: Cache enriched video metadata
- **Memory Caching**: Cache frequently accessed data
- **TTL Management**: Automatic cache expiration

### 3. Parallel Processing
- **Concurrent Enrichment**: Multiple enrichment streams
- **Promise Pooling**: Limit concurrent operations
- **Resource Management**: CPU and memory optimization

### 4. Database Optimization
- **Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimize database round-trips

This data flow architecture ensures efficient, reliable, and scalable processing of YouTube watch history data while providing real-time feedback to users and comprehensive error handling throughout the pipeline.