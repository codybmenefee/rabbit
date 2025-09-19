# Data Flow Architecture

## Overview

Rabbit processes YouTube viewing history data through a clear, multi-stage pipeline that transforms raw HTML into actionable insights.

## Data Pipeline

### 1. Data Ingestion
```
Google Takeout HTML → File Upload → Parser → WatchRecord[]
```

**Input**: `watch-history.html` from Google Takeout
**Output**: Array of `WatchRecord` objects
**Location**: `lib/parsers/youtube-parser.ts`

### 2. Data Normalization
```
WatchRecord[] → Computed Fields → Enhanced WatchRecord[]
```

**Process**:
- Extract video/channel IDs from URLs
- Parse and normalize timestamps
- Classify topics using keyword matching
- Generate computed fields (year, month, week, hour)
- Create YoY comparison keys

**Location**: `lib/parsers/youtube-parser.ts`

### 3. Data Storage
```
Enhanced WatchRecord[] → IndexedDB → Persistent Storage
```

**Storage Strategy**:
- Client-side IndexedDB for privacy
- No server-side data storage
- Automatic data persistence
- Support for large datasets (50K+ records)

**Location**: `lib/storage/indexeddb.ts`

### 4. Data Aggregation
```
WatchRecord[] + FilterOptions → Aggregated Metrics
```

**Aggregation Types**:
- KPI calculations (total videos, channels, watch time)
- Time-based trends (monthly, quarterly, yearly)
- Channel analysis (top channels, loyalty scores)
- Topic analysis (trending topics, distribution)
- Session analysis (viewing patterns, duration)

**Location**: `lib/aggregations/`

### 5. Data Visualization
```
Aggregated Metrics → React Components → Interactive Charts
```

**Visualization Tools**:
- Recharts for data visualization
- Custom components for specialized views
- Real-time filtering and interaction
- Responsive design for all devices

**Location**: `components/dashboard/`, `components/analytics/`

## Data Types

### Core Types
- `WatchRecord`: Base data structure for individual video views
- `FilterOptions`: User-selected filters for data analysis
- `KPIMetrics`: Key performance indicators
- `ChannelMetrics`: Channel-specific analytics

### Aggregation Types
- `MonthlyCount`: Time-series data for trends
- `DayHourMatrix`: Heatmap data for viewing patterns
- `TopicCount`: Topic distribution and trends
- `EnhancedChannelMetrics`: Advanced channel analysis

## Error Handling

### Parsing Errors
- Graceful handling of malformed HTML
- Fallback strategies for different formats
- Detailed error reporting and logging
- User-friendly error messages

### Data Validation
- Timestamp validation and correction
- URL format verification
- Data completeness checks
- Duplicate detection and handling

## Performance Considerations

### Large Dataset Handling
- Streaming parsing for large files
- Chunked processing to prevent UI blocking
- Web Workers for heavy computations
- Efficient data structures and algorithms

### Memory Management
- Lazy loading of large datasets
- Efficient data structures
- Garbage collection optimization
- Memory usage monitoring

## Future Enhancements

### Phase 2: Server-Side Processing
- Move parsing to server-side
- Database storage for persistence
- Multi-user support
- Advanced analytics with server resources

### Phase 3: Real-Time Features
- Live data updates
- Real-time collaboration
- Advanced filtering and search
- Export and sharing capabilities
