#!/bin/bash
# Restart the API server to apply our changes
# Created: August 20, 2025

echo "Stopping the server..."
if pgrep -f "node.*server.js" > /dev/null; then
  pkill -f "node.*server.js"
  echo "Server stopped."
else
  echo "Server was not running."
fi

echo "Starting the server in development mode..."
cd /config/Development/willi_mako
npm run dev &

echo "Waiting for server to start..."
sleep 5

echo "Server restarted. You can now try creating a clarification from chat context again."
