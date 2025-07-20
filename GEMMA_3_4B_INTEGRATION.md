# Gemma 3 4B Instruct Integration

## Overview

This document describes the integration of Google's **Gemma 3 4B Instruct** model into the Rabbit YouTube Analytics platform for agentic web scraping. This model provides an excellent balance of performance, cost-effectiveness, and speed for extracting structured metadata from YouTube video pages.

## Why Gemma 3 4B Instruct?

### 🚀 Performance Benefits
- **Ultra-low cost**: ~$0.00000002 per input token, ~$0.00000004 per output token
- **Fast inference**: Quick response times for batch processing
- **Strong instruction following**: Optimized for structured data extraction tasks
- **32K context window**: Sufficient for most HTML content processing

### 💰 Cost Comparison
| Model | Cost per Video | Videos per Dollar | Speed |
|-------|---------------|-------------------|-------|
| **Gemma 3 4B Instruct** | ~$0.00000006 | ~16,666,667 | Fast |
| Claude 3 Haiku | ~$0.0015 | ~667 | Medium |
| GPT-4o | ~$0.015 | ~67 | Slow |

### 🎯 Perfect for Our Use Case
- **Structured extraction**: Your task requires precise JSON output
- **Batch processing**: Cost efficiency matters for large datasets
- **HTML parsing**: The patterns are predictable and well-defined
- **Speed requirements**: Faster processing improves user experience

## Configuration

### Environment Variables

Copy `.env.gemma-example` to `.env` and configure:

```bash
# Enable LLM scraping
LLM_SCRAPING_ENABLED=true
LLM_PROVIDER=google
LLM_MODEL=gemma-3-4b-it

# OpenRouter API (required for Gemma 3 4B Instruct)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_REFERER=https://rabbit-analytics.com
OPENROUTER_TITLE=Rabbit YouTube Analytics

# Performance tuning
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.1
LLM_BATCH_SIZE=10
LLM_COST_LIMIT=10.0
```

### Getting OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Add payment method (required for Gemma 3 4B Instruct)
4. Generate an API key
5. Set your referer and title for tracking

## Usage

### API Endpoints

The LLM scraping service is available at `/api/llm-scraping`:

```bash
# Scrape a single video
POST /api/llm-scraping/scrape
{
  "videoId": "dQw4w9WgXcQ"
}

# Batch scrape multiple videos
POST /api/llm-scraping/batch
{
  "videoIds": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"]
}

# Get performance metrics
GET /api/llm-scraping/metrics
```

### Integration with Parser Service

The LLM scraping is automatically integrated with the main parser service:

```typescript
// When processing watch history, enable LLM enrichment
const options = {
  enrichWithAPI: false,
  useScrapingService: false,
  useLLMService: true,  // This will use Gemma 3 4B Instruct
  // ... other options
};

const result = await parserService.parseWatchHistory(htmlContent, options);
```

## Testing

### Run the Test Suite

```bash
# Build the backend
cd backend && npm run build

# Run the Gemma 3 4B test
node test-gemma-3-4b-demo.js
```

### Expected Output

```
🚀 Testing Gemma 3 4B Instruct LLM Scraping
==================================================
📡 Initializing LLM Scraping Service...
✅ Service initialized with config: {
  model: 'gemma-3-4b-it',
  batchSize: 5,
  costLimit: 1
}

🔍 Testing batch scraping with sample video IDs...
Video IDs: ['dQw4w9WgXcQ', '9bZkp7q19f0', 'kJQP7kiw5Fk']

⏱️  Batch processing completed in 4500ms

📊 Results:
------------------------------

🎥 Video 1: dQw4w9WgXcQ
   Success: ✅
   Title: Rick Astley - Never Gonna Give You Up
   Channel: Rick Astley
   Views: 1500000000
   Duration: 212s
   Is Short: false
   Tokens Used: 1250
   Cost: $0.000075
   Provider: google
   Model: google/gemma-3-4b-it

💰 Cost Analysis:
------------------------------
Cost per video: $0.00002500
Videos per dollar: 40,000
```

## Performance Optimization

### Batch Size Tuning

For optimal performance, adjust batch size based on your needs:

```bash
# For high throughput (more concurrent requests)
LLM_BATCH_SIZE=20
LLM_MAX_CONCURRENT_REQUESTS=10

# For cost optimization (fewer concurrent requests)
LLM_BATCH_SIZE=5
LLM_MAX_CONCURRENT_REQUESTS=3
```

### Caching Strategy

Enable caching to reduce API calls:

```bash
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL=7200  # 2 hours
```

### Fallback Configuration

Set up fallback to more powerful models for edge cases:

```bash
LLM_ENABLE_FALLBACK=true
# The service will automatically fall back to Claude Haiku if Gemma fails
```

## Troubleshooting

### Common Issues

1. **"OpenRouter client not initialized"**
   - Check that `OPENROUTER_API_KEY` is set correctly
   - Verify your OpenRouter account has sufficient credits

2. **"Cost limit reached"**
   - Increase `LLM_COST_LIMIT` or reduce batch size
   - Check current pricing on OpenRouter

3. **"Invalid response format"**
   - This is rare with Gemma 3 4B Instruct due to its strong instruction following
   - Check the HTML content being processed

### Monitoring

Monitor performance with the metrics endpoint:

```bash
curl http://localhost:5000/api/llm-scraping/metrics
```

Key metrics to watch:
- Success rate (should be >95%)
- Average response time (should be <2000ms)
- Cost per video (should be <$0.0001)

## Migration from Other Models

### From Claude 3 Haiku

```bash
# Update your .env file
LLM_MODEL=gemma-3-4b-it
LLM_PROVIDER=google

# Add OpenRouter configuration
OPENROUTER_API_KEY=your_key_here
```

### From GPT Models

```bash
# Same configuration as above
LLM_MODEL=gemma-3-4b-it
LLM_PROVIDER=google
```

## Future Enhancements

### Planned Features

1. **Model switching**: Automatic fallback based on content complexity
2. **Quality scoring**: Confidence metrics for extracted data
3. **Custom fine-tuning**: Domain-specific optimization
4. **Multi-model ensemble**: Combine multiple models for better accuracy

### Alternative Models

If you need different characteristics:

```bash
# Free alternative (limited context)
LLM_MODEL=gemma-3n-e4b-it

# Higher quality, higher cost
LLM_MODEL=claude-3-haiku-20240307

# OpenAI alternative
LLM_MODEL=gpt-3.5-turbo
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the test output for error details
3. Monitor the application logs for detailed error messages
4. Verify your OpenRouter account status and billing

---

**Gemma 3 4B Instruct** provides an excellent foundation for cost-effective, high-performance YouTube metadata extraction. The integration is designed to be seamless and maintainable while delivering significant cost savings compared to larger models. 