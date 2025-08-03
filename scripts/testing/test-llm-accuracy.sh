#!/bin/bash

# LLM Accuracy Test Script
# Tests the accuracy of LLM web scraping using test-watch-history-small.html

set -e

echo "🚀 Starting LLM Accuracy Test"
echo "================================"

# Check if backend is running
echo "🔍 Checking if backend server is running..."
if ! curl -s http://localhost:5000/health > /dev/null; then
    echo "❌ Backend server is not running at http://localhost:5000"
    echo "   Please start the backend server first:"
    echo "   cd backend && npm run dev"
    exit 1
fi

echo "✅ Backend server is running"

# Check if LLM scraping is enabled
echo "🔍 Checking LLM scraping configuration..."
if ! curl -s http://localhost:5000/api/llm-scraping/health > /dev/null; then
    echo "❌ LLM scraping service is not available"
    echo "   Please ensure the following environment variables are set:"
    echo "   - LLM_SCRAPING_ENABLED=true"
    echo "   - OPENROUTER_API_KEY=your_api_key"
    echo "   - LLM_PROVIDER=google"
    echo "   - LLM_MODEL=gemma-3-4b-it"
    echo ""
    echo "   You can copy .env.gemma-example to .env and update with your API key"
    exit 1
fi

echo "✅ LLM scraping service is available"

# Check Gemma model configuration
echo "🔍 Checking Gemma model configuration..."
CONFIG_RESPONSE=$(curl -s http://localhost:5000/api/llm-scraping/config)
if echo "$CONFIG_RESPONSE" | grep -q "gemma"; then
    echo "✅ Gemma model detected in configuration"
else
    echo "⚠️  Warning: Gemma model not detected in configuration"
    echo "   Current configuration: $CONFIG_RESPONSE"
fi

# Run the accuracy test
echo ""
echo "🎯 Running LLM Accuracy Test..."
echo "================================"

# Set environment variables for the test
export API_BASE_URL="http://localhost:5000"

# Run the test script
node test-llm-accuracy.js

echo ""
echo "✅ LLM Accuracy Test completed!"
echo "================================" 