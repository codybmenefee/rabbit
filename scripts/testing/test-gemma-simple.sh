#!/bin/bash

# Simple test script for Gemma 3 4B Instruct integration
# This script builds the backend and runs a quick test

echo "🚀 Testing Gemma 3 4B Instruct Integration"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the backend
echo "📦 Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
cd ..

echo "✅ Build completed successfully"

# Check if test file exists
if [ ! -f "test-gemma-3-4b-demo.js" ]; then
    echo "❌ Test file not found: test-gemma-3-4b-demo.js"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    if [ -f ".env.gemma-example" ]; then
        cp .env.gemma-example .env
        echo "✅ Created .env from .env.gemma-example"
        echo "⚠️  Please update .env with your actual OpenRouter API key"
        echo "   You can get one at: https://openrouter.ai"
    else
        echo "❌ No .env.gemma-example file found"
        exit 1
    fi
fi

# Check if OPENROUTER_API_KEY is set
if ! grep -q "OPENROUTER_API_KEY=your_openrouter_api_key_here" .env; then
    echo "✅ OpenRouter API key appears to be configured"
else
    echo "⚠️  Please update .env with your actual OpenRouter API key"
    echo "   Current value: $(grep OPENROUTER_API_KEY .env)"
fi

echo ""
echo "🧪 Running Gemma 3 4B Instruct test..."
echo "   (This will make actual API calls to OpenRouter)"
echo ""

# Run the test
node test-gemma-3-4b-demo.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Test completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the full application: ./start-app.sh"
    echo "2. Upload a watch history file through the web interface"
    echo "3. Enable LLM scraping in the processing options"
    echo ""
    echo "For more information, see: GEMMA_3_4B_INTEGRATION.md"
else
    echo ""
    echo "❌ Test failed. Check the error messages above."
    echo ""
    echo "Common issues:"
    echo "1. Invalid OpenRouter API key"
    echo "2. Insufficient credits on OpenRouter account"
    echo "3. Network connectivity issues"
    echo ""
    echo "For troubleshooting, see: GEMMA_3_4B_INTEGRATION.md"
    exit 1
fi 