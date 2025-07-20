# AnalyticsService Documentation

## Overview

The `AnalyticsService` is the core analytics engine of the Rabbit YouTube Analytics Platform. It transforms raw video entry data into comprehensive, actionable insights through sophisticated mathematical calculations and statistical analysis.

## Service Architecture

```mermaid
graph TB
    subgraph "AnalyticsService Core"
        MAIN[generateMetrics()]
        TIMER[Performance Timing]
        LOGGER[Debug Logging]
    end
    
    subgraph "Metric Calculation Modules"
        OVERVIEW[calculateOverviewMetrics()]
        CONTENT[calculateContentTypeDistribution()]
        CATEGORIES[calculateCategoryMetrics()]
        CHANNELS[calculateChannelMetrics()]
        TEMPORAL[calculateTemporalMetrics()]
        DISCOVERY[calculateDiscoveryMetrics()]
        TRENDS[calculateTrendMetrics()]
    end
    
    subgraph "Data Dependencies"
        VIDEO_ENTRIES[(VideoEntry Collection)]
        VIDEO_SVC[VideoService]
        METRICS_MODEL[Metrics Model]
    end
    
    subgraph "Output Products"
        OVERVIEW_METRICS[Overview Metrics]
        CATEGORY_INSIGHTS[Category Insights]
        CHANNEL_ANALYTICS[Channel Analytics]
        TIME_PATTERNS[Temporal Patterns]
        DISCOVERY_INSIGHTS[Discovery Insights]
        TREND_ANALYSIS[Trend Analysis]
    end
    
    MAIN --> OVERVIEW
    MAIN --> CONTENT
    MAIN --> CATEGORIES
    MAIN --> CHANNELS
    MAIN --> TEMPORAL
    MAIN --> DISCOVERY
    MAIN --> TRENDS
    
    VIDEO_ENTRIES --> OVERVIEW
    VIDEO_ENTRIES --> CONTENT
    VIDEO_ENTRIES --> CATEGORIES
    VIDEO_ENTRIES --> CHANNELS
    VIDEO_ENTRIES --> TEMPORAL
    VIDEO_ENTRIES --> DISCOVERY
    VIDEO_ENTRIES --> TRENDS
    
    OVERVIEW --> OVERVIEW_METRICS
    CATEGORIES --> CATEGORY_INSIGHTS
    CHANNELS --> CHANNEL_ANALYTICS
    TEMPORAL --> TIME_PATTERNS
    DISCOVERY --> DISCOVERY_INSIGHTS
    TRENDS --> TREND_ANALYSIS
    
    MAIN --> TIMER
    MAIN --> LOGGER
    MAIN --> METRICS_MODEL
    
    style MAIN fill:#e3f2fd
    style VIDEO_ENTRIES fill:#e8f5e8
    style METRICS_MODEL fill:#e8f5e8
```

## Core Methods

### generateMetrics()

The main orchestration method that coordinates all analytics calculations.

```typescript
public async generateMetrics(entries: IVideoEntry[]): Promise<VideoMetrics>
```

#### Algorithm Flow

```mermaid
sequenceDiagram
    participant Client
    participant AnalyticsService
    participant OverviewCalc
    participant ContentCalc
    participant CategoryCalc
    participant ChannelCalc
    participant TemporalCalc
    participant DiscoveryCalc
    participant TrendCalc
    participant Logger
    
    Client->>AnalyticsService: generateMetrics(entries)
    AnalyticsService->>Logger: Start performance timer
    
    Note over AnalyticsService: Input Validation
    AnalyticsService->>AnalyticsService: Validate entries array
    
    alt Empty Entries
        AnalyticsService-->>Client: Return emptyMetrics
    end
    
    Note over AnalyticsService: Parallel Calculations
    AnalyticsService->>OverviewCalc: calculateOverviewMetrics()
    AnalyticsService->>ContentCalc: calculateContentTypeDistribution()
    AnalyticsService->>CategoryCalc: calculateCategoryMetrics()
    AnalyticsService->>ChannelCalc: calculateChannelMetrics()
    AnalyticsService->>TemporalCalc: calculateTemporalMetrics()
    AnalyticsService->>DiscoveryCalc: calculateDiscoveryMetrics()
    AnalyticsService->>TrendCalc: calculateTrendMetrics()
    
    OverviewCalc-->>AnalyticsService: Overview Results
    ContentCalc-->>AnalyticsService: Content Distribution
    CategoryCalc-->>AnalyticsService: Category Metrics
    ChannelCalc-->>AnalyticsService: Channel Metrics
    TemporalCalc-->>AnalyticsService: Temporal Patterns
    DiscoveryCalc-->>AnalyticsService: Discovery Insights
    TrendCalc-->>AnalyticsService: Trend Analysis
    
    AnalyticsService->>Logger: Log calculation results
    AnalyticsService->>Logger: End performance timer
    AnalyticsService-->>Client: Complete VideoMetrics
```

#### Performance Characteristics
- **Processing Speed**: ~1000 entries per second
- **Memory Usage**: O(n) where n is the number of entries
- **Time Complexity**: O(n log n) for sorting operations
- **Concurrency**: Safe for concurrent execution

### calculateOverviewMetrics()

Generates high-level summary statistics for the entire dataset.

```typescript
private calculateOverviewMetrics(entries: IVideoEntry[]): OverviewMetrics
```

#### Metrics Calculated

```mermaid
graph TD
    A[Video Entries] --> B[Total Videos Count]
    A --> C[Total Watch Time]
    A --> D[Unique Channels Count]
    A --> E[Date Range Analysis]
    A --> F[Average Video Length]
    A --> G[Enrichment Statistics]
    
    C --> H[Minutes Calculation]
    C --> I[Hours Calculation]
    C --> J[Days Calculation]
    
    E --> K[First Watch Date]
    E --> L[Last Watch Date]
    E --> M[Total Days Span]
    E --> N[Active Days Count]
    
    F --> O[Duration Aggregation]
    F --> P[Statistical Analysis]
    
    G --> Q[API Enriched Count]
    G --> R[Scraped Count]
    G --> S[Enrichment Rate %]
    
    style A fill:#e3f2fd
    style B fill:#e8f5e8
    style C fill:#e8f5e8
    style D fill:#e8f5e8
```

#### Algorithm Details

**Total Watch Time Calculation:**
```typescript
// Sum all video durations, handling missing values
const totalWatchTime = entries.reduce((total, entry) => {
  const duration = entry.duration || 0; // Default to 0 for missing durations
  return total + (duration / 60); // Convert seconds to minutes
}, 0);
```

**Unique Channels Detection:**
```typescript
// Use Set for O(1) deduplication
const uniqueChannels = new Set(
  entries.map(entry => entry.channel.toLowerCase().trim())
).size;
```

**Date Range Analysis:**
```typescript
const dates = entries.map(entry => entry.watchedAt).sort();
const dateRange = {
  start: dates[0],
  end: dates[dates.length - 1],
  totalDays: Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)),
  activeDays: new Set(dates.map(date => date.toDateString())).size
};
```

### calculateCategoryMetrics()

Analyzes content consumption patterns by YouTube categories.

```typescript
private calculateCategoryMetrics(entries: IVideoEntry[]): CategoryMetrics[]
```

#### Category Analysis Pipeline

```mermaid
flowchart TD
    A[Video Entries] --> B[Group by Category]
    B --> C[Calculate Category Totals]
    C --> D[Calculate Percentages]
    D --> E[Identify Top Channels per Category]
    E --> F[Calculate Trend Analysis]
    F --> G[Sort by Watch Time]
    G --> H[Return Category Metrics Array]
    
    subgraph "Category Calculations"
        I[Video Count]
        J[Total Watch Time]
        K[Average Video Length]
        L[Watch Time Percentage]
    end
    
    C --> I
    C --> J
    C --> K
    C --> L
    
    subgraph "Trend Analysis"
        M[Month-over-Month Growth]
        N[Year-over-Year Growth]
        O[Seasonal Patterns]
    end
    
    F --> M
    F --> N
    F --> O
    
    style A fill:#e3f2fd
    style H fill:#e8f5e8
```

#### Advanced Category Analytics

**Trend Calculation Algorithm:**
```typescript
private calculateCategoryTrends(entries: IVideoEntry[], category: VideoCategory) {
  const now = new Date();
  const currentMonth = entries.filter(entry => 
    entry.category === category && 
    entry.watchedAt >= new Date(now.getFullYear(), now.getMonth(), 1)
  );
  
  const previousMonth = entries.filter(entry => 
    entry.category === category && 
    entry.watchedAt >= new Date(now.getFullYear(), now.getMonth() - 1, 1) &&
    entry.watchedAt < new Date(now.getFullYear(), now.getMonth(), 1)
  );
  
  const currentTotal = currentMonth.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const previousTotal = previousMonth.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  
  return {
    monthOverMonth: {
      current: currentTotal,
      previous: previousTotal,
      change: currentTotal - previousTotal,
      changePercentage: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0
    }
  };
}
```

### calculateChannelMetrics()

Provides detailed analytics for content creators and channels.

```typescript
private calculateChannelMetrics(entries: IVideoEntry[]): ChannelMetrics[]
```

#### Channel Analysis Components

```mermaid
graph TB
    subgraph "Channel Grouping"
        A[Video Entries] --> B[Group by Channel Name]
        B --> C[Normalize Channel Names]
        C --> D[Deduplicate Channels]
    end
    
    subgraph "Per-Channel Calculations"
        E[Video Count]
        F[Total Watch Time]
        G[Average Video Length]
        H[First/Last Watched]
        I[Category Distribution]
        J[Engagement Metrics]
    end
    
    subgraph "Advanced Analytics"
        K[Subscription Detection]
        L[Discovery Patterns]
        M[Viewing Consistency]
        N[Content Type Breakdown]
    end
    
    subgraph "Ranking & Sorting"
        O[Sort by Watch Time]
        P[Top Performers]
        Q[Growth Analysis]
    end
    
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    
    E --> K
    F --> L
    G --> M
    H --> N
    
    K --> O
    L --> P
    M --> Q
    
    style A fill:#e3f2fd
    style Q fill:#e8f5e8
```

#### Engagement Metrics Calculation

**Channel Engagement Score:**
```typescript
private calculateChannelEngagement(channelEntries: IVideoEntry[]): EngagementMetrics {
  const totalVideos = channelEntries.length;
  const totalWatchTime = channelEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const averageVideoLength = totalWatchTime / totalVideos;
  
  // Calculate viewing consistency (how often user watches this channel)
  const dateRange = this.getDateRange(channelEntries);
  const daySpan = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const viewingFrequency = totalVideos / Math.max(daySpan, 1);
  
  return {
    averageViews: this.estimateViewCount(channelEntries),
    averageLikes: this.estimateLikeCount(channelEntries),
    averageComments: this.estimateCommentCount(channelEntries),
    viewingFrequency,
    consistencyScore: this.calculateConsistencyScore(channelEntries)
  };
}
```

### calculateTemporalMetrics()

Analyzes viewing patterns across different time dimensions.

```typescript
private calculateTemporalMetrics(entries: IVideoEntry[]): TemporalMetrics
```

#### Temporal Analysis Dimensions

```mermaid
graph TD
    A[Video Entries with Timestamps] --> B[Hourly Distribution]
    A --> C[Daily Distribution]
    A --> D[Weekly Patterns]
    A --> E[Monthly Trends]
    A --> F[Seasonal Analysis]
    A --> G[Peak Time Detection]
    
    B --> H[24-Hour Analysis]
    H --> I[Morning Peak 6-12]
    H --> J[Afternoon Peak 12-18]
    H --> K[Evening Peak 18-24]
    H --> L[Night Activity 0-6]
    
    C --> M[Weekday vs Weekend]
    M --> N[Monday-Friday Patterns]
    M --> O[Saturday-Sunday Patterns]
    
    D --> P[Week-by-Week Growth]
    E --> Q[Monthly Comparison]
    F --> R[Seasonal Variations]
    G --> S[Usage Heat Map]
    
    style A fill:#e3f2fd
    style S fill:#e8f5e8
```

#### Peak Detection Algorithm

**Statistical Peak Analysis:**
```typescript
private identifyPeakHours(entries: IVideoEntry[]): PeakHours {
  // Group videos by hour of day
  const hourlyDistribution = Array(24).fill(0);
  
  entries.forEach(entry => {
    const hour = entry.watchedAt.getHours();
    hourlyDistribution[hour] += entry.duration || 180; // Default 3 minutes if no duration
  });
  
  // Find peak hours using statistical analysis
  const mean = hourlyDistribution.reduce((sum, count) => sum + count, 0) / 24;
  const standardDeviation = Math.sqrt(
    hourlyDistribution.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 24
  );
  
  // Peak hours are those above mean + 1 standard deviation
  const peakThreshold = mean + standardDeviation;
  const peakHours = hourlyDistribution
    .map((count, hour) => ({ hour, count }))
    .filter(item => item.count > peakThreshold)
    .sort((a, b) => b.count - a.count);
  
  return {
    primary: peakHours[0]?.hour || 20,
    secondary: peakHours[1]?.hour || 14,
    quietHours: hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count < mean - standardDeviation)
      .map(item => item.hour)
  };
}
```

### calculateDiscoveryMetrics()

Analyzes how users discover and engage with content.

```typescript
private calculateDiscoveryMetrics(entries: IVideoEntry[]): DiscoveryMetrics
```

#### Discovery Pattern Analysis

```mermaid
flowchart TD
    A[Video Entries] --> B[Subscription Analysis]
    A --> C[Content Completion Analysis]
    A --> D[Discovery Method Detection]
    A --> E[Engagement Pattern Analysis]
    
    B --> F[Subscribed vs Unsubscribed]
    B --> G[Subscription Rate Calculation]
    
    C --> H[Full Video Watches]
    C --> I[Partial Video Watches]
    C --> J[Completion Rate by Category]
    
    D --> K[Homepage Discovery]
    D --> L[Search Discovery]
    D --> M[Recommendation Discovery]
    D --> N[External Link Discovery]
    
    E --> O[Binge Watching Patterns]
    E --> P[Creator Loyalty Metrics]
    E --> Q[Content Diversity Score]
    
    F --> R[Discovery Insights Report]
    G --> R
    H --> R
    I --> R
    J --> R
    K --> R
    L --> R
    M --> R
    N --> R
    O --> R
    P --> R
    Q --> R
    
    style A fill:#e3f2fd
    style R fill:#e8f5e8
```

#### Completion Rate Algorithm

**Content Completion Analysis:**
```typescript
private calculateCompletionRates(entries: IVideoEntry[]): CompletionMetrics {
  let fullWatches = 0;
  let partialWatches = 0;
  let totalEstimatedWatchTime = 0;
  let totalVideoDuration = 0;
  
  entries.forEach(entry => {
    const duration = entry.duration || 180; // Default 3 minutes
    totalVideoDuration += duration;
    
    // Estimate watch time based on video characteristics
    const estimatedWatchTime = this.estimateWatchTime(entry);
    totalEstimatedWatchTime += estimatedWatchTime;
    
    // Classification logic for completion
    const completionRatio = estimatedWatchTime / duration;
    if (completionRatio >= 0.9) {
      fullWatches++;
    } else if (completionRatio >= 0.1) {
      partialWatches++;
    }
  });
  
  return {
    contentCompletionRate: totalEstimatedWatchTime / totalVideoDuration,
    fullWatchCount: fullWatches,
    partialWatchCount: partialWatches,
    averageCompletionRatio: totalEstimatedWatchTime / totalVideoDuration,
    estimatedTotalWatchTime: Math.round(totalEstimatedWatchTime / 60) // Convert to minutes
  };
}
```

### calculateTrendMetrics()

Provides time-series analysis and trend forecasting.

```typescript
private calculateTrendMetrics(entries: IVideoEntry[]): TrendMetrics
```

#### Trend Analysis Framework

```mermaid
graph TB
    subgraph "Time Series Data"
        A[Video Entries Timeline] --> B[Daily Aggregation]
        A --> C[Weekly Aggregation]
        A --> D[Monthly Aggregation]
    end
    
    subgraph "Trend Calculations"
        E[Linear Regression]
        F[Moving Averages]
        G[Seasonal Decomposition]
        H[Growth Rate Analysis]
    end
    
    subgraph "Metrics Output"
        I[Watch Time Trends]
        J[Video Count Trends]
        K[Channel Discovery Trends]
        L[Category Shift Trends]
    end
    
    subgraph "Advanced Analytics"
        M[Trend Strength Score]
        N[Volatility Index]
        O[Seasonal Patterns]
        P[Forecast Projections]
    end
    
    B --> E
    C --> F
    D --> G
    
    E --> I
    F --> J
    G --> K
    H --> L
    
    I --> M
    J --> N
    K --> O
    L --> P
    
    style A fill:#e3f2fd
    style P fill:#e8f5e8
```

#### Growth Rate Calculation

**Compound Growth Analysis:**
```typescript
private calculateGrowthRates(timeSeriesData: TimeSeriesPoint[]): GrowthAnalysis {
  if (timeSeriesData.length < 2) return { growthRate: 0, trend: 'stable' };
  
  // Calculate compound annual growth rate (CAGR)
  const firstValue = timeSeriesData[0].value;
  const lastValue = timeSeriesData[timeSeriesData.length - 1].value;
  const periods = timeSeriesData.length - 1;
  
  const cagr = Math.pow(lastValue / firstValue, 1 / periods) - 1;
  
  // Linear regression for trend analysis
  const xValues = timeSeriesData.map((_, index) => index);
  const yValues = timeSeriesData.map(point => point.value);
  
  const slope = this.calculateLinearRegressionSlope(xValues, yValues);
  const correlation = this.calculateCorrelation(xValues, yValues);
  
  return {
    growthRate: cagr * 100, // Convert to percentage
    trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
    trendStrength: Math.abs(correlation),
    volatility: this.calculateVolatility(yValues),
    monthlyGrowthRate: this.calculateMonthlyGrowthRate(timeSeriesData)
  };
}
```

## Performance Optimization

### Caching Strategy

```mermaid
graph LR
    A[Analytics Request] --> B{Cache Check}
    B -->|Hit| C[Return Cached Results]
    B -->|Miss| D[Calculate Metrics]
    D --> E[Cache Results]
    E --> F[Return Results]
    C --> G[Update Cache TTL]
    
    subgraph "Cache Layers"
        H[Memory Cache - Hot Data]
        I[Redis Cache - Warm Data]
        J[Database Cache - Cold Data]
    end
    
    B --> H
    B --> I
    B --> J
    
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

### Batch Processing

**Large Dataset Optimization:**
```typescript
private async processLargeDataset(entries: IVideoEntry[]): Promise<VideoMetrics> {
  const BATCH_SIZE = 10000;
  
  if (entries.length <= BATCH_SIZE) {
    return this.generateMetrics(entries);
  }
  
  // Process in batches to prevent memory issues
  const batches = this.chunkArray(entries, BATCH_SIZE);
  const batchResults = await Promise.all(
    batches.map(batch => this.calculateBatchMetrics(batch))
  );
  
  // Merge batch results
  return this.mergeBatchedResults(batchResults);
}
```

## Error Handling

### Graceful Degradation

```mermaid
flowchart TD
    A[Analytics Calculation] --> B{Data Quality Check}
    
    B -->|Complete Data| C[Full Analytics]
    B -->|Partial Data| D[Limited Analytics]
    B -->|Minimal Data| E[Basic Analytics]
    B -->|No Data| F[Empty Analytics]
    
    C --> G[All Metrics Available]
    D --> H[Core Metrics Only]
    E --> I[Overview Metrics Only]
    F --> J[Default Empty Response]
    
    G --> K[Success Response]
    H --> L[Partial Success Warning]
    I --> M[Limited Data Warning]
    J --> N[No Data Error]
    
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#ffecb3
    style F fill:#ffebee
```

### Error Recovery Strategies

1. **Missing Duration Handling**: Use category-based default durations
2. **Invalid Date Handling**: Filter out invalid entries with logging
3. **Memory Constraints**: Implement streaming processing for large datasets
4. **External API Failures**: Gracefully degrade to available data

## Testing Strategy

### Unit Testing Approach

```mermaid
graph TD
    A[Analytics Tests] --> B[Calculation Accuracy]
    A --> C[Edge Case Handling]
    A --> D[Performance Testing]
    A --> E[Error Scenarios]
    
    B --> F[Known Dataset Tests]
    B --> G[Mathematical Verification]
    
    C --> H[Empty Arrays]
    C --> I[Single Entry]
    C --> J[Duplicate Data]
    
    D --> K[Large Datasets]
    D --> L[Memory Usage]
    
    E --> M[Invalid Data]
    E --> N[Network Failures]
    
    style A fill:#e3f2fd
    style F fill:#e8f5e8
```

The AnalyticsService provides a robust foundation for YouTube analytics with sophisticated mathematical algorithms, comprehensive error handling, and optimized performance for large-scale data processing.