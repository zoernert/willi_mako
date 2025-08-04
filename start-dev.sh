#!/bin/bash

# Dual-Port Development Setup für Willi-Mako
# Backend auf Port 3009 (intern), Next.js auf Port 3003 (extern)

echo "🚀 Starting Willi-Mako Dual-Port Development Environment"
echo "======================================================"

echo "🔧 Starting Express.js backend on port 3009 (internal)..."
echo "🌐 Starting Next.js frontend on port 3003 (external)..."
echo ""
echo "📱 Application will be available at: http://localhost:3003"
echo ""
echo "🔗 Available URLs:"
echo "   - Frontend: http://localhost:3003/"
echo "   - Legacy App: http://localhost:3003/app/"
echo "   - FAQ Pages: http://localhost:3003/wissen/"
echo "   - API (proxied): http://localhost:3003/api/"
echo "   - Backend (direct, internal): http://localhost:3009/api/"
echo ""

# Start backend in background
echo "⏳ Starting backend server..."
PORT=3009 npx tsx src/server.ts &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start Next.js frontend
echo "⏳ Starting frontend server..."
npx next dev -p 3003 &
FRONTEND_PID=$!

# Function to clean up background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down development environment..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
