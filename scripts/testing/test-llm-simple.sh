#!/bin/bash

echo "🤖 Testing LLM Scraping Service"
echo "================================"

BASE_URL="http://localhost:5000"

echo ""
echo "1. Testing Health Endpoint..."
echo "GET $BASE_URL/api/llm-scraping/health"
curl -s "$BASE_URL/api/llm-scraping/health" | jq . 2>/dev/null || curl -s "$BASE_URL/api/llm-scraping/health"

echo ""
echo ""
echo "2. Testing Configuration Endpoint..."
echo "GET $BASE_URL/api/llm-scraping/config"
curl -s "$BASE_URL/api/llm-scraping/config" | jq . 2>/dev/null || curl -s "$BASE_URL/api/llm-scraping/config"

echo ""
echo ""
echo "3. Testing Cost Estimation..."
echo "POST $BASE_URL/api/llm-scraping/estimate-cost"
curl -s -X POST "$BASE_URL/api/llm-scraping/estimate-cost" \
  -H "Content-Type: application/json" \
  -d '{"videoCount": 5, "provider": "anthropic"}' | jq . 2>/dev/null || \
curl -s -X POST "$BASE_URL/api/llm-scraping/estimate-cost" \
  -H "Content-Type: application/json" \
  -d '{"videoCount": 5, "provider": "anthropic"}'

echo ""
echo ""
echo "4. Testing Small Batch Scraping..."
echo "POST $BASE_URL/api/llm-scraping/batch-scrape"
curl -s -X POST "$BASE_URL/api/llm-scraping/batch-scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "videoIds": ["dQw4w9WgXcQ", "L_jWHffIx5E"],
    "batchSize": 2,
    "costLimit": 0.10,
    "provider": "anthropic"
  }' | jq . 2>/dev/null || \
curl -s -X POST "$BASE_URL/api/llm-scraping/batch-scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "videoIds": ["dQw4w9WgXcQ", "L_jWHffIx5E"],
    "batchSize": 2,
    "costLimit": 0.10,
    "provider": "anthropic"
  }'

echo ""
echo ""
echo "5. Testing Metrics..."
echo "GET $BASE_URL/api/llm-scraping/metrics"
curl -s "$BASE_URL/api/llm-scraping/metrics" | jq . 2>/dev/null || curl -s "$BASE_URL/api/llm-scraping/metrics"

echo ""
echo ""
echo "✅ Test completed!" 