#!/bin/bash

# Production Deployment Script for Team Gamification
# This script handles application setup on each server (without database migration)

set -e

echo "🚀 Team Gamification Production Setup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the willi_mako root directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Please create .env file with your production configuration"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

echo "📊 Configuration:"
echo "  Environment: ${NODE_ENV:-development}"
echo "  Port: ${PORT:-3001}"
echo "  Database: ${DB_NAME:-willi_mako}"
echo "  Host: ${DB_HOST:-localhost}:${DB_PORT:-5432}"

# Install production dependencies
echo ""
echo "📦 Installing production dependencies..."
npm ci --only=production
echo "✅ Dependencies installed"

# Build the application
echo ""
echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Check if this is the designated cron server
echo ""
echo "⏰ Points cleanup cron job configuration..."
echo "Should this server run the daily points cleanup job? (y/n)"
echo "Note: Only ONE server in your cluster should run this job"
read -r SETUP_CRON

if [ "$SETUP_CRON" = "y" ] || [ "$SETUP_CRON" = "Y" ]; then
    SCRIPT_PATH="$(pwd)/scripts/cleanup-expired-points.ts"
    CRON_ENTRY="0 2 * * * /usr/bin/node $SCRIPT_PATH >> /var/log/points-cleanup.log 2>&1"
    
    if crontab -l 2>/dev/null | grep -q "cleanup-expired-points"; then
        echo "✅ Cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
        echo "✅ Cron job added: Daily cleanup at 2 AM"
        
        # Create log directory
        sudo mkdir -p /var/log
        sudo touch /var/log/points-cleanup.log
        sudo chown $(whoami):$(whoami) /var/log/points-cleanup.log
        echo "   Log file: /var/log/points-cleanup.log"
    fi
else
    echo "⏭️  Skipping cron job setup"
    echo "   Make sure ONE server in your cluster has this job configured"
fi

# Test database connection (without running migration)
echo ""
echo "🔍 Testing database connection..."
DB_URL="postgresql://${DB_USER:-willi_user}:${DB_PASSWORD:-willi_password}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-willi_mako}"

if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT COUNT(*) FROM teams;" &> /dev/null; then
        echo "✅ Database connection successful and team tables exist"
    else
        echo "⚠️  Database connection works but team tables missing"
        echo "   Please run the database migration script on one server:"
        echo "   ./migrate-team-schema.sh"
    fi
else
    echo "⚠️  psql not found, skipping database connection test"
fi

# Success message
echo ""
echo "🎉 Production Setup Complete!"
echo "============================"
echo ""
echo "✅ Dependencies installed (production)"
echo "✅ Application built"
echo "✅ Server ready for deployment"
echo ""
echo "🚀 Next Steps:"
echo "1. Start the server: npm start or pm2 start ecosystem.config.js"
echo "2. Test the endpoints: curl http://localhost:${PORT:-3001}/api/teams"
echo "3. Monitor logs for any issues"
echo ""
echo "🔗 API Base URL: http://localhost:${PORT:-3001}/api/teams"
echo ""
echo "Server ready! 🎯"
