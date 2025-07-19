# 📝 Logging & Debugging Framework

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Backend Logging](#backend-logging)
5. [Frontend Logging](#frontend-logging)
6. [Log Levels & Usage](#log-levels--usage)
7. [Performance Monitoring](#performance-monitoring)
8. [Debugging Workflows](#debugging-workflows)
9. [Monitoring Integrations](#monitoring-integrations)
10. [Best Practices](#best-practices)

## Overview

The Rabbit Analytics platform uses a comprehensive logging and debugging framework designed for:

- **Structured logging** with consistent formats across backend and frontend
- **Correlation tracking** for request tracing across services
- **Performance monitoring** with automatic slow operation detection
- **Sensitive data protection** with automatic sanitization
- **Environment-aware configuration** with development and production modes
- **Remote logging support** for centralized monitoring
- **Debugging utilities** specific to video processing workflows

## Quick Start

### Backend Setup

1. **Configure environment variables** in `backend/.env`:
```bash
# Basic logging
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_TO_FILE=true

# Enhanced features
ENABLE_REQUEST_LOGGING=true
ENABLE_CORRELATION_IDS=true
ENABLE_PERFORMANCE_MONITORING=true
LOG_SANITIZE_SENSITIVE=true
```

2. **Use the logger** in your services:
```typescript
import { logger, createTimer, logDatabaseOperation } from '../utils/logger';

// Basic logging
logger.info('Processing started', { videoCount: 150 });
logger.error('Processing failed', { error: error.message });

// Performance monitoring
const timer = createTimer('Video Processing');
timer.stage('Parsing HTML');
// ... work
timer.stage('API Enrichment');
// ... work
timer.end({ totalVideos: 150 });

// Database operations
logDatabaseOperation('find', 'videos', { status: 'active' });
```

### Frontend Setup

1. **Configure environment variables** in `frontend/.env.local`:
```bash
# Basic logging
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING=true
NEXT_PUBLIC_LOG_API_CALLS=true
NEXT_PUBLIC_LOG_PERFORMANCE=true
```

2. **Use the logger** in your components:
```typescript
import logger, { createTimer } from '@/utils/logger';

// Basic logging
logger.info('Component mounted', { component: 'VideoTable' });
logger.error('API call failed', error, { endpoint: '/api/videos' });

// API calls
logger.logApiCall('GET', '/api/videos', 200, 150);

// Performance monitoring
const timer = createTimer('Data Loading');
timer.stage('Fetching');
// ... fetch data
timer.end({ recordCount: 100 });
```

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Minimum log level |
| `LOG_FORMAT` | `json` | Log format: `json` or `text` |
| `LOG_TO_FILE` | `false` (dev) / `true` (prod) | Enable file logging |
| `LOG_MAX_FILE_SIZE` | `10MB` | Maximum log file size |
| `LOG_MAX_FILES` | `5` | Number of log files to retain |
| `ENABLE_REQUEST_LOGGING` | `true` | Log HTTP requests/responses |
| `ENABLE_CORRELATION_IDS` | `true` | Generate correlation IDs |
| `ENABLE_PERFORMANCE_MONITORING` | `true` | Track slow operations |
| `SLOW_QUERY_THRESHOLD` | `1000` | Slow operation threshold (ms) |
| `LOG_SANITIZE_SENSITIVE` | `true` | Remove sensitive data from logs |
| `LOG_DATABASE_OPERATIONS` | `true` | Log database queries |
| `LOG_EXTERNAL_SERVICE_CALLS` | `true` | Log API calls to external services |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Minimum log level |
| `NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING` | `true` | Log to browser console |
| `NEXT_PUBLIC_ENABLE_REMOTE_LOGGING` | `false` | Send logs to remote endpoint |
| `NEXT_PUBLIC_LOG_API_CALLS` | `true` | Log API requests |
| `NEXT_PUBLIC_LOG_PERFORMANCE` | `true` | Log performance metrics |
| `NEXT_PUBLIC_LOG_USER_INTERACTIONS` | `false` | Log user clicks/interactions |

## Backend Logging

### Logger Instance

```typescript
import { logger } from '../utils/logger';

// Log levels (lowest to highest priority)
logger.trace('Detailed debugging info');      // Most verbose
logger.debug('Debug information');            // Development info  
logger.info('General information');           // Normal operations
logger.warn('Warning conditions');            // Potential issues
logger.error('Error conditions');             // Errors that need attention
```

### Structured Logging

```typescript
// Basic structured logging
logger.info('User login', {
  userId: '12345',
  email: 'user@example.com',
  loginMethod: 'oauth',
  category: 'authentication'
});

// With correlation ID (automatically added if available)
logger.debug('Processing video batch', {
  batchId: 'batch-001',
  videoCount: 50,
  category: 'video_processing'
});
```

### Performance Monitoring

```typescript
import { createTimer } from '../utils/logger';

// Create a performance timer
const timer = createTimer('Video Analysis');

// Log stages
timer.stage('HTML Parsing', { htmlSize: 1024000 });
// ... parsing work

timer.stage('API Enrichment', { videoIds: videoIds.length });
// ... API calls

timer.stage('Database Storage', { recordCount: videos.length });
// ... database operations

// End timer (logs total time and checks for slow operations)
const totalTime = timer.end({ 
  success: true, 
  totalVideos: videos.length 
});
```

### Database Operation Logging

```typescript
import { logDatabaseOperation } from '../utils/logger';

// Log database queries
logDatabaseOperation('find', 'videos', 
  { status: 'active', userId: '123' }, 
  { limit: 50, sort: { createdAt: -1 } }
);

logDatabaseOperation('insertMany', 'videos', 
  { count: videos.length },
  { ordered: false }
);
```

### External Service Logging

```typescript
import { logExternalServiceCall } from '../utils/logger';

// Log API calls to external services
logExternalServiceCall('YouTube API', '/youtube/v3/videos', 'GET', {
  videoIds: videoIds.slice(0, 3), // Log sample IDs
  batchSize: videoIds.length,
  quotaUsed: 100
});
```

### Error Logging with Context

```typescript
import { logError } from '../utils/logger';

try {
  // ... some operation
} catch (error) {
  logError(error, {
    operation: 'video_processing',
    videoId: 'abc123',
    userId: user.id,
    additionalContext: {
      batchSize: videos.length,
      processingOptions: options
    }
  });
  
  // Re-throw or handle as needed
  throw error;
}
```

## Frontend Logging

### Logger Instance

```typescript
import logger from '@/utils/logger';

// Basic logging
logger.info('Page loaded', { page: 'dashboard' });
logger.warn('API response slow', { duration: 2500 });
logger.error('Upload failed', uploadError, { 
  fileName: file.name,
  fileSize: file.size 
});
```

### API Call Logging

```typescript
// Automatic API call logging
logger.logApiCall('POST', '/api/videos/process', 200, 1250);

// With error
logger.logApiCall('GET', '/api/videos', 500, 850, new Error('Server error'));

// Manual API logging
const startTime = performance.now();
try {
  const response = await fetch('/api/data');
  const duration = performance.now() - startTime;
  logger.logApiCall('GET', '/api/data', response.status, duration);
} catch (error) {
  const duration = performance.now() - startTime;
  logger.logApiCall('GET', '/api/data', 0, duration, error);
}
```

### Performance Monitoring

```typescript
import { createTimer } from '@/utils/logger';

// Component render timing
const timer = createTimer('VideoTable Render');

useEffect(() => {
  timer.stage('Data Fetching');
  
  fetchData().then(() => {
    timer.stage('Data Processing');
    // ... process data
    
    timer.end({ recordCount: data.length });
  });
}, []);

// Manual performance logging
logger.logPerformance('Chart Render', 150, 'ms', {
  chartType: 'bar',
  dataPoints: 1000
});
```

### Component Lifecycle Logging

```typescript
// Component mounting/unmounting
useEffect(() => {
  logger.logComponentMount('VideoTable', { filters, sortBy });
  
  return () => {
    logger.logComponentUnmount('VideoTable');
  };
}, []);
```

### User Interaction Logging

```typescript
// Button clicks, form submissions, etc.
const handleSubmit = () => {
  logger.logUserInteraction('form_submit', 'upload_form', {
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0)
  });
  
  // ... handle submit
};
```

## Log Levels & Usage

### When to Use Each Level

| Level | Purpose | Examples |
|-------|---------|----------|
| **trace** | Very detailed debugging | Function entry/exit, loop iterations |
| **debug** | Development debugging | State changes, API responses, processing steps |
| **info** | Normal operations | User actions, system events, completed operations |
| **warn** | Potential issues | Deprecated API usage, fallback behaviors, quota warnings |
| **error** | Error conditions | Failed operations, exceptions, validation errors |

### Category Guidelines

Use categories to group related log entries:

- `authentication` - Login, logout, permissions
- `video_processing` - Video parsing, enrichment, classification
- `api_enrichment` - YouTube API interactions
- `database` - Database operations
- `performance` - Timing and optimization
- `user_interaction` - Frontend user actions
- `external_service` - Third-party API calls
- `error_boundary` - React error boundaries

## Performance Monitoring

### Automatic Slow Operation Detection

Operations slower than `SLOW_QUERY_THRESHOLD` (default: 1000ms) are automatically flagged:

```typescript
// This will log as WARNING if it takes > 1000ms
const timer = createTimer('Database Query');
// ... slow database operation
timer.end(); // Automatically detects slow operation
```

### Performance Metrics

Track key performance indicators:

```typescript
// Backend - processing performance
debugVideoProcessing.startParsing(htmlLength, options);
debugVideoProcessing.entriesExtracted(rawCount, validCount);
debugVideoProcessing.apiEnrichmentStart(videoIds, batchCount);

// Frontend - user experience metrics
logger.logPerformance('Page Load', loadTime);
logger.logPerformance('API Response', responseTime);
logger.logPerformance('Component Render', renderTime);
```

## Debugging Workflows

### Video Processing Pipeline Debugging

1. **Enable debug logging**:
```bash
export LOG_LEVEL=debug
```

2. **Look for these log patterns**:
```
🚀 Starting video processing
📄 DOM parsing completed
📝 Entry extraction completed 
🔄 Duplicate removal completed
🌐 Starting API enrichment
📦 API batch processed
📊 Generating metrics
```

3. **Common issues and log indicators**:

| Issue | Log Pattern | Solution |
|-------|-------------|----------|
| Low extraction rate | `extractionSuccessRate: 45%` | Check HTML format changes |
| API quota exhaustion | `quotaRemaining: 0` | Check API key and limits |
| Slow processing | `🐌 SLOW: Video Processing` | Check system resources |
| High duplicate rate | `duplicateRate: 80%` | Check for duplicate uploads |

### Request Tracing

Each request gets a correlation ID for end-to-end tracing:

```bash
# Find all logs for a specific request
grep "abc-123-def" application.log

# Or using JSON logs
jq 'select(.correlationId == "abc-123-def")' application.log
```

### Error Investigation

1. **Find the error**:
```bash
grep "ERROR" logs/error-*.log | tail -10
```

2. **Get the correlation ID** from the error log

3. **Trace the full request**:
```bash
grep "correlation-id-here" logs/application-*.log
```

### Performance Analysis

1. **Find slow operations**:
```bash
grep "🐌 SLOW" logs/application-*.log
```

2. **Analyze timing patterns**:
```bash
jq 'select(.timerEnd == true) | {label: .message, duration: .meta.totalMs}' logs/application-*.log
```

## Monitoring Integrations

### Sentry Integration (Optional)

```bash
# Backend
SENTRY_DSN=your-sentry-dsn
ENABLE_SENTRY_LOGGING=true

# Frontend  
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Datadog Integration (Optional)

```bash
# Backend
DATADOG_API_KEY=your-api-key
ENABLE_DATADOG_LOGGING=true

# Frontend
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=your-token
NEXT_PUBLIC_DATADOG_APPLICATION_ID=your-app-id
```

### LogTail Integration (Optional)

```bash
# Backend
LOGTAIL_SOURCE_TOKEN=your-token
ENABLE_LOGTAIL_LOGGING=true

# Frontend
NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN=your-token
NEXT_PUBLIC_ENABLE_REMOTE_LOGGING=true
```

## Best Practices

### ✅ Do

- **Use structured logging** with meaningful metadata
- **Include correlation IDs** for request tracing
- **Log at appropriate levels** based on importance
- **Use categories** to group related logs
- **Include context** in error logs
- **Monitor performance** with timers
- **Sanitize sensitive data** automatically

### ❌ Don't

- **Log sensitive information** (passwords, tokens, PII)
- **Use console.log** in production code
- **Log at wrong levels** (debug for errors, error for info)
- **Include massive objects** in log metadata
- **Forget to handle errors** in logging code
- **Log too verbosely** in production

### Code Examples

**Good logging**:
```typescript
logger.info('User uploaded file', {
  userId: user.id,
  fileName: file.name.substring(0, 50), // Truncate long names
  fileSize: file.size,
  category: 'file_upload'
});
```

**Bad logging**:
```typescript
console.log('File uploaded:', file); // Contains potentially sensitive data
logger.error('Something went wrong'); // No context
```

### Security Considerations

1. **Sensitive data is automatically sanitized** based on field name patterns
2. **Correlation IDs are random UUIDs** - not predictable
3. **Log files have restricted permissions** in production
4. **Remote logging uses secure connections** (HTTPS)

### Performance Considerations

1. **Async logging** doesn't block application flow
2. **Log buffering** reduces I/O overhead
3. **Automatic log rotation** prevents disk space issues
4. **Level-based filtering** reduces log volume in production

## Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| No logs appearing | Wrong log level | Check `LOG_LEVEL` environment variable |
| Logs missing context | No correlation ID | Enable `ENABLE_CORRELATION_IDS=true` |
| Large log files | Too verbose | Increase log level for production |
| Sensitive data in logs | Sanitization disabled | Enable `LOG_SANITIZE_SENSITIVE=true` |
| Performance impact | Synchronous logging | Use async transports |

### Debugging the Logger

```typescript
// Check logger configuration
console.log('Logger level:', logger.level);
console.log('Transports:', logger.transports.map(t => t.constructor.name));

// Test logging at different levels
logger.trace('Trace test');
logger.debug('Debug test');
logger.info('Info test');
logger.warn('Warn test');
logger.error('Error test');
```

### Log File Locations

- **Development**: Console only (unless `LOG_TO_FILE=true`)
- **Production**: `logs/application-YYYY-MM-DD.log`
- **Errors**: `logs/error-YYYY-MM-DD.log`

---

For additional help or questions about the logging system, check the existing logs or create an issue with the `logging` label.