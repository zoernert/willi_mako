#!/bin/bash

# Script to restart Willi-Mako service after QDrant filter fix
# Usage: ./restart-willi-mako.sh

echo "Restarting Willi-Mako service..."

# Determine if we're running in development or production
if [ -f "./start-dev.sh" ]; then
  echo "Development environment detected, restarting with npm run dev"
  # Kill any existing processes
  pkill -f "npm run dev" || true
  # Start the development server
  npm run dev &
  echo "Development server started in background"
else
  echo "Production environment detected"
  # Check if running as a service
  if systemctl is-active --quiet willi-mako; then
    echo "Restarting systemd service"
    sudo systemctl restart willi-mako
  else
    echo "No systemd service found, trying to restart the Node.js process"
    # Kill the current Node.js process
    pkill -f "node.*server.js" || true
    # Start the production server
    NODE_ENV=production node server.js &
    echo "Production server started in background"
  fi
fi

echo "Restart completed."
echo "The QDrant filter fix has been applied. The service should now be using the correct filter format."
