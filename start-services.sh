#!/bin/bash

# Kill any existing processes on ports 3000 and 5000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

echo "Starting Rabbit Analytics services..."
echo "=================================="

# Start backend
echo "🚀 Starting backend on port 5000..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend  
echo "🚀 Starting frontend on port 3000..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo "📊 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "❤️  Health check: http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM

# Keep script running
wait 