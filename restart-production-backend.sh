#!/bin/bash

echo "🔄 Restarting Willi-Mako Backend on Production Server..."
echo ""

PROD_SERVER="root@10.0.0.2"

# Restart backend with pm2
ssh $PROD_SERVER "cd /root/willi_mako && pm2 restart willi_mako_backend_4101 || pm2 restart all"

echo ""
echo "✅ Backend restart command sent!"
echo ""
echo "Check status with:"
echo "  ssh $PROD_SERVER 'pm2 status'"
echo ""
echo "Check logs with:"
echo "  ssh $PROD_SERVER 'pm2 logs willi_mako_backend_4101 --lines 50'"
