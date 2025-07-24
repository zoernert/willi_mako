#!/bin/bash

# Team Gamification Quick Setup Script
# This script sets up the team gamification feature

set -e

echo "🎯 Team Gamification Setup"
echo "========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the willi_mako root directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created. Please configure your database settings."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

echo "📊 Configuration:"
echo "  Database: ${DB_NAME:-willi_mako}"
echo "  Host: ${DB_HOST:-localhost}:${DB_PORT:-5432}"
echo "  User: ${DB_USER:-willi_user}"

# Check database connection
echo ""
echo "🔍 Checking database connection..."

DB_URL="postgresql://${DB_USER:-willi_user}:${DB_PASSWORD:-willi_password}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-willi_mako}"

if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT version();" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "   Please check your database configuration in .env"
        exit 1
    fi
else
    echo "⚠️  psql not found, skipping database connection check"
fi

# Install dependencies if needed
echo ""
echo "📦 Checking dependencies..."

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "🔄 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Run database migration
echo ""
echo "🔄 Running team gamification migration..."

if [ -f "migrate-team-schema.sh" ]; then
    ./migrate-team-schema.sh
    echo "✅ Migration completed"
else
    echo "❌ Migration script not found: migrate-team-schema.sh"
    exit 1
fi

# Build the application
echo ""
echo "🏗️  Building application..."

if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Set up points cleanup cron job (optional)
echo ""
echo "⏰ Setting up points cleanup cron job..."

SCRIPT_PATH="$(pwd)/scripts/cleanup-expired-points.ts"
CRON_ENTRY="0 2 * * * /usr/bin/node $SCRIPT_PATH >> /var/log/points-cleanup.log 2>&1"

if crontab -l 2>/dev/null | grep -q "cleanup-expired-points"; then
    echo "✅ Cron job already exists"
else
    echo "Would you like to set up automatic points cleanup? (y/n)"
    read -r SETUP_CRON
    
    if [ "$SETUP_CRON" = "y" ] || [ "$SETUP_CRON" = "Y" ]; then
        (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
        echo "✅ Cron job added: Daily cleanup at 2 AM"
        echo "   Log file: /var/log/points-cleanup.log"
    else
        echo "⏭️  Skipping cron job setup"
        echo "   You can set it up later with:"
        echo "   $CRON_ENTRY"
    fi
fi

# Success message
echo ""
echo "🎉 Team Gamification Setup Complete!"
echo "====================================="
echo ""
echo "✅ Database schema migrated"
echo "✅ Application built successfully"
echo "✅ Team API endpoints ready"
echo ""
echo "🚀 Next Steps:"
echo "1. Start the server: npm start"
echo "2. Test the API endpoints: curl http://localhost:3001/api/teams"
echo "3. Check the documentation: docs/TEAM_GAMIFICATION_README.md"
echo ""
echo "📋 Available Features:"
echo "• Team creation and management"
echo "• User invitations and join requests"
echo "• Team-based document sharing"
echo "• Gamification with points and leaderboards"
echo "• Automatic point expiration (30 days)"
echo ""
echo "🔗 API Base URL: http://localhost:${PORT:-3001}/api/teams"
echo ""
echo "Happy collaborating! 🎯"
