#!/bin/bash

# Update Script für Willi Mako    # Gebaute Dateien kopieren
    if [ -d "dist" ]; then
        cp -r dist "$TEMP_DIR/"
    else
        echo "❌ dist-Verzeichnis nicht gefunden. Build fehlgeschlagen?"
        exit 1
    fi
    
    if [ -d "client/build" ]; then
        mkdir -p "$TEMP_DIR/client/build"
        cp -r client/build/* "$TEMP_DIR/client/build/"
    else
        echo "❌ client/build-Verzeichnis nicht gefunden. Client-Build fehlgeschlagen?"
        exit 1
    fiung
# Für schnelle Updates ohne vollständige Neuinstallation

set -e

echo "🔄 Update Script für Willi Mako"
echo "=============================="

# Konfiguration
PROD_SERVER="root@10.0.0.2"
FRONTEND_PORT="3003"  # Next.js Frontend (extern)
BACKEND_PORT="3009"   # Express.js Backend (intern)
APP_NAME="willi_mako"
DEPLOY_DIR="/opt/willi_mako"

# Lokale Builds erstellen
build_application() {
    echo "🔨 Erstelle lokale Builds..."
    
    # Client Build
    echo "📦 Baue Client..."
    cd client
    npm install
    npm run build
    cd ..
    
    # Server Build
    echo "📦 Baue Server..."
    npm install
    npm run build
    
    echo "✅ Builds erfolgreich erstellt"
}

# Update-Dateien vorbereiten
prepare_update() {
    echo "📁 Bereite Update-Dateien vor..."
    
    # Temporäres Update-Verzeichnis erstellen
    TEMP_DIR=$(mktemp -d)
    echo "Temporäres Verzeichnis: $TEMP_DIR"
    
    # Nur die geänderten Dateien kopieren (prüfen ob sie existieren)
    if [ -d "dist" ]; then
        cp -r dist "$TEMP_DIR/"
    else
        echo "❌ dist-Verzeichnis nicht gefunden. Build fehlgeschlagen?"
        exit 1
    fi
    
    if [ -d "client/build" ]; then
        mkdir -p "$TEMP_DIR/client"
        cp -r client/build "$TEMP_DIR/client/"
    else
        echo "❌ client/build-Verzeichnis nicht gefunden. Client-Build fehlgeschlagen?"
        exit 1
    fi
    
    echo "✅ Update-Dateien vorbereitet in: $TEMP_DIR"
    echo $TEMP_DIR
}

# Update-Dateien übertragen
transfer_update() {
    local temp_dir=$1
    echo "📤 Übertrage Update-Dateien..."
    
    # Anwendung stoppen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && pm2 stop $APP_NAME"
    
    # Backup erstellen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S) && cp -r client client.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Neue Dateien übertragen
    rsync -avz --progress "$temp_dir/dist/" "$PROD_SERVER:$DEPLOY_DIR/dist/"
    rsync -avz --progress "$temp_dir/client/" "$PROD_SERVER:$DEPLOY_DIR/client/"
    
    # Anwendung starten
    ssh $PROD_SERVER "cd $DEPLOY_DIR && pm2 start $APP_NAME"
    
    echo "✅ Update erfolgreich übertragen"
}

# Status prüfen
check_status() {
    echo "🔍 Prüfe Status nach Update..."
    
    ssh $PROD_SERVER << EOF
echo "PM2 Status:"
pm2 list
echo ""
echo "Anwendung Status:"
sleep 5
curl -s http://localhost:$PROD_PORT/health || echo "Health-Check fehlgeschlagen"
EOF
}

# Cleanup
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        echo "🧹 Räume temporäre Dateien auf..."
        rm -rf "$TEMP_DIR"
    fi
}

# Fehlerbehandlung
trap cleanup EXIT

# Hauptfunktion
main() {
    echo "Starte Update für Willi Mako Produktivumgebung"
    echo "Server: $PROD_SERVER"
    echo ""
    
    build_application
    TEMP_DIR=$(prepare_update)
    transfer_update "$TEMP_DIR"
    check_status
    
    echo ""
    echo "🎉 Update erfolgreich abgeschlossen!"
    echo "Anwendung läuft auf: http://10.0.0.2:$PROD_PORT"
}

# Script ausführen
main "$@"
