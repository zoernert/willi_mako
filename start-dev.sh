#!/bin/bash

# Dual-Port Development Setup für Willi-Mako
# Backend auf Port 3009 (intern), Next.js auf Port 3003 (extern)

echo "🚀 Starting Willi-Mako Dual-Port Development Environment"
echo "======================================================"

npm run build

# Cleanup function to kill any existing processes
cleanup_existing_processes() {
    echo "🧹 Prüfe und beende bestehende Entwicklungsserver..."
    
    # Check for processes on our ports using ss (more reliable than lsof)
    if ss -tlnp | grep -q :3003; then
        echo "⚠️  Port 3003 ist bereits belegt - beende bestehende Prozesse..."
        # Extract PID from ss output and kill
        ss -tlnp | grep :3003 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
    
    if ss -tlnp | grep -q :3009; then
        echo "⚠️  Port 3009 ist bereits belegt - beende bestehende Prozesse..."
        # Extract PID from ss output and kill
        ss -tlnp | grep :3009 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Fallback: use lsof if ss didn't work
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:3003 | xargs -r kill -9 2>/dev/null || true
        lsof -ti:3009 | xargs -r kill -9 2>/dev/null || true
    fi
    
    # Kill any remaining Next.js or tsx processes related to our project
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true
    
    # Wait a moment for cleanup
    sleep 2
    
    # Final verification
    if ss -tlnp | grep -q ':3003\|:3009'; then
        echo "⚠️  Einige Ports sind noch belegt. Verwende aggressivere Cleanup-Methoden..."
        fuser -k 3003/tcp 2>/dev/null || true
        fuser -k 3009/tcp 2>/dev/null || true
        sleep 1
    fi
    
    echo "✅ Cleanup abgeschlossen"
}

# Run cleanup before starting
cleanup_existing_processes

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

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    exit 1
fi

echo "✅ Backend server started successfully (PID: $BACKEND_PID)"

# Start Next.js frontend
echo "⏳ Starting frontend server..."
npx next dev -p 3003 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend server failed to start"
    echo "Stopping backend..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Frontend server started successfully (PID: $FRONTEND_PID)"
echo ""
echo "🎉 Development environment is ready!"
echo "📱 Open your browser: http://localhost:3003"

# Function to clean up background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down development environment..."
    
    # Kill the processes we started
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Additional cleanup - kill any remaining processes on our ports
    echo "🧹 Cleaning up remaining processes..."
    lsof -ti:3003 | xargs kill -9 2>/dev/null || true
    lsof -ti:3009 | xargs kill -9 2>/dev/null || true
    
    echo "✅ Development environment stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
