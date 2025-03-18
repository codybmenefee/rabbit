#!/bin/bash

# YouTube Watch History Analytics Startup Script
echo "🚀 Starting YouTube Watch History Analytics..."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists npm; then
  echo "❌ Error: npm is not installed. Please install Node.js and npm first."
  exit 1
fi

# Start backend server
echo "⏳ Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize (5 seconds)..."
sleep 5

# Start frontend server
echo "⏳ Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend server started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Application is running!"
echo "🔗 Backend: http://localhost:5000"
echo "🔗 Frontend: http://localhost:3000"
echo ""
echo "📋 Press Ctrl+C to stop all servers"

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; echo '👋 Shutting down servers...'; exit" INT

# Keep script running
wait 