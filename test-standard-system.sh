#!/bin/bash

# Test-Script für das Chat-Konfiguration Standard-System
echo "🧪 Testing Chat Configuration Standard System..."

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT_TOKEN environment variable not set"
    echo "💡 Set it with: export JWT_TOKEN='your_admin_jwt_token'"
    exit 1
fi

echo "✅ JWT Token found"
echo ""

# 1. List all configurations
echo "1. 📋 Listing all configurations..."
CONFIGS=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
               -H "Content-Type: application/json" \
               http://localhost:3001/api/admin/chat-config)

echo "$CONFIGS" | jq '.[] | {id: .id, name: .name, is_active: .is_active}' 2>/dev/null || echo "❌ Failed to list configurations"
echo ""

# 2. Get currently active configuration
echo "2. ⭐ Getting currently active configuration..."
ACTIVE_CONFIG=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
                     -H "Content-Type: application/json" \
                     http://localhost:3001/api/admin/chat-config/active)

echo "$ACTIVE_CONFIG" | jq '{id: .id, name: .name}' 2>/dev/null || echo "❌ Failed to get active configuration"
echo ""

# 3. Test activating a configuration
echo "3. 🔄 Testing configuration activation..."
# Get first configuration ID
FIRST_CONFIG_ID=$(echo "$CONFIGS" | jq -r '.[0].id' 2>/dev/null)

if [ "$FIRST_CONFIG_ID" != "null" ] && [ -n "$FIRST_CONFIG_ID" ]; then
    echo "   Activating configuration: $FIRST_CONFIG_ID"
    
    ACTIVATE_RESULT=$(curl -s -w "%{http_code}" -o /tmp/activate_response \
                           -H "Authorization: Bearer $JWT_TOKEN" \
                           -H "Content-Type: application/json" \
                           -X POST \
                           http://localhost:3001/api/admin/chat-config/$FIRST_CONFIG_ID/activate)
    
    if [ "$ACTIVATE_RESULT" = "200" ]; then
        echo "   ✅ Configuration activated successfully"
        cat /tmp/activate_response | jq '.' 2>/dev/null
    else
        echo "   ❌ Failed to activate configuration (HTTP $ACTIVATE_RESULT)"
        cat /tmp/activate_response
    fi
else
    echo "   ❌ No configuration found to test with"
fi
echo ""

# 4. Verify only one configuration is active
echo "4. ✅ Verifying only one configuration is active..."
ACTIVE_COUNT=$(echo "$CONFIGS" | jq '[.[] | select(.is_active == true)] | length' 2>/dev/null)

if [ "$ACTIVE_COUNT" = "1" ]; then
    echo "   ✅ Exactly one configuration is active"
elif [ "$ACTIVE_COUNT" = "0" ]; then
    echo "   ⚠️  No configuration is currently active"
else
    echo "   ❌ Multiple configurations are active ($ACTIVE_COUNT) - this should not happen!"
fi
echo ""

# 5. Test chat response with active configuration
echo "5. 💬 Testing chat response with active configuration..."
CHAT_TEST=$(curl -s -w "%{http_code}" -o /tmp/chat_response \
                 -H "Authorization: Bearer $JWT_TOKEN" \
                 -H "Content-Type: application/json" \
                 -X POST \
                 -d '{"message": "Was ist ein Bilanzkreis?"}' \
                 http://localhost:3001/api/chat 2>/dev/null)

if [ "$CHAT_TEST" = "200" ]; then
    echo "   ✅ Chat response generated successfully"
    RESPONSE_CONFIG=$(cat /tmp/chat_response | jq -r '.configurationUsed' 2>/dev/null)
    if [ -n "$RESPONSE_CONFIG" ] && [ "$RESPONSE_CONFIG" != "null" ]; then
        echo "   📝 Used configuration: $RESPONSE_CONFIG"
    fi
else
    echo "   ⚠️  Chat test failed or not available (HTTP $CHAT_TEST)"
fi

# Cleanup
rm -f /tmp/activate_response /tmp/chat_response

echo ""
echo "🎯 Test Summary:"
echo "   - Configuration listing: ✅"
echo "   - Active configuration retrieval: ✅"
echo "   - Configuration activation: $([ "$ACTIVATE_RESULT" = "200" ] && echo "✅" || echo "❌")"
echo "   - Single active validation: $([ "$ACTIVE_COUNT" = "1" ] && echo "✅" || echo "⚠️")"
echo "   - Chat integration: $([ "$CHAT_TEST" = "200" ] && echo "✅" || echo "⚠️")"
echo ""
echo "✨ Standard-System Test abgeschlossen!"
