#!/bin/bash

echo "🔧 Testing Chat Configuration API with Authentication..."

# Check if JWT token is available
if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT_TOKEN environment variable not set"
    echo "💡 Set it with: export JWT_TOKEN='your_admin_jwt_token'"
    echo "💡 You can get it from browser localStorage.getItem('token')"
    exit 1
fi

echo "✅ JWT Token found"

# Test endpoints
echo "1. Testing GET /api/admin/chat-config..."
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/admin/chat-config | jq '.' || echo "❌ GET failed"

echo ""
echo "2. Testing GET /api/admin/chat-config/test-sessions..."
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/admin/chat-config/test-sessions | jq '.' || echo "❌ GET test-sessions failed"

echo ""
echo "✅ API-Tests abgeschlossen"
echo ""
echo "🎯 Wenn die Tests erfolgreich waren, sollte das Admin-Interface jetzt funktionieren!"
echo "   1. Browser-Cache löschen (Ctrl+Shift+R)"
echo "   2. Admin-Panel neu laden: http://localhost:3000/admin"
echo "   3. Tab 'Chat-Config' auswählen"
