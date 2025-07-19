# 🐛 Debug Logging System for Rabbit Analytics

> **📖 For the complete logging framework documentation, see [LOGGING.md](./LOGGING.md)**  
> **🔧 For quick debugging help, see [debugging-checklist.md](./debugging-checklist.md)**

## Overview

This document covers the enhanced debug logging system specifically for video processing workflows. The system provides detailed insights into every stage of the processing pipeline with correlation tracking and performance monitoring.

## 🚀 Features Added

### 1. Enhanced Logger Configuration
- **Structured Logging**: JSON metadata support for better parsing
- **Debug Level**: New debug level with colored output
- **Performance Timers**: Built-in timing utilities for tracking processing stages
- **Development Mode**: Automatic debug level in development environment

### 2. Video Processing Pipeline Debugging

#### ParserService Debug Logs
- **HTML Parsing Stages**: DOM creation, selector attempts, entry extraction
- **Entry Extraction**: Success/failure rates, validation details
- **Duplicate Removal**: Counts and statistics
- **Filtering Operations**: Pre/post enrichment filtering with detailed counts
- **Performance Timing**: Stage-by-stage timing analysis

#### YouTubeAPIService Debug Logs  
- **API Batch Processing**: Batch creation, size, and processing details
- **Quota Management**: Real-time quota usage tracking and warnings
- **Enrichment Process**: Video ID extraction, API calls, success rates
- **Cache Operations**: Cache hits/misses for performance optimization
- **Error Handling**: Detailed error tracking with affected video IDs

#### AnalyticsService Debug Logs
- **Metrics Generation**: Stage-by-stage metric calculation timing
- **Data Analysis**: Category, channel, and temporal pattern analysis
- **Trend Calculations**: Time series and comparative analysis details
- **Performance Stats**: Processing statistics and data quality metrics

#### ClassifierService Debug Logs
- **Content Classification**: Decision reasoning for ads, shorts, and standard videos
- **Classification Logic**: Detailed rules evaluation and results

### 3. Performance Monitoring
- **Timer Utilities**: `createTimer()` for measuring processing stages
- **Bottleneck Detection**: Automatic identification of slow operations
- **Memory Usage**: Optional memory usage tracking
- **Stage-by-Stage Analysis**: Granular performance insights

## 📊 Debug Log Examples

### Video Processing Pipeline
```
2025-07-18 15:03:12:045 debug: 🚀 Starting video processing {"htmlContentLength":2847392,"options":{"enrichWithAPI":true,"includeAds":false,"includeShorts":true},"phase":"PARSE_START"}

2025-07-18 15:03:12:156 debug: ⏱️  Video Processing Pipeline - HTML DOM Parsing {"elapsedMs":111}

2025-07-18 15:03:12:234 debug: 📄 DOM parsing completed {"entriesFound":1247,"selectorUsed":".outer-cell","phase":"DOM_PARSED"}

2025-07-18 15:03:12:267 debug: 📝 Entry extraction completed {"rawEntriesFound":1247,"validEntriesExtracted":1201,"invalidEntriesSkipped":46,"phase":"ENTRIES_EXTRACTED"}

2025-07-18 15:03:12:289 debug: 🔄 Duplicate removal completed {"originalCount":1201,"uniqueCount":1156,"duplicatesRemoved":45,"phase":"DUPLICATES_REMOVED"}
```

### YouTube API Enrichment
```
2025-07-18 15:03:15:123 debug: 🌐 Starting API enrichment {"totalVideoIds":500,"batchCount":10,"phase":"API_ENRICHMENT_START"}

2025-07-18 15:03:15:234 debug: Processing batch 1/10 {"batchIndex":1,"batchSize":50,"videoIds":["dQw4w9WgXcQ","oHg5SJYRHA0",...],"quotaRemaining":9850}

2025-07-18 15:03:15:567 debug: 📦 API batch processed {"batchIndex":1,"batchSize":50,"successCount":47,"phase":"API_BATCH_PROCESSED"}
```

### Analytics Generation
```
2025-07-18 15:03:18:123 debug: 📊 Generating metrics {"entryCount":1156,"metricsTypes":["overview","temporal","categories","channels"],"phase":"METRICS_GENERATION"}

2025-07-18 15:03:18:234 debug: ⏱️  Analytics Generation - Overview Metrics {"elapsedMs":45}

2025-07-18 15:03:18:345 debug: Category metrics calculated {"categoriesFound":12,"topCategories":[{"category":"ENTERTAINMENT","count":324},{"category":"MUSIC","count":198}]}
```

## 🔧 Configuration

### Environment Variables
```bash
# Enable debug logging
LOG_LEVEL=debug

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD=1000

# Development features
ENABLE_DETAILED_LOGGING=true
LOG_API_REQUESTS=true
LOG_DATABASE_OPERATIONS=true
```

### Logger Configuration
The logger automatically enables debug level in development mode:
```typescript
level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')
```

## 🔍 Using Debug Logs

### 1. Enable Debug Mode
```bash
# Set environment variable
export LOG_LEVEL=debug

# Or add to .env file
echo "LOG_LEVEL=debug" >> backend/.env
```

### 2. Start the Application
```bash
cd backend && npm run dev
```

### 3. Process Video History
Upload a watch history file through the frontend or API and watch the detailed logs flow through the console.

### 4. Analyze Bottlenecks
Look for these patterns in the logs:
- **Long Processing Times**: Timer logs showing high elapsed milliseconds
- **Low Success Rates**: API batch processing with low success percentages  
- **Quota Issues**: API quota warnings and limitations
- **Classification Issues**: Content type detection problems

## 📈 Performance Insights

### Common Bottlenecks Detected
1. **HTML Parsing**: Large files can slow DOM creation
2. **API Enrichment**: YouTube API rate limits and quota exhaustion
3. **Metrics Generation**: Complex category and trend calculations
4. **Memory Usage**: Large datasets consuming excessive memory

### Optimization Tips
- Monitor API quota usage in real-time
- Use caching for repeated API calls
- Batch process API requests efficiently
- Track memory usage during large file processing

## 🛠️ Utilities Provided

### Performance Timer
```typescript
import { createTimer } from '../utils/logger';

const timer = createTimer('My Operation');
timer.stage('Stage 1');
// ... do work
timer.stage('Stage 2'); 
// ... do more work
timer.end({ metadata: 'optional' });
```

### Debug Video Processing
```typescript
import { debugVideoProcessing } from '../utils/logger';

debugVideoProcessing.startParsing(htmlContent.length, options);
debugVideoProcessing.domParsed(entriesFound, selector);
debugVideoProcessing.entriesExtracted(rawCount, validCount);
```

## 🎯 Troubleshooting Common Issues

### 1. Processing Hangs During API Enrichment
**Look for**: Quota exhaustion warnings or API timeout errors
**Solution**: Check API key validity and quota limits

### 2. Low Entry Extraction Success Rate
**Look for**: High `invalidEntriesSkipped` counts in extraction logs
**Solution**: HTML format may have changed, check selector patterns

### 3. Slow Metrics Generation
**Look for**: High elapsed times in analytics timer logs
**Solution**: Consider optimizing metric calculations for large datasets

### 4. Memory Issues
**Look for**: Performance degradation logs
**Solution**: Implement streaming or chunked processing for large files

## 📋 Debug Log Checklist

When troubleshooting issues, check these log sections:

- [ ] **Initial Processing**: HTML content size and options
- [ ] **DOM Parsing**: Selector success and entries found
- [ ] **Entry Extraction**: Success rate and validation
- [ ] **API Enrichment**: Quota usage and batch processing
- [ ] **Filtering**: Entry counts before/after filters
- [ ] **Metrics Generation**: Category and channel analysis
- [ ] **Performance Timers**: Stage-by-stage timing
- [ ] **Error Messages**: Detailed error context

## 🚀 Next Steps

The debug logging system provides comprehensive insights into the video processing pipeline. Use these logs to:

1. **Identify Bottlenecks**: Find slow operations and optimize them
2. **Monitor API Usage**: Track YouTube API quota and success rates
3. **Validate Data Quality**: Ensure proper classification and enrichment
4. **Optimize Performance**: Use timing data to improve processing speed
5. **Debug Issues**: Quickly identify and resolve processing problems 