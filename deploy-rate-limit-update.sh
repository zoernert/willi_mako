#!/bin/bash
# deploy-rate-limit-update.sh - Deploy erhöhtes globales Rate Limit

set -e

echo "🚀 Deploying Rate Limit Update (100 → 200)..."

PROD_SERVER=${1:-"root@10.0.0.2"}
DEPLOY_DIR="/opt/willi_mako"

# Option 1: Quick ENV Update (empfohlen, ~30 Sekunden)
echo ""
echo "📝 Option 1: Quick Update (nur .env, kein Build)"
echo "   - Aktualisiert RATE_LIMIT_MAX=200"
echo "   - Startet Service neu"
echo "   - Dauer: ~30 Sekunden"
echo ""
echo "📝 Option 2: Full Deployment (mit Build)"
echo "   - Kompletter Build + Deployment"
echo "   - Dauer: ~5-10 Minuten"
echo ""

read -p "Wähle Option (1/2): " option

if [ "$option" = "1" ]; then
    echo "⚡ Führe Quick Update aus..."
    ./update-production-env.sh
    
    echo ""
    echo "✅ Rate Limit Update abgeschlossen!"
    echo ""
    echo "📊 Neue Konfiguration:"
    echo "   RATE_LIMIT_WINDOW=15 (Minuten)"
    echo "   RATE_LIMIT_MAX=200 (vorher: 100)"
    echo ""
    echo "💡 Das entspricht:"
    echo "   - 200 Requests pro 15 Minuten"
    echo "   - ~13 Requests pro Minute"
    echo "   - ~1 Request alle 4.5 Sekunden"
    echo ""
    
elif [ "$option" = "2" ]; then
    echo "🔨 Führe Full Deployment aus..."
    ./quick-deploy.sh
    
    echo ""
    echo "✅ Full Deployment abgeschlossen!"
    
else
    echo "❌ Ungültige Option. Abbruch."
    exit 1
fi

echo "🧪 Testing:"
echo "   # Prüfe Rate Limit auf Produktion"
echo "   ssh $PROD_SERVER 'cd $DEPLOY_DIR && grep RATE_LIMIT .env'"
echo ""
echo "   # Teste API"
echo "   curl -I https://stromhaltig.de/api/health"
echo ""
echo "📈 Monitoring:"
echo "   # Rate Limit Events"
echo "   ssh $PROD_SERVER 'pm2 logs willi-mako --lines 100 | grep \"RATE LIMIT\"'"
echo ""
