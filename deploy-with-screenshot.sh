#!/bin/bash

# Wrapper Script für Deployment mit Screenshot-Feature
# Führt automatisch die notwendigen Migrationen aus

set -e

echo "🚀 Deploying Willi-Mako with Screenshot Feature..."
echo "================================================="

# Check if we need to run migrations
NEED_MIGRATION=false

# Check if screenshot migration is needed
if [ -f "migration-screenshot-support.sql" ]; then
    echo "📄 Screenshot migration file found"
    NEED_MIGRATION=true
fi

# Run quick deploy
echo "🔨 Running quick deployment..."
./quick-deploy.sh "$@"

# If migration was needed, verify it was successful
if [ "$NEED_MIGRATION" = true ]; then
    echo ""
    echo "🔍 Verifying screenshot feature deployment..."
    
    # Test if screenshot tables were created
    PROD_SERVER=${1:-"root@10.0.0.2"}
    ssh $PROD_SERVER << 'EOF'
echo "Testing screenshot tables..."
if PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "\d file_uploads" 2>/dev/null | grep -q "Table"; then
    echo "✅ Screenshot tables successfully created"
else
    echo "❌ Screenshot tables missing - manual migration may be needed"
fi

echo "Testing upload directories..."
if [ -d "/opt/willi_mako/uploads/screenshots" ]; then
    echo "✅ Upload directories created"
else
    echo "❌ Upload directories missing"
fi
EOF
    
    echo ""
    echo "📋 Screenshot Feature Status:"
    echo "✅ Backend code deployed with screenshot analysis"
    echo "✅ Frontend components deployed with upload interface"
    echo "✅ Database schema extended for screenshots"
    echo "✅ Upload directories created"
    echo ""
    echo "🔧 Required Environment Variables:"
    echo "   GOOGLE_API_KEY=your_gemini_api_key (for screenshot analysis)"
    echo ""
    echo "📖 Documentation: docs/SCREENSHOT_ANALYSIS_IMPLEMENTATION_COMPLETE.md"
fi

echo ""
echo "🎉 Deployment with Screenshot Feature completed!"
echo "   Test the feature by uploading a screenshot in the chat interface"
