# Rabbit Analytics - Quick Setup Guide

This is a quick setup guide for the newly organized Rabbit YouTube Analytics Platform.

## 🚀 Quick Start

### 1. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your API keys and configuration
# At minimum, you'll need:
# - OPENROUTER_API_KEY (for LLM features)
# - YOUTUBE_API_KEY (optional, for API enrichment)
# - MONGODB_URI (if using external MongoDB)
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install

# Return to root
cd ..
```

### 3. Start Services
```bash
# Option 1: Use the startup script
./scripts/utilities/start-services.sh

# Option 2: Start manually
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 4. Test the Setup
```bash
# Run a simple test
node scripts/testing/test-gemma-3-4b-demo.js

# Check if services are running
curl http://localhost:5000/health
curl http://localhost:3000
```

## 📁 Repository Organization

The repository has been cleaned up and organized:

### Environment Variables
- **`.env`** - Main environment configuration (consolidated from all previous .env files)
- **`.env.example`** - Comprehensive template with documentation
- **Removed**: Multiple scattered .env files (backend/.env.example, frontend/.env.example, .env.gemma, etc.)

### Scripts Organization
All utility scripts moved to `scripts/` directory:
- **`scripts/testing/`** - LLM tests, accuracy tests, demo scripts
- **`scripts/debugging/`** - Database checks, pipeline debugging
- **`scripts/demos/`** - Demo scripts and sample data
- **`scripts/utilities/`** - Startup scripts, database utilities

### Documentation Cleanup
- **`docs/`** - Organized technical documentation
- **Removed**: 12+ redundant markdown files from root
- **Consolidated**: All implementation summaries, test results, and setup guides

## 🔧 Configuration Notes

### Environment Variables
The main `.env` file now contains all configuration options:
- **Backend settings**: Port, database, API keys
- **Frontend settings**: Next.js public variables
- **LLM configuration**: OpenRouter, model selection, cost limits
- **Scraping settings**: Rate limits, caching, fallback options
- **Logging configuration**: Levels, formats, monitoring

### API Keys Required
For full functionality, you'll need:
1. **OpenRouter API Key** - For LLM-powered scraping (highly recommended)
2. **YouTube API Key** - For metadata enrichment (optional)
3. **MongoDB URI** - If using external MongoDB (optional, defaults to local)

### Cost Management
The LLM integration includes built-in cost management:
- Default cost limit: $10 per session
- Gemma 3 4B model: ~$0.000006 per video (ultra-low cost)
- Caching enabled to reduce redundant API calls

## 🎯 Key Features Available

### AI-Powered Analysis
- **Gemma 3 4B Integration**: Cost-effective AI model for data extraction
- **Multi-Model Support**: Anthropic, OpenAI, Meta, Google, Mistral via OpenRouter
- **Intelligent Fallback**: Automatic switching between API, scraping, and LLM methods

### Performance Features
- **Batch Processing**: Handle large datasets efficiently
- **Concurrent Processing**: Up to 500 concurrent requests
- **Intelligent Caching**: Reduce API costs and improve speed
- **Real-time Monitoring**: Cost tracking and usage limits

## 🐛 Troubleshooting

### Common Issues

1. **Environment Variables Not Loaded**
   ```bash
   # Ensure .env is in the root directory
   ls -la .env
   
   # Check if dotenv is installed
   cd backend && npm list dotenv
   ```

2. **Scripts Not Working**
   ```bash
   # Make shell scripts executable
   chmod +x scripts/utilities/start-services.sh
   chmod +x scripts/testing/*.sh
   ```

3. **Dependencies Missing**
   ```bash
   # Install all dependencies
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Services Not Starting**
   ```bash
   # Check if ports are available
   lsof -i :3000 -i :5000
   
   # Start MongoDB if using local instance
   mongod
   ```

### Debug Scripts
Use the debugging scripts for troubleshooting:
```bash
# Database connectivity check
node scripts/debugging/debug-database-check.js

# Processing pipeline debug
node scripts/debugging/debug-processing-pipeline.js

# Force reprocessing
node scripts/debugging/debug-force-reprocessing.js
```

## 📚 Next Steps

1. **Read Documentation**: Check `docs/README.md` for comprehensive guides
2. **Run Tests**: Try the demo scripts in `scripts/testing/`
3. **Configure LLM**: Set up OpenRouter API key for AI features
4. **Upload Data**: Use the frontend to upload YouTube watch history

## 🤝 Development

The repository is now organized for easier development:
- Clear separation of concerns
- Consolidated environment management
- Organized scripts and utilities
- Comprehensive documentation

For development guidelines, see `docs/developer-guide.md` and `docs/git-workflow.md`.