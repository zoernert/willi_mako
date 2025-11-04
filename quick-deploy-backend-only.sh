#!/bin/bash

# Schnelles Backend-Only Deployment

set -e

PROD_SERVER="root@10.0.0.2"
PROD_PATH="/root/willi_mako"

echo "🚀 Quick Backend Deployment"
echo "==========================="
echo ""

echo "📤 Uploading backend dist files..."
rsync -avz --delete \
  dist/ \
  "$PROD_SERVER:$PROD_PATH/dist/"

echo ""
echo "🔄 Restarting backend..."
ssh "$PROD_SERVER" "cd $PROD_PATH && pm2 restart willi_mako_backend_4101"

echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "Check logs:"
echo "  ssh $PROD_SERVER 'pm2 logs willi_mako_backend_4101 --lines 50'"
