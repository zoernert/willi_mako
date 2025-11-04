#!/bin/bash

# Schnelles Deployment nur des API Proxy Fixes

set -e

PROD_SERVER="root@10.0.0.2"
PROD_PATH="/root/willi_mako"

echo "🚀 Quick Deploy: API Proxy Fix (duplex option)"
echo "==============================================="
echo ""

# Build only Next.js
echo "📦 Building Next.js..."
npm run build:next

echo ""
echo "📤 Uploading to production..."

# Copy the built Next.js files
rsync -avz --progress \
  .next/ \
  "$PROD_SERVER:$PROD_PATH/.next/"

echo ""
echo "🔄 Restarting frontend..."
ssh "$PROD_SERVER" "cd $PROD_PATH && pm2 restart willi_mako_frontend_4100"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check logs:"
echo "  ssh $PROD_SERVER 'pm2 logs willi_mako_frontend_4100 --lines 50'"
