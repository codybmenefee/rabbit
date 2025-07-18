#!/bin/bash

# Rabbit Analytics - Development Startup Script
# This script starts both the backend and frontend services for development

echo "🐰 Starting Rabbit Analytics Development Environment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Check if dependencies are installed
echo -e "${BLUE}Checking project dependencies...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
    cd ..
fi

echo -e "${GREEN}✅ All dependencies are installed${NC}"

# Check if environment files exist
echo -e "${BLUE}Checking environment configuration...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found. Creating from example...${NC}"
    cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env.local file not found. Creating from example...${NC}"
    cp frontend/.env.example frontend/.env.local
fi

echo -e "${GREEN}✅ Environment files are configured${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting services...${NC}"

# Start backend
echo -e "${YELLOW}🚀 Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "${YELLOW}🚀 Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

echo -e "${GREEN}✅ Both services are starting up!${NC}"
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Rabbit Analytics is ready!${NC}"
echo ""
echo -e "${BLUE}📍 Services:${NC}"
echo -e "   • Backend API: ${GREEN}http://localhost:5000${NC}"
echo -e "   • Frontend:    ${GREEN}http://localhost:3000${NC}"
echo -e "   • Health Check: ${GREEN}http://localhost:5000/health${NC}"
echo ""
echo -e "${BLUE}📋 Features Available:${NC}"
echo -e "   • YouTube watch history upload and processing"
echo -e "   • Step-by-step Google Takeout guide"
echo -e "   • Comprehensive analytics dashboard"
echo -e "   • YouTube API integration (if configured)"
echo -e "   • Interactive charts and visualizations"
echo -e "   • Data export capabilities"
echo ""
echo -e "${YELLOW}💡 Getting Started:${NC}"
echo -e "   1. Open ${GREEN}http://localhost:3000${NC} in your browser"
echo -e "   2. Follow the Google Takeout guide"
echo -e "   3. Upload your watch-history.html file"
echo -e "   4. Explore your YouTube analytics!"
echo ""
echo -e "${BLUE}🔧 Optional Configuration:${NC}"
echo -e "   • Add YouTube API key to backend/.env for enhanced data"
echo -e "   • Configure MongoDB for data persistence"
echo -e "   • Set up Redis for improved performance"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
echo "=================================================="

# Wait for background processes
wait 