#!/bin/bash

# Rollback Script für Willi Mako Produktivumgebung
# Für schnelle Wiederherstellung bei Problemen

set -e

echo "🔄 Rollback Script für Willi Mako"
echo "================================="

# Konfiguration
PROD_SERVER="root@10.0.0.2"
FRONTEND_PORT="3003"  # Next.js Frontend (extern)
BACKEND_PORT="3009"   # Express.js Backend (intern)
APP_NAME="willi_mako"
DEPLOY_DIR="/opt/willi_mako"

# Verfügbare Backups anzeigen
show_backups() {
    echo "📋 Verfügbare Backups:"
    ssh $PROD_SERVER "cd $DEPLOY_DIR && ls -la *.backup.* 2>/dev/null | head -10 || echo 'Keine Backups gefunden'"
}

# Rollback durchführen
perform_rollback() {
    local backup_suffix=$1
    
    if [ -z "$backup_suffix" ]; then
        echo "❌ Kein Backup-Suffix angegeben"
        echo "Verwendung: $0 [BACKUP_SUFFIX]"
        echo "Beispiel: $0 20250717_143022"
        exit 1
    fi
    
    echo "🔄 Führe Rollback durch mit Backup: $backup_suffix"
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR

# Anwendung stoppen
pm2 stop $APP_NAME

# Prüfen ob Backups existieren
if [ ! -d "dist.backup.$backup_suffix" ] || [ ! -d "client.backup.$backup_suffix" ]; then
    echo "❌ Backup mit Suffix $backup_suffix nicht gefunden"
    pm2 start $APP_NAME
    exit 1
fi

# Aktuelle Version als Backup speichern
cp -r dist dist.backup.rollback.\$(date +%Y%m%d_%H%M%S)
cp -r client client.backup.rollback.\$(date +%Y%m%d_%H%M%S)

# Rollback durchführen
rm -rf dist client
mv dist.backup.$backup_suffix dist
mv client.backup.$backup_suffix client

# Anwendung starten
pm2 start $APP_NAME

echo "✅ Rollback erfolgreich durchgeführt"
EOF
}

# Status prüfen
check_status() {
    echo "🔍 Prüfe Status nach Rollback..."
    
    ssh $PROD_SERVER << EOF
echo "PM2 Status:"
pm2 list
echo ""
echo "Anwendung Status:"
sleep 5
curl -s http://localhost:$PROD_PORT/health || echo "Health-Check fehlgeschlagen"
EOF
}

# Backup bereinigen
cleanup_old_backups() {
    echo "🧹 Bereinige alte Backups (behalte nur die letzten 5)..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
ls -t *.backup.* 2>/dev/null | tail -n +6 | xargs rm -rf || echo "Keine alten Backups zum Löschen gefunden"
EOF
}

# Hauptfunktion
main() {
    local backup_suffix=$1
    
    echo "Rollback für Willi Mako Produktivumgebung"
    echo "Server: $PROD_SERVER"
    echo ""
    
    if [ -z "$backup_suffix" ]; then
        show_backups
        echo ""
        echo "Verwendung: $0 [BACKUP_SUFFIX]"
        echo "Beispiel: $0 20250717_143022"
        exit 1
    fi
    
    perform_rollback "$backup_suffix"
    check_status
    
    echo ""
    echo "🎉 Rollback erfolgreich abgeschlossen!"
    echo "Anwendung läuft auf: http://10.0.0.2:$PROD_PORT"
    
    # Frage ob alte Backups bereinigt werden sollen
    read -p "Möchten Sie alte Backups bereinigen? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_old_backups
    fi
}

# Script ausführen
main "$@"
