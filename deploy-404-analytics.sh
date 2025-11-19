#!/bin/bash
# deploy-404-analytics.sh - Deploy 404 page with Plausible Analytics tracking

set -e

echo "📊 Deploying 404 Page with Analytics Tracking..."

# Server Details
PROD_SERVER=${1:-"root@10.0.0.2"}
DEPLOY_DIR="/opt/willi_mako"
LOCAL_DIR="/config/Development/willi_mako"

echo "🔨 Building Next.js frontend..."
cd "$LOCAL_DIR"
npm run build:next

echo "📦 Copying files to production server..."
scp -r .next "$PROD_SERVER:$DEPLOY_DIR/"
scp src/pages/404.tsx "$PROD_SERVER:$DEPLOY_DIR/src/pages/"
scp CUSTOM-ERROR-PAGES.md "$PROD_SERVER:$DEPLOY_DIR/"

echo "🔄 Restarting services on production..."
ssh "$PROD_SERVER" << 'EOF'
cd /opt/willi_mako

# Restart PM2 service
echo "Restarting willi-mako service..."
pm2 restart willi-mako

echo "✅ Service restarted successfully"

# Show service status
pm2 status willi-mako
EOF

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📊 Analytics Configuration:"
echo "   - Event: 404_error (auto-tracked on page load)"
echo "   - Event: 404_navigation (tracked on button clicks)"
echo ""
echo "📈 Check Plausible Dashboard:"
echo "   https://stats.corrently.cloud/stromhaltig.de"
echo ""
echo "🧪 Test 404 Page:"
echo "   https://stromhaltig.de/chat/invalid-test-id"
echo "   https://stromhaltig.de/not-existing-page"
echo ""
echo "💡 Monitor 404 Errors in Plausible:"
echo "   1. Go to Goals → Custom Events"
echo "   2. Look for '404_error' events"
echo "   3. Check 'path' property to see which URLs trigger 404s"
echo "   4. Analyze 'referrer' to understand user journey"
echo ""
