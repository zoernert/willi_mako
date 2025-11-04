#!/bin/bash

# Ultra-schnelles Deployment: Nur Source-Datei kopieren und neu starten

set -e

PROD_SERVER="root@10.0.0.2"
PROD_PATH="/root/willi_mako"

echo "⚡ Ultra Quick Deploy: API Proxy Fix"
echo "====================================="
echo ""

echo "📤 Uploading fixed source file..."
scp src/pages/api/\[...slug\].ts "$PROD_SERVER:$PROD_PATH/src/pages/api/[...slug].ts"

echo ""
echo "🔄 Restarting frontend (will rebuild on startup)..."
ssh "$PROD_SERVER" "cd $PROD_PATH && pm2 restart willi_mako_frontend_4100"

echo ""
echo "✅ Done! Frontend will rebuild the API route on next request."
echo ""
echo "Monitor logs:"
echo "  ssh $PROD_SERVER 'pm2 logs willi_mako_frontend_4100 --lines 50'"
