#!/bin/bash
# update-production-env.sh - Aktualisiert nur die .env Datei auf dem Produktionsserver
# Nützlich für schnelle Konfigurationsänderungen ohne vollständiges Deployment

set -e

PROD_SERVER=${1:-"root@10.0.0.2"}
DEPLOY_DIR="/opt/willi_mako"

echo "🔧 Aktualisiere .env auf Produktionsserver..."

# Lese lokale .env Werte
if [ -f ".env" ]; then
    source .env
fi

ssh $PROD_SERVER << 'EOF'
cd /opt/willi_mako

# Backup der aktuellen .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Aktualisiere globales Rate Limit von 100 auf 200
if grep -q "RATE_LIMIT_MAX=100" .env; then
    sed -i 's/RATE_LIMIT_MAX=100/RATE_LIMIT_MAX=200/g' .env
    echo "✅ Globales Rate Limit von 100 auf 200 erhöht"
fi

# Füge die neuen Document Upload Rate Limiting Variablen hinzu, falls sie fehlen
if ! grep -q "DOCUMENT_UPLOAD_RATE_WINDOW" .env; then
    echo "" >> .env
    echo "# Document Upload Rate Limiting" >> .env
    echo "# Separate limits for document uploads to support batch operations" >> .env
    echo "DOCUMENT_UPLOAD_RATE_WINDOW=5" >> .env
    echo "DOCUMENT_UPLOAD_RATE_MAX_SINGLE=30" >> .env
    echo "DOCUMENT_UPLOAD_RATE_MAX_BATCH=20" >> .env
    echo "✅ Document Upload Rate Limiting Variablen hinzugefügt"
else
    echo "ℹ️  Document Upload Rate Limiting Variablen existieren bereits"
fi

# Zeige die relevanten Rate Limiting Einstellungen
echo ""
echo "📊 Aktuelle Rate Limiting Konfiguration:"
grep "RATE_LIMIT" .env

# Starte den Service neu, um die Änderungen zu übernehmen
echo ""
echo "🔄 Starte willi_mako Service neu..."
pm2 restart willi_mako || systemctl restart willi_mako || echo "⚠️  Konnte Service nicht automatisch neustarten"

echo "✅ .env aktualisiert und Service neugestartet"
EOF

echo ""
echo "✅ Fertig! Die neuen Rate Limiting Einstellungen sollten jetzt aktiv sein."
echo "   Teste den Upload mit: curl -X POST 'https://stromhaltig.de/api/workspace/documents/upload' -H 'Authorization: Bearer <token>' -F 'file=@test.pdf'"
