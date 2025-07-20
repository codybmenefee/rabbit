# Setting Up Gemma 3 4B Instruct Model

## Why Switch from DeepSeek to Gemma?

The DeepSeek model is currently taking 30-60 seconds per video, which is too slow for processing 14,000 videos. Gemma 3 4B Instruct should be much faster and more efficient.

## Step 1: Get OpenRouter API Key

1. **Visit OpenRouter**: Go to https://openrouter.ai/
2. **Sign Up/Login**: Create an account or log in
3. **Get API Key**: 
   - Go to your dashboard
   - Click "API Keys" 
   - Create a new API key
   - Copy the key (starts with `sk-or-`)

## Step 2: Update Environment Configuration

Replace the placeholder in your `.env` file:

```bash
# Replace this line:
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here

# With your real API key:
OPENROUTER_API_KEY=sk-or-your-actual-key-here
```

## Step 3: Verify Configuration

Your `.env` should have these settings:

```bash
LLM_SCRAPING_ENABLED=true
LLM_PROVIDER=google
LLM_MODEL=gemma-3-4b-it
OPENROUTER_API_KEY=sk-or-your-actual-key-here
OPENROUTER_REFERER=https://rabbit-analytics.com
OPENROUTER_TITLE=Rabbit YouTube Analytics
```

## Step 4: Restart the Server

After updating the API key, restart the backend server:

```bash
# Stop the current server
pkill -f ts-node

# Start the server again
cd backend && npm run dev
```

## Step 5: Test Gemma Configuration

Run this test to verify Gemma is working:

```bash
curl -s -X POST http://localhost:5000/api/llm-scraping/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "videoIds": ["dQw4w9WgXcQ"],
    "config": {
      "provider": "google",
      "model": "gemma-3-4b-it"
    }
  }' | jq .
```

## Expected Results

With a real OpenRouter API key, you should see:
- **Model**: `google/gemma-3-4b-it`
- **Response Time**: 5-15 seconds (much faster than DeepSeek)
- **Cost**: ~$0.001-0.005 per video
- **Success Rate**: 95%+

## Cost Estimation for 14,000 Videos

- **Gemma 3 4B Instruct**: ~$0.001-0.005 per video
- **Total Cost**: $14-70 for 14,000 videos
- **Processing Time**: ~2-4 hours (vs 10+ hours with DeepSeek)

## Troubleshooting

### If you still see DeepSeek:
1. Check that `OPENROUTER_API_KEY` is set correctly
2. Restart the server completely
3. Verify the API key is valid on OpenRouter dashboard

### If you get API errors:
1. Check your OpenRouter account balance
2. Verify the API key has proper permissions
3. Check rate limits in OpenRouter dashboard

## Next Steps

Once Gemma is working:
1. Test with a small batch (10 videos)
2. Monitor response times and success rates
3. Adjust batch sizes based on performance
4. Proceed with 14,000 video processing

The system is ready - you just need to add your OpenRouter API key! 