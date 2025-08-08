#!/bin/bash

# Alternative Entwicklungsumgebung mit reduziertem File Watching
# Um "System limit for number of file watchers reached" Fehler zu vermeiden

echo "🚀 Starting Willi-Mako Limited File Watching Development Environment"
echo "=================================================================="

echo "🔨 Baue nur Legacy-App (Marktpartner Suche) ..."
npm run build:legacy || { echo "❌ Legacy Build fehlgeschlagen"; exit 1; }
# ensure moved into public/app
npm run move:legacy || { echo "❌ Move Legacy fehlgeschlagen"; exit 1; }

# Cleanup function to kill any existing processes
cleanup_existing_processes() {
    echo "🧹 Prüfe und beende bestehende Entwicklungsserver..."
    
    # Kill processes on our ports
    if ss -tlnp | grep -q :3003; then
        echo "⚠️  Port 3003 ist bereits belegt - beende bestehende Prozesse..."
        ss -tlnp | grep :3003 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
    
    if ss -tlnp | grep -q :3009; then
        echo "⚠️  Port 3009 ist bereits belegt - beende bestehende Prozesse..."
        ss -tlnp | grep :3009 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Fallback: use lsof if ss didn't work
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:3003 | xargs -r kill -9 2>/dev/null || true
        lsof -ti:3009 | xargs -r kill -9 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true
    
    sleep 2
    echo "✅ Cleanup abgeschlossen"
}

# Run cleanup before starting
cleanup_existing_processes

echo "🔧 Starting Express.js backend ohne file watching..."
echo "🌐 Starting Next.js frontend mit reduziertem file watching..."
echo ""
echo "📱 Application will be available at: http://localhost:3003"
echo ""

# Start backend without file watching
echo "⏳ Starting backend server (no auto-restart)..."
NODE_ENV=development PORT=3009 npx tsx src/server.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend server failed to start"
    exit 1
fi

echo "✅ Backend server started successfully (PID: $BACKEND_PID)"

# Start Next.js with reduced file watching
echo "⏳ Starting frontend server..."
WATCHPACK_POLLING=3000 npx next dev -p 3003 &
FRONTEND_PID=$!

# Wait for frontend to start
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
echo ""
echo "⚠️  HINWEIS:"
echo "   - Backend File watching ist deaktiviert (manueller Neustart erforderlich)"
echo "   - Frontend verwendet Polling alle 3 Sekunden (reduziert File Watcher Usage)"
echo "   - Bei Backend-Änderungen: Strg+C und './start-dev-limited.sh' erneut ausführen"
echo ""
echo "🔗 Available URLs:"
echo "   - Frontend: http://localhost:3003/"
echo "   - Legacy App: http://localhost:3003/app/"
echo "   - FAQ Pages: http://localhost:3003/wissen/"
echo "   - API (proxied): http://localhost:3003/api/"
echo ""

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
    
    # Additional cleanup
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
