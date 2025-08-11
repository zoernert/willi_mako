#!/bin/bash

# Alternative Entwicklungsumgebung mit reduziertem File Watching
# Um "System limit for number of file watchers reached" Fehler zu vermeiden

echo "🚀 Starting Willi-Mako Limited File Watching Development Environment"
echo "=================================================================="

# Check if legacy app needs building
echo "� Prüfe Legacy-App Status..."
if [ ! -f "public/app/index.html" ] || [ ! -d "public/app/static" ]; then
    echo "🔨 Baue Legacy-App (Marktpartner Suche) ..."
    npm run build:legacy || { echo "❌ Legacy Build fehlgeschlagen"; exit 1; }
    # ensure moved into public/app
    npm run move:legacy || { echo "❌ Move Legacy fehlgeschlagen"; exit 1; }
else
    echo "✅ Legacy-App bereits gebaut, überspringe Build"
fi

# Cleanup function to kill any existing processes
cleanup_existing_processes() {
    echo "🧹 Prüfe und beende bestehende Entwicklungsserver..."
    
    # Kill processes on our ports more reliably
    for port in 3003 3009; do
        if ss -tlnp | grep -q ":$port "; then
            echo "⚠️  Port $port ist bereits belegt - beende bestehende Prozesse..."
            # Try multiple methods to kill processes
            ss -tlnp | grep ":$port " | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | while read pid; do
                if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                    echo "Beende Prozess mit PID: $pid"
                    kill -TERM "$pid" 2>/dev/null || true
                    sleep 1
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            done
            sleep 1
        fi
    done
    
    # Fallback: use lsof if available
    if command -v lsof >/dev/null 2>&1; then
        for port in 3003 3009; do
            lsof -ti:$port 2>/dev/null | while read pid; do
                if [ -n "$pid" ]; then
                    echo "Beende Prozess mit PID: $pid (via lsof)"
                    kill -TERM "$pid" 2>/dev/null || true
                    sleep 1
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            done
        done
    fi
    
    # Kill any remaining development processes by name
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true
    pkill -f "node.*next.*dev" 2>/dev/null || true
    
    sleep 2
    echo "✅ Cleanup abgeschlossen"
}

# Run cleanup before starting
cleanup_existing_processes

# Ensure development environment
echo "🔧 Prüfe Entwicklungsumgebung..."
if [ -f ".env" ]; then
    if grep -q "NODE_ENV=production" .env; then
        echo "⚠️  .env enthält NODE_ENV=production. Für Entwicklung sollte NODE_ENV=development sein."
        echo "   Falls Sie gerade deployed haben, stellen Sie sicher, dass Ihre lokale .env korrekt ist."
    fi
    if grep -q "FEATURE_COMMUNITY_HUB=true" .env; then
        echo "✅ Community Hub Feature ist aktiviert"
    else
        echo "⚠️  FEATURE_COMMUNITY_HUB nicht in .env gefunden - Community APIs sind eventuell nicht verfügbar"
    fi
else
    echo "⚠️  .env Datei nicht gefunden"
fi

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
