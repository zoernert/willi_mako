#!/bin/bash

# Schnelles Deployment Script für Willi Mako (ohne System-Updates)
# Für Server, die bereits konfiguriert sind
git add -A;git commit -m "Auto" -a;git push --set-upstream origin main || git push origin main
set -e

echo "🚀 Schnelles Deployment für Willi Mako"
echo "======================================"

# Konfiguration
PROD_SERVER=${1:-"root@10.0.0.2"}
FRONTEND_PORT=${2:-"4100"}  # Next.js Frontend (extern)
BACKEND_PORT="4101"         # Express.js Backend (intern)
POSTGRES_PORT="5117"
APP_NAME="willi_mako"
DEPLOY_DIR="/opt/willi_mako"
POSTGRES_CONTAINER="willi_mako_postgres"
POSTGRES_DB="willi_mako"
POSTGRES_USER="willi_user"
POSTGRES_PASSWORD="willi_password"

# Extrahiere Server-IP für API-URL
SERVER_IP=$(echo $PROD_SERVER | cut -d'@' -f2)

# Generiere einen zufälligen JWT Secret
generate_jwt_secret() {
    openssl rand -hex 32
}

# Prüfe ob SSH-Verbindung zum Produktivserver möglich ist
check_ssh_connection() {
    echo "🔍 Prüfe SSH-Verbindung zum Produktivserver..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes $PROD_SERVER exit 2>/dev/null; then
        echo "✅ SSH-Verbindung erfolgreich"
    else
        echo "❌ SSH-Verbindung fehlgeschlagen. Bitte prüfe die Verbindung zu $PROD_SERVER"
        exit 1
    fi
}

# Lokale Builds erstellen
build_application() {
    echo "🔨 Erstelle lokale Builds..."
    
    # Legacy App Build
    echo "📦 Baue Legacy App..."
    cd app-legacy
    npm install
    
    # Build für Produktion mit /app basename (verwendet relative API-Pfade)
    echo "🌐 Baue Legacy App für Produktion mit /app basename und relativen API-Pfaden..."
    npm run build
    
    # Prüfe ob Legacy App Build erfolgreich war
    if [ ! -f "build/index.html" ]; then
        echo "❌ Legacy App Build fehlgeschlagen - build/index.html nicht gefunden"
        exit 1
    fi
    
    # Prüfe ob die index.html die korrekten /app Pfade hat
    if ! grep -q 'src="/app/static/js/' build/index.html; then
        echo "❌ Legacy App Build hat falsche Pfade - /app basename nicht korrekt"
        exit 1
    fi
    
    echo "✅ Legacy App Build erfolgreich mit korrekten /app Pfaden"
    cd ..
    
    # Next.js Build
    echo "📦 Baue Next.js App..."
    npm install
    npm run build:legacy
    npm run move:legacy
    
    # .env.production für Next.js Build erstellen
    echo "🔧 Erstelle .env.production für Next.js Build..."
    cat > .env.production << 'ENVEOF'
NODE_ENV=production
API_URL=http://127.0.0.1:4101
# Prefer internal backend for SSR self-calls in prod
INTERNAL_API_BASE_URL=http://127.0.0.1:4101
ENVEOF
    
    # Next.js Build mit Produktionsumgebung
    echo "🌐 Baue Next.js für Produktion (NODE_ENV=production)..."
    NODE_ENV=production npm run build:next
    
    # Server Build
    echo "📦 Baue Server..."
    npm run build
    
    echo "✅ Builds erfolgreich erstellt"
}

# Deployment-Dateien vorbereiten
prepare_deployment() {
    echo "📁 Bereite Deployment-Dateien vor..."
    
    # Temporäres Deployment-Verzeichnis erstellen
    TEMP_DIR=$(mktemp -d)
    echo "Temporäres Verzeichnis: $TEMP_DIR"
    
    # Prüfe ob bereits ein JWT-Secret auf dem Server existiert
    echo "🔐 Prüfe bestehenden JWT-Secret..."
    EXISTING_JWT_SECRET=$(ssh $PROD_SERVER "cd $DEPLOY_DIR && grep '^JWT_SECRET=' .env 2>/dev/null | cut -d'=' -f2 || echo ''")
    
    if [ -n "$EXISTING_JWT_SECRET" ]; then
        echo "✅ Verwende bestehenden JWT-Secret"
        JWT_SECRET="$EXISTING_JWT_SECRET"
    else
        echo "🔑 Generiere neuen JWT-Secret"
        JWT_SECRET=$(generate_jwt_secret)
    fi
    
    # Produktions-.env erstellen (mit remote PostgreSQL)
    cat > "$TEMP_DIR/.env" << EOF
# Environment Configuration
NODE_ENV=production
PORT=$BACKEND_PORT

# Database Configuration (Remote PostgreSQL)
DB_HOST=10.0.0.2
DB_PORT=5117
DB_NAME=willi_mako
DB_USER=willi_user
DB_PASSWORD=willi_password

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Qdrant Configuration
QDRANT_URL=http://10.0.0.2:6333
QDRANT_API_KEY=str0mda0
QDRANT_COLLECTION=willi_mako

# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=willi@stromhaltig.de
FROM_NAME=Willi Mako

# Frontend Configuration
FRONTEND_URL=https://stromhaltig.de

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Workspace Configuration
WORKSPACE_STORAGE_LIMIT_MB=500
WORKSPACE_MAX_FILE_SIZE_MB=50
WORKSPACE_ALLOWED_EXTENSIONS=pdf,doc,docx,txt,md
WORKSPACE_VECTOR_CHUNK_SIZE=1000
EOF

    # package.json kopieren
    cp package.json "$TEMP_DIR/"
    
    # Gebaute Dateien kopieren (prüfen ob sie existieren)
    if [ -d "dist" ]; then
        cp -r dist "$TEMP_DIR/"
    else
        echo "❌ dist-Verzeichnis nicht gefunden. Build fehlgeschlagen?"
        exit 1
    fi
    
    # Next.js Build kopieren
    if [ -d ".next" ]; then
        cp -r .next "$TEMP_DIR/"
    else
        echo "❌ .next-Verzeichnis nicht gefunden. Next.js Build fehlgeschlagen?"
        exit 1
    fi
    
    # Public Dateien kopieren (inkl. Legacy App)
    if [ -d "public" ]; then
        cp -r public "$TEMP_DIR/"
    else
        echo "❌ public-Verzeichnis nicht gefunden."
        exit 1
    fi

    # Content (MDX) Dateien kopieren (für ISR zur Laufzeit)
    if [ -d "content" ]; then
        cp -r content "$TEMP_DIR/"
        echo "✅ content/ Verzeichnis für MDX-Inhalte hinzugefügt"
    else
        echo "⚠️  content/ Verzeichnis nicht gefunden – Artikel/Whitepaper könnten fehlen"
    fi
    
    # Next.js Config kopieren
    if [ -f "next.config.js" ]; then
        cp next.config.js "$TEMP_DIR/"
    fi
    
    # .env.production kopieren/erstellen (für Next.js Runtime)
    if [ -f ".env.production" ]; then
        cp .env.production "$TEMP_DIR/"
    else
        cat > "$TEMP_DIR/.env.production" << EOF
NODE_ENV=production
API_URL=http://127.0.0.1:$BACKEND_PORT
INTERNAL_API_BASE_URL=http://127.0.0.1:$BACKEND_PORT
EOF
    fi
    
    # server.js für Production kopieren (Next.js-kompatibel)
    if [ -f "server_fixed.js" ]; then
        cp server_fixed.js "$TEMP_DIR/server.js"
        echo "✅ Fixed server.js kopiert (Next.js API-kompatibel)"
    elif [ -f "server_production.js" ]; then
        cp server_production.js "$TEMP_DIR/server.js"
        echo "✅ Production server.js kopiert"
    elif [ -f "server.js" ]; then
        cp server.js "$TEMP_DIR/"
        echo "⚠️  Standard server.js kopiert - eventuell nicht für Produktion optimiert"
    else
        echo "❌ server.js nicht gefunden. Hybrid-Setup fehlgeschlagen?"
        exit 1
    fi
    
    # Uploads-Verzeichnis erstellen
    mkdir -p "$TEMP_DIR/uploads"
    
    # PM2 Ecosystem-Datei für Port 4100/4101 Architektur erstellen
    cat > "$TEMP_DIR/ecosystem_4100.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'willi_mako_backend_4101',
      script: 'dist/server.js',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT
      },
      error_file: '$DEPLOY_DIR/logs/backend_4101_err.log',
      out_file: '$DEPLOY_DIR/logs/backend_4101_out.log',
      log_file: '$DEPLOY_DIR/logs/backend_4101_combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'willi_mako_frontend_4100',
      script: 'server.js',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT
      },
    env_file: '$DEPLOY_DIR/.env.production',
      error_file: '$DEPLOY_DIR/logs/frontend_4100_err.log',
      out_file: '$DEPLOY_DIR/logs/frontend_4100_out.log',
      log_file: '$DEPLOY_DIR/logs/frontend_4100_combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF
    
    echo "✅ Deployment-Dateien vorbereitet in: $TEMP_DIR"
}

# Dateien auf Server übertragen
transfer_files() {
    local temp_dir=$1
    echo "📤 Übertrage Dateien auf Produktivserver..."
    
    # Alte Anwendung stoppen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && pm2 stop willi_mako_backend_4101 willi_mako_frontend_4100 2>/dev/null || true"
    
    # Backup erstellen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && [ -d dist ] && cp -r dist dist.backup.\$(date +%Y%m%d_%H%M%S) || true"
    ssh $PROD_SERVER "cd $DEPLOY_DIR && [ -d client ] && cp -r client client.backup.\$(date +%Y%m%d_%H%M%S) || true"
    
    # Deployment-Verzeichnis auf Server erstellen
    ssh $PROD_SERVER "mkdir -p $DEPLOY_DIR/logs"
    
    # Dateien übertragen
    rsync -avz --progress "$temp_dir/" "$PROD_SERVER:$DEPLOY_DIR/"
    
    echo "✅ Dateien erfolgreich übertragen"
}

# Abhängigkeiten installieren
install_dependencies() {
    echo "📦 Installiere Abhängigkeiten..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
npm install --production
EOF
    
    echo "✅ Abhängigkeiten installiert"
}

# Test der Datenbankverbindung
test_database_connection() {
    echo "🔍 Teste Verbindung zur remote PostgreSQL-Datenbank..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
echo "Teste Datenbankverbindung zu 10.0.0.2:5117..."
# Einfacher Verbindungstest mit telnet oder nc
if command -v nc &> /dev/null; then
    if nc -z 10.0.0.2 5117; then
        echo "✅ PostgreSQL Server ist erreichbar auf 10.0.0.2:5117"
    else
        echo "❌ PostgreSQL Server nicht erreichbar auf 10.0.0.2:5117"
    fi
else
    echo "⚠️  nc (netcat) nicht verfügbar - überspringe Verbindungstest"
fi

# Test ob PostgreSQL Client verfügbar ist
if command -v psql &> /dev/null; then
    echo ""
    echo "🔍 Teste FAQ-Datenbank Inhalt..."
    echo "Anzahl FAQs in der Datenbank:"
    PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
    SELECT 
        COUNT(*) as total_faqs,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_faqs,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_faqs,
        COUNT(CASE WHEN is_active = true AND is_public = true THEN 1 END) as visible_faqs
    FROM faqs;" 2>/dev/null || echo "❌ FAQ Tabelle nicht erreichbar oder existiert nicht"
    
    echo ""
    echo "Neueste 3 FAQs:"
    PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
    SELECT title, is_active, is_public, created_at 
    FROM faqs 
    ORDER BY created_at DESC 
    LIMIT 3;" 2>/dev/null || echo "❌ Kann keine FAQ-Daten abrufen"
else
    echo "⚠️  psql nicht verfügbar - überspringe Datenbank-Inhaltstest"
fi
EOF
}

# Anwendung mit PM2 starten
start_application() {
    echo "🚀 Starte Anwendung mit PM2..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
pm2 start ecosystem_4100.config.js
pm2 save
EOF
    
    echo "✅ Anwendung gestartet"
}

# Status prüfen
check_status() {
    echo "🔍 Prüfe Status..."
    
    ssh $PROD_SERVER << EOF
echo "PM2 Prozesse:"
pm2 list
echo ""
echo "Datenbankverbindung:"
if command -v nc &> /dev/null; then
    if nc -z 10.0.0.2 5117; then
        echo "✅ Remote PostgreSQL erreichbar (10.0.0.2:5117)"
    else
        echo "❌ Remote PostgreSQL nicht erreichbar (10.0.0.2:5117)"
    fi
fi
echo ""
echo "Anwendung Status:"
sleep 5
echo "Frontend (Port $FRONTEND_PORT):"
curl -s http://localhost:$FRONTEND_PORT/api/health || echo "Frontend Health-Check fehlgeschlagen"
echo ""
echo "Backend (Port $BACKEND_PORT, intern):"
curl -s http://localhost:$BACKEND_PORT/api/health || echo "Backend Health-Check fehlgeschlagen"
echo ""
echo "Static Pages Test:"
curl -s -I http://localhost:$FRONTEND_PORT/ | head -1 || echo "Homepage nicht erreichbar"
curl -s -I http://localhost:$FRONTEND_PORT/app/ | head -1 || echo "Legacy App nicht erreichbar"
curl -s -I http://localhost:$FRONTEND_PORT/wissen/ | head -1 || echo "Wissen Page nicht erreichbar"
echo ""
echo "RSS/Atom Feed Test:"
curl -s -I http://localhost:$FRONTEND_PORT/feed.xml | head -1 || echo "RSS Feed nicht erreichbar"
curl -s -I http://localhost:$FRONTEND_PORT/atom.xml | head -1 || echo "Atom Feed nicht erreichbar"
echo ""
echo "FAQ API Test:"
echo "Anzahl FAQs über API:"
curl -s http://localhost:$FRONTEND_PORT/api/faqs | jq '. | length' 2>/dev/null || echo "FAQ API nicht erreichbar oder jq nicht verfügbar"
echo "Erste FAQ über API:"
curl -s http://localhost:$FRONTEND_PORT/api/faqs | jq '.[0].title' 2>/dev/null || echo "Keine FAQs über API verfügbar"
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
    echo "Starte schnelles Deployment für Willi Mako (Hybrid-Architektur)"
    echo "Server: $PROD_SERVER"
    echo "Server-IP: $SERVER_IP"
    echo "Frontend Port: $FRONTEND_PORT (Next.js - extern)"
    echo "Backend Port: $BACKEND_PORT (Express.js - intern)"
    echo "PostgreSQL Port: $POSTGRES_PORT"
    echo "API-URL: Proxied via Frontend (/api → Backend:$BACKEND_PORT)"
    echo ""
    
    check_ssh_connection
    build_application
    
    # Deployment-Dateien vorbereiten
    prepare_deployment
    TEMP_DIR_PATH=$TEMP_DIR
    
    transfer_files "$TEMP_DIR_PATH"
    install_dependencies
    test_database_connection
    start_application
    check_status
    
    echo ""
    echo "🎉 Deployment erfolgreich abgeschlossen!"
    echo "Frontend läuft auf: http://$SERVER_IP:$FRONTEND_PORT (Next.js)"
    echo "Backend läuft auf: http://$SERVER_IP:$BACKEND_PORT (Express.js - intern)"
    echo "API verfügbar über: http://$SERVER_IP:$FRONTEND_PORT/api (proxied)"
    echo "Remote PostgreSQL: 10.0.0.2:5117"
    echo ""
    echo "🔗 Verfügbare URLs:"
    echo "  - Frontend: http://$SERVER_IP:$FRONTEND_PORT/"
    echo "  - Legacy App: http://$SERVER_IP:$FRONTEND_PORT/app/"
    echo "  - FAQ Pages: http://$SERVER_IP:$FRONTEND_PORT/wissen/"
    echo "  - API: http://$SERVER_IP:$FRONTEND_PORT/api/"
    echo "  - RSS Feed: http://$SERVER_IP:$FRONTEND_PORT/feed.xml"
    echo "  - Atom Feed: http://$SERVER_IP:$FRONTEND_PORT/atom.xml"
    echo ""
    echo "📱 Legacy App Details:"
    echo "  - URL: http://$SERVER_IP:$FRONTEND_PORT/app/"
    echo "  - React Router basename: /app"
    echo "  - Statische Assets: /app/static/*"
    echo "  - Alle API-Calls werden über Next.js Frontend proxied"
    echo ""
    echo "🗃️ Datenbank:"
    echo "  - Remote PostgreSQL auf 10.0.0.2:5117"
    echo "  - Datenbank: willi_mako"
    echo "  - Benutzer: willi_user"
    echo ""
    echo "Nützliche Befehle:"
    echo "  ./monitor.sh status"
    echo "  ./monitor.sh logs"
    echo "  ssh $PROD_SERVER 'pm2 restart willi_mako_backend_4101'"
    echo "  ssh $PROD_SERVER 'pm2 restart willi_mako_frontend_4100'"
    echo "  ssh $PROD_SERVER 'pm2 restart all'"
    echo ""
    echo "Verwendung: $0 [server] [frontend_port]"
    echo "Beispiel: $0 root@10.0.0.2 3003"
}

# Script ausführen
main "$@"
