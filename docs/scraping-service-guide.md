# YouTube Web Scraping Service Guide

## Overview

The YouTube Scraping Service is a comprehensive solution designed to replace or supplement the YouTube Data API v3 when facing quota limitations. It uses multiple extraction strategies to reliably gather video metadata from YouTube pages without requiring API quotas.

## Features

### Multiple Extraction Strategies
- **JSON-LD Structured Data**: Extracts data from schema.org VideoObject markup
- **ytInitialData Parsing**: Parses YouTube's internal data structure
- **Meta Tags**: Extracts Open Graph and Twitter card metadata
- **DOM Selectors**: Fallback CSS selector-based extraction

### Anti-Detection Measures
- User-Agent rotation with realistic browser strings
- Request rate limiting (configurable delay between requests)
- Circuit breaker pattern for handling rate limits
- Graceful error handling and retry logic
- Optional headless browser support via Playwright

### Performance & Reliability
- Intelligent caching system (24-hour default TTL)
- Concurrent request limiting
- Batch processing with small batch sizes
- Comprehensive error tracking and statistics
- Fallback mechanism between API and scraping

## Configuration

### Environment Variables

```bash
# Web Scraping Configuration
SCRAPING_ENABLED=true
SCRAPING_CONCURRENT_REQUESTS=3
SCRAPING_DELAY_MS=2000
SCRAPING_TIMEOUT_MS=30000
SCRAPING_RETRY_ATTEMPTS=3
SCRAPING_ENABLE_JAVASCRIPT=false
SCRAPING_ENABLE_BROWSER=true
SCRAPING_CACHE_ENABLED=true
SCRAPING_CACHE_TTL=86400

# Service Configuration
DEFAULT_ENRICHMENT_SERVICE=auto  # Options: api, scraping, auto
```

### Configuration Options

| Option | Description | Default | Recommended |
|--------|-------------|---------|-------------|
| `SCRAPING_ENABLED` | Enable/disable scraping service | `true` | `true` |
| `SCRAPING_CONCURRENT_REQUESTS` | Max concurrent scraping requests | `3` | `2-5` |
| `SCRAPING_DELAY_MS` | Delay between requests (ms) | `2000` | `1500-3000` |
| `SCRAPING_TIMEOUT_MS` | Request timeout (ms) | `30000` | `15000-30000` |
| `SCRAPING_RETRY_ATTEMPTS` | Number of retry attempts | `3` | `2-3` |
| `SCRAPING_ENABLE_JAVASCRIPT` | Enable JS execution | `false` | `false` |
| `SCRAPING_ENABLE_BROWSER` | Enable headless browser | `true` | `true` |
| `SCRAPING_CACHE_ENABLED` | Enable result caching | `true` | `true` |
| `SCRAPING_CACHE_TTL` | Cache TTL in seconds | `86400` | `43200-86400` |

## Usage

### Basic Implementation

```typescript
import { YouTubeScrapingService, ScrapingConfig } from './services/YouTubeScrapingService';

const config: ScrapingConfig = {
  maxConcurrentRequests: 3,
  requestDelayMs: 2000,
  retryAttempts: 3,
  timeout: 30000,
  userAgents: [],
  enableJavaScript: false,
  enableBrowser: true,
  cacheEnabled: true,
  cacheTTL: 86400
};

const scrapingService = new YouTubeScrapingService(config);

// Enrich video entries (same interface as YouTubeAPIService)
const enrichedEntries = await scrapingService.enrichVideoEntries(videoEntries);
```

### Integration with ParserService

```typescript
import { ParserService } from './services/ParserService';

const parseOptions = {
  enrichWithAPI: true,
  useScrapingService: true,  // Use scraping instead of API
  includeAds: false,
  includeShorts: true
};

const result = await parserService.parseWatchHistory(htmlContent, parseOptions);
```

## API Endpoints

### Scraping Statistics
```
GET /api/scraping/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestCount": 150,
    "successCount": 142,
    "errorCount": 8,
    "successRate": 94.67,
    "circuitBreakerOpen": false,
    "cacheHitRate": 23.5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Clear Scraping Cache
```
DELETE /api/scraping/cache
```

### Test Video Scraping
```
GET /api/scraping/test/:videoId
```

**Example:**
```
GET /api/scraping/test/dQw4w9WgXcQ
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "scrapedData": {
      "title": "Rick Astley - Never Gonna Give You Up",
      "channelName": "RickAstleyVEVO",
      "duration": 213,
      "viewCount": 1000000000,
      "publishedAt": "2009-10-25T00:00:00.000Z"
    },
    "metadata": {
      "scrapingDuration": 1250,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "fieldsExtracted": 5
    }
  }
}
```

### Extract Video ID
```
POST /api/scraping/extract-video-id
```

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Health Check
```
GET /api/scraping/health
```

## Data Fields Extracted

| Field | Description | Source Priority |
|-------|-------------|-----------------|
| `title` | Video title | ytInitialData > JSON-LD > Meta Tags |
| `channelName` | Channel name | ytInitialData > JSON-LD > DOM |
| `channelId` | Channel ID | ytInitialData > JSON-LD |
| `description` | Video description | ytInitialData > JSON-LD > Meta Tags |
| `duration` | Video length (seconds) | ytInitialData > JSON-LD > Meta Tags |
| `viewCount` | View count | ytInitialData > JSON-LD > DOM |
| `likeCount` | Like count | ytInitialData > JSON-LD |
| `commentCount` | Comment count | ytInitialData > JSON-LD |
| `publishedAt` | Publish date | ytInitialData > JSON-LD |
| `tags` | Video tags/keywords | ytInitialData > JSON-LD |
| `thumbnailUrl` | Thumbnail URL | ytInitialData > JSON-LD > Meta Tags |

## Migration Guide

### Phase 1: Setup and Testing
1. Install required dependencies:
   ```bash
   npm install playwright@^1.40.0 cheerio@^1.1.0 p-limit@^4.0.0 tough-cookie@^4.1.3
   npx playwright install chromium
   ```

2. Configure environment variables in `.env`:
   ```bash
   SCRAPING_ENABLED=true
   DEFAULT_ENRICHMENT_SERVICE=auto
   ```

3. Test the scraping service:
   ```bash
   curl http://localhost:5000/api/scraping/test/dQw4w9WgXcQ
   ```

### Phase 2: Gradual Migration
1. Enable scraping alongside API:
   ```bash
   DEFAULT_ENRICHMENT_SERVICE=auto  # API with scraping fallback
   ```

2. Monitor performance:
   ```bash
   curl http://localhost:5000/api/scraping/stats
   ```

### Phase 3: Full Migration
1. Switch to scraping-first:
   ```bash
   DEFAULT_ENRICHMENT_SERVICE=scraping
   ```

2. Optional: Disable API service entirely by removing `YOUTUBE_API_KEY`

## Performance Benchmarks

### Speed Comparison
| Service | Avg Request Time | Batch Processing (50 videos) |
|---------|------------------|------------------------------|
| YouTube API | 200-500ms | 10-15 seconds |
| Scraping (fetch) | 800-1200ms | 45-60 seconds |
| Scraping (browser) | 1500-2500ms | 75-120 seconds |

### Success Rates
| Scenario | API Success Rate | Scraping Success Rate |
|----------|------------------|----------------------|
| Normal operations | 95-99% | 85-95% |
| Rate limited | 0% | 80-90% |
| Popular videos | 99% | 95% |
| Obscure videos | 95% | 75-85% |

## Best Practices

### Rate Limiting
- Keep `SCRAPING_DELAY_MS` at least 1500ms
- Limit concurrent requests to 2-5
- Monitor error rates and adjust accordingly

### Error Handling
- Always implement fallback mechanisms
- Cache successful results to avoid re-scraping
- Use circuit breaker pattern for consistent failures

### Compliance
- Respect robots.txt guidelines
- Implement reasonable rate limits
- Monitor for rate limiting responses
- Consider using residential proxies for large-scale operations

### Monitoring
- Track success rates and error patterns
- Monitor scraping duration trends
- Set up alerts for circuit breaker activation
- Regular cache hit rate analysis

## Troubleshooting

### Common Issues

**Circuit Breaker Activated**
```
Error: Circuit breaker is open, skipping scraping
```
- Solution: Wait 5 minutes for reset, or restart service
- Prevention: Reduce request rate, check for IP blocking

**Browser Initialization Failed**
```
Error: Failed to initialize browser
```
- Solution: Ensure Playwright is properly installed
- Check: `npx playwright install chromium`

**Low Success Rate**
```
Success rate: 45%
```
- Check YouTube blocking patterns
- Verify user agent rotation
- Increase request delays
- Consider switching extraction strategies

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=debug
```

## Security Considerations

### IP Rotation
- Consider using proxy rotation for large-scale operations
- Monitor for IP-based rate limiting

### User Agent Management
- Rotate user agents regularly
- Use realistic browser strings
- Avoid patterns that indicate automation

### Data Privacy
- Cache only necessary data
- Implement cache expiration
- Follow data retention policies

## Future Enhancements

### Planned Features
- Proxy rotation support
- Advanced fingerprint randomization
- Machine learning-based extraction
- Real-time success rate optimization
- Enhanced JavaScript execution support

### Performance Improvements
- Parallel processing optimization
- Smarter caching strategies
- Adaptive rate limiting
- Regional request distribution

## Support

For issues or questions regarding the YouTube Scraping Service:

1. Check the logs for detailed error messages
2. Verify configuration settings
3. Test with known working video IDs
4. Monitor service health endpoints
5. Review performance statistics

## Legal Considerations

⚠️ **Important**: Web scraping should be performed responsibly and in compliance with:
- YouTube's Terms of Service
- Applicable copyright laws
- Rate limiting and anti-abuse policies
- Local data protection regulations

This service is intended for legitimate analytics and research purposes. Users are responsible for ensuring compliance with all applicable laws and terms of service.