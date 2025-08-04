#!/bin/bash

# Test-Script zur Überprüfung der Chat-Config-Installation
echo "🔍 Überprüfung der Chat-Konfiguration Installation..."

# 1. Prüfe Datenbank-Tabellen
echo "1. Prüfe Datenbank-Tabellen..."
psql -d willi_mako -c "\dt chat_configurations;" 2>/dev/null | grep -q "chat_configurations"
if [ $? -eq 0 ]; then
    echo "   ✅ Tabelle 'chat_configurations' existiert"
else
    echo "   ❌ Tabelle 'chat_configurations' nicht gefunden"
    echo "   💡 Führe die Migration aus: ./deploy-chat-config.sh"
fi

psql -d willi_mako -c "\dt chat_test_sessions;" 2>/dev/null | grep -q "chat_test_sessions" 
if [ $? -eq 0 ]; then
    echo "   ✅ Tabelle 'chat_test_sessions' existiert"
else
    echo "   ❌ Tabelle 'chat_test_sessions' nicht gefunden"
    echo "   💡 Führe die Migration aus: ./deploy-chat-config.sh"
fi

# 2. Prüfe Backend-Route
echo "2. Prüfe Backend-Route..."
if [ -f "src/routes/admin/chatConfig.ts" ]; then
    echo "   ✅ Backend-Route existiert"
else
    echo "   ❌ Backend-Route nicht gefunden"
fi

# 3. Prüfe Frontend-Komponente
echo "3. Prüfe Frontend-Komponente..."
if [ -f "client/src/components/AdminChatConfiguration.tsx" ]; then
    echo "   ✅ Frontend-Komponente existiert"
else
    echo "   ❌ Frontend-Komponente nicht gefunden"
fi

# 4. Prüfe Admin.tsx Integration
echo "4. Prüfe Admin.tsx Integration..."
grep -q "AdminChatConfiguration" client/src/pages/Admin.tsx 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Admin.tsx Integration vorhanden"
else
    echo "   ❌ Admin.tsx Integration fehlt"
fi

# 5. Test API-Erreichbarkeit (wenn Server läuft)
echo "5. Teste API-Erreichbarkeit..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3009/api/admin/chat-config 2>/dev/null | grep -q "200\|401\|403"
if [ $? -eq 0 ]; then
    echo "   ✅ API ist erreichbar (Server läuft)"
else
    echo "   ⚠️  API nicht erreichbar (Server läuft möglicherweise nicht)"
fi

echo ""
echo "🎯 Nächste Schritte:"
echo "1. Falls Datenbank-Tabellen fehlen: ./deploy-chat-config.sh"
echo "2. Backend starten: npm run dev"
echo "3. Frontend starten: cd client && npm start"
echo "4. Admin-Panel aufrufen: http://localhost:3000/admin"
echo "5. Tab 'Chat-Config' auswählen"
