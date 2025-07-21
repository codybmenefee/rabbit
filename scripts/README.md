# Scripts Directory

This directory contains all utility scripts, test files, and development tools for the Rabbit YouTube Analytics Platform. Scripts are organized by purpose for better maintainability.

## Directory Structure

### 📧 `/testing`
Scripts for testing different features and LLM integrations:

- **`test-llm-accuracy.js`** - Tests LLM accuracy for data extraction
- **`test-llm-accuracy.sh`** - Shell script wrapper for LLM accuracy testing
- **`test-llm-simple.sh`** - Simple LLM testing script
- **`test-gemma-simple.sh`** - Simple Gemma model testing
- **`test-gemma-3-4b-demo.js`** - Gemma 3 4B Instruct model demonstration
- **`test-llm-scraping-demo.js`** - LLM-powered scraping demonstration
- **`test-openrouter-demo.js`** - OpenRouter API integration testing
- **`test-high-performance-demo.js`** - High-performance scraping tests

### 🐛 `/debugging`
Debug scripts for troubleshooting system issues:

- **`debug-database-check.js`** - Database connectivity and data integrity checks
- **`debug-force-reprocessing.js`** - Force reprocessing of failed entries
- **`debug-processing-pipeline.js`** - Debug the entire processing pipeline

### 🎨 `/demos`
Demonstration scripts and sample data:

- **`test-scraping-demo.js`** - Web scraping demonstration
- **`test-small-html-scraping.js`** - Small-scale HTML scraping test
- **`test-watch-history.html`** - Sample YouTube watch history data (full)
- **`test-watch-history-small.html`** - Sample YouTube watch history data (small)

### 🔧 `/utilities`
Utility scripts for database management and system operations:

- **`check-user-data.js`** - Check and validate user data integrity
- **`fix-enrichment.js`** - Fix and repair data enrichment issues
- **`test-database-save.js`** - Test database save operations
- **`test-force-reprocessing.js`** - Test forced reprocessing functionality
- **`start-app.sh`** - Application startup script
- **`start-services.sh`** - Start all required services

## Usage Instructions

### Running Test Scripts

Most test scripts can be run directly with Node.js:

```bash
# Run LLM testing
node scripts/testing/test-llm-accuracy.js

# Run Gemma model demo
node scripts/testing/test-gemma-3-4b-demo.js

# Run web scraping demo
node scripts/demos/test-scraping-demo.js
```

### Running Shell Scripts

Shell scripts need execute permissions:

```bash
# Make executable if needed
chmod +x scripts/testing/test-llm-simple.sh

# Run the script
./scripts/testing/test-llm-simple.sh
```

### Environment Requirements

Most scripts require:
1. **Environment Variables**: Ensure `.env` is configured with necessary API keys
2. **Dependencies**: Run `npm install` in both `/backend` and `/frontend` directories
3. **Services**: Some scripts require MongoDB and other services to be running

### Service Dependencies

Before running scripts, ensure these services are available:
- **MongoDB**: Required for database operations
- **Backend API**: Required for API testing scripts
- **OpenRouter API**: Required for LLM testing scripts

## Quick Start

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

2. **Start Services**:
   ```bash
   ./scripts/utilities/start-services.sh
   ```

3. **Run Basic Tests**:
   ```bash
   node scripts/testing/test-gemma-3-4b-demo.js
   ```

## Development Workflow

When adding new scripts:

1. **Choose the appropriate directory** based on script purpose
2. **Add documentation** in the script file header
3. **Update this README** if adding new categories
4. **Make shell scripts executable** with `chmod +x`
5. **Test the script** in a clean environment

## Troubleshooting

If scripts fail to run:

1. **Check Environment**: Verify `.env` file is properly configured
2. **Check Dependencies**: Ensure all npm packages are installed
3. **Check Services**: Verify required services (MongoDB, etc.) are running
4. **Check Permissions**: Ensure shell scripts have execute permissions
5. **Check API Keys**: Verify API keys are valid and have sufficient quota

For debugging specific issues, use scripts in the `/debugging` directory to diagnose problems.