#!/bin/bash

# Monitoring Script für Willi Mako Produktivumgebung
# Überwacht den Status der Anwendung und Services

set -e

echo "📊 Monitoring für Willi Mako"
echo "============================="

# Konfiguration
PROD_SERVER="root@10.0.0.2"
PROD_PORT="2110"
APP_NAME="willi_mako"
POSTGRES_CONTAINER="willi_mako_postgres"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Status-Check durchführen
check_server_status() {
    echo "🖥️  Server Status:"
    
    ssh $PROD_SERVER << 'EOF'
echo "Uptime: $(uptime)"
echo "Speicher: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2 " (" $3/$2*100 "% verwendet)"}')"
echo "Festplatte: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " verwendet)"}')"
echo "CPU Load: $(cat /proc/loadavg | awk '{print $1 " " $2 " " $3}')"
EOF
}

check_docker_status() {
    echo "🐳 Docker Container Status:"
    
    ssh $PROD_SERVER << EOF
if docker ps --filter "name=$POSTGRES_CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q $POSTGRES_CONTAINER; then
    echo -e "${GREEN}✅ PostgreSQL Container läuft${NC}"
    docker ps --filter "name=$POSTGRES_CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${RED}❌ PostgreSQL Container läuft nicht${NC}"
fi
EOF
}

check_pm2_status() {
    echo "⚙️  PM2 Prozess Status:"
    
    ssh $PROD_SERVER << EOF
if pm2 list | grep -q $APP_NAME; then
    pm2 show $APP_NAME
    echo ""
    echo "Memory Usage:"
    pm2 monit --no-colors | head -20
else
    echo -e "${RED}❌ PM2 Prozess '$APP_NAME' nicht gefunden${NC}"
fi
EOF
}

check_application_health() {
    echo "🏥 Anwendungs-Health-Check:"
    
    ssh $PROD_SERVER << EOF
echo "Testing HTTP connection..."
if curl -s -f http://localhost:$PROD_PORT/health > /dev/null; then
    echo -e "${GREEN}✅ Anwendung ist erreichbar${NC}"
    echo "Response: \$(curl -s http://localhost:$PROD_PORT/health)"
else
    echo -e "${RED}❌ Anwendung nicht erreichbar${NC}"
fi

echo ""
echo "Testing external access..."
if curl -s -f http://10.0.0.2:$PROD_PORT/health > /dev/null; then
    echo -e "${GREEN}✅ Externe Erreichbarkeit OK${NC}"
else
    echo -e "${RED}❌ Externe Erreichbarkeit fehlgeschlagen${NC}"
fi
EOF
}

check_database_connection() {
    echo "🗄️  Datenbank-Verbindung:"
    
    ssh $PROD_SERVER << EOF
if docker exec $POSTGRES_CONTAINER psql -U willi_user -d willi_mako -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Datenbank-Verbindung OK${NC}"
    echo "Version: \$(docker exec $POSTGRES_CONTAINER psql -U willi_user -d willi_mako -c "SELECT version();" | head -3 | tail -1)"
else
    echo -e "${RED}❌ Datenbank-Verbindung fehlgeschlagen${NC}"
fi
EOF
}

check_logs() {
    echo "📝 Aktuelle Logs (letzte 20 Zeilen):"
    
    ssh $PROD_SERVER << EOF
echo "PM2 Logs:"
pm2 logs $APP_NAME --lines 10 --nostream || echo "Keine PM2 Logs verfügbar"

echo ""
echo "Docker Logs:"
docker logs $POSTGRES_CONTAINER --tail 10 || echo "Keine Docker Logs verfügbar"
EOF
}

check_disk_usage() {
    echo "💾 Festplattenspeicher:"
    
    ssh $PROD_SERVER << 'EOF'
echo "Gesamt-Speicher:"
df -h /

echo ""
echo "Logs-Verzeichnis:"
du -sh /opt/willi_mako/logs/* 2>/dev/null || echo "Keine Log-Dateien gefunden"

echo ""
echo "Upload-Verzeichnis:"
du -sh /opt/willi_mako/uploads/* 2>/dev/null || echo "Keine Upload-Dateien gefunden"

echo ""
echo "Docker Volumes:"
docker system df
EOF
}

# Alles zusammen prüfen
full_check() {
    echo "🔍 Vollständiger Status-Check"
    echo "=============================="
    
    check_server_status
    echo ""
    check_docker_status
    echo ""
    check_pm2_status
    echo ""
    check_application_health
    echo ""
    check_database_connection
    echo ""
    check_disk_usage
    echo ""
    check_logs
}

# Continuous Monitoring
continuous_monitoring() {
    echo "🔄 Kontinuierliches Monitoring (Strg+C zum Beenden)"
    echo "=================================================="
    
    while true; do
        clear
        echo "$(date): Monitoring Willi Mako auf $PROD_SERVER"
        echo "=============================================="
        
        check_application_health
        echo ""
        check_pm2_status
        echo ""
        check_docker_status
        
        echo ""
        echo "Nächste Überprüfung in 30 Sekunden..."
        sleep 30
    done
}

# Restart Services
restart_services() {
    echo "🔄 Starte Services neu..."
    
    ssh $PROD_SERVER << EOF
echo "Stoppe PM2 App..."
pm2 stop $APP_NAME

echo "Starte PM2 App..."
pm2 start $APP_NAME

echo "Starte Docker Container neu..."
docker restart $POSTGRES_CONTAINER

echo "Warte auf Services..."
sleep 10

echo "Status nach Neustart:"
pm2 list
docker ps --filter "name=$POSTGRES_CONTAINER"
EOF
}

# Hilfe anzeigen
show_help() {
    echo "Verfügbare Kommandos:"
    echo "  $0 status       - Vollständiger Status-Check"
    echo "  $0 health       - Nur Anwendungs-Health-Check"
    echo "  $0 logs         - Aktuelle Logs anzeigen"
    echo "  $0 monitor      - Kontinuierliches Monitoring"
    echo "  $0 restart      - Services neustarten"
    echo "  $0 disk         - Festplattenspeicher prüfen"
    echo "  $0 help         - Diese Hilfe anzeigen"
}

# Hauptfunktion
main() {
    local command=${1:-status}
    
    case $command in
        status)
            full_check
            ;;
        health)
            check_application_health
            ;;
        logs)
            check_logs
            ;;
        monitor)
            continuous_monitoring
            ;;
        restart)
            restart_services
            ;;
        disk)
            check_disk_usage
            ;;
        help)
            show_help
            ;;
        *)
            echo "❌ Unbekanntes Kommando: $command"
            show_help
            exit 1
            ;;
    esac
}

# Script ausführen
main "$@"
