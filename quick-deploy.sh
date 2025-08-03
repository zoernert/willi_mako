#!/bin/bash

# Schnelles Deployment Script für Willi Mako (ohne System-Updates)
# Für Server, die bereits konfiguriert sind
git add -A;git commit -m "Auto" -a;git push origin 
set -e

echo "🚀 Schnelles Deployment für Willi Mako"
echo "======================================"

# Konfiguration
PROD_SERVER=${1:-"root@10.0.0.2"}
PROD_PORT=${2:-"2110"}
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
    
    # Build für Produktion (verwendet relative API-Pfade)
    echo "🌐 Baue Legacy App für Produktion mit relativen API-Pfaden..."
    npm run build
    cd ..
    
    # Next.js Build
    echo "📦 Baue Next.js App..."
    npm install
    npm run build:legacy
    npm run move:legacy
    npm run build:next
    
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
    
    # Produktions-.env erstellen
    cat > "$TEMP_DIR/.env" << EOF
# Environment Configuration
NODE_ENV=production
PORT=$PROD_PORT

# Database Configuration
DB_HOST=localhost
DB_PORT=$POSTGRES_PORT
DB_NAME=$POSTGRES_DB
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Qdrant Configuration
QDRANT_URL=http://10.0.0.2:6333
QDRANT_API_KEY=str0mda0
QDRANT_COLLECTION=willi

# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
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
    
    # Next.js Config kopieren
    if [ -f "next.config.js" ]; then
        cp next.config.js "$TEMP_DIR/"
    fi
    
    # Uploads-Verzeichnis erstellen
    mkdir -p "$TEMP_DIR/uploads"
    
    # PM2 Ecosystem-Datei für Next.js erstellen
    cat > "$TEMP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: '${APP_NAME}_backend',
      script: 'dist/server.js',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $PROD_PORT
      }
    },
    {
      name: '${APP_NAME}_frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '$DEPLOY_DIR/logs/frontend_err.log',
      out_file: '$DEPLOY_DIR/logs/frontend_out.log',
      log_file: '$DEPLOY_DIR/logs/frontend_combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF

    # Docker Compose für PostgreSQL erstellen
    cat > "$TEMP_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: $POSTGRES_CONTAINER
    environment:
      POSTGRES_DB: $POSTGRES_DB
      POSTGRES_USER: $POSTGRES_USER
      POSTGRES_PASSWORD: $POSTGRES_PASSWORD
      POSTGRES_INITDB_ARGS: --encoding=UTF-8 --lc-collate=C --lc-ctype=C
    ports:
      - "$POSTGRES_PORT:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - willi_network

volumes:
  postgres_data:

networks:
  willi_network:
    driver: bridge
EOF

    # Datenbank-Initialisierungsscript erstellen
    cat > "$TEMP_DIR/init.sql" << 'EOF'
-- Datenbank-Initialisierung für Willi Mako
-- Hier können später Tabellen-Definitionen hinzugefügt werden

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Beispiel-Tabelle für Benutzer (kann angepasst werden)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
EOF
    
    echo "✅ Deployment-Dateien vorbereitet in: $TEMP_DIR"
}

# Dateien auf Server übertragen
transfer_files() {
    local temp_dir=$1
    echo "📤 Übertrage Dateien auf Produktivserver..."
    
    # Alte Anwendung stoppen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && pm2 stop $APP_NAME 2>/dev/null || true"
    
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

# PostgreSQL-Container starten (falls nicht läuft)
start_postgres() {
    echo "🐳 Starte PostgreSQL-Container..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
# Prüfe ob Container bereits läuft
if ! docker ps | grep -q $POSTGRES_CONTAINER; then
    echo "Container läuft nicht, starte neu..."
    docker-compose up -d postgres
    sleep 10
else
    echo "Container läuft bereits"
fi
docker-compose logs --tail=20 postgres
EOF
    
    echo "✅ PostgreSQL-Container Status geprüft"
}

# Demo-Benutzer einrichten
setup_demo_users() {
    echo "👥 Richte Demo-Benutzer ein..."
    
    ssh $PROD_SERVER << 'EOF'
cd /opt/willi_mako
echo "Erstelle/Aktualisiere Demo-Benutzer..."
docker exec willi_mako_postgres psql -U willi_user -d willi_mako -c "
-- Erstelle oder aktualisiere Admin-Benutzer (behält bestehende FAQs und Chats)
INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES
('admin@willimako.com', '\$2b\$10\$aDTTXJ9TuRl9K5JHu5BqyeNn4FYYRMZ.jmQn9zZ1/dm.edmbo/oOG', 'Admin User', 'admin', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    password_hash = '\$2b\$10\$aDTTXJ9TuRl9K5JHu5BqyeNn4FYYRMZ.jmQn9zZ1/dm.edmbo/oOG',
    name = 'Admin User',
    role = 'admin',
    updated_at = NOW();

-- Erstelle oder aktualisiere Test-Benutzer (behält bestehende FAQs und Chats)
INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES
('user@willimako.com', '\$2b\$10\$qdbWK6tKvFYpVKB6/SZ5Su5pSIpuyv/E/Ph.R3Fvga1JjJ6S6P83O', 'Test User', 'user', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    password_hash = '\$2b\$10\$qdbWK6tKvFYpVKB6/SZ5Su5pSIpuyv/E/Ph.R3Fvga1JjJ6S6P83O',
    name = 'Test User',
    role = 'user',
    updated_at = NOW();
"
EOF
    
    echo "✅ Demo-Benutzer eingerichtet/aktualisiert (bestehende FAQs und Chats bleiben erhalten)"
    echo "   - Admin: admin@willimako.com / admin123"
    echo "   - User:  user@willimako.com / user123"
}

# Anwendung mit PM2 starten
start_application() {
    echo "🚀 Starte Anwendung mit PM2..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
pm2 start ecosystem.config.js
pm2 save
EOF
    
    echo "✅ Anwendung gestartet"
}

# Status prüfen
check_status() {
    echo "🔍 Prüfe Status..."
    
    ssh $PROD_SERVER << EOF
echo "Docker Container:"
docker ps | grep postgres || echo "Kein PostgreSQL Container gefunden"
echo ""
echo "PM2 Prozesse:"
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
    echo "Starte schnelles Deployment für Willi Mako"
    echo "Server: $PROD_SERVER"
    echo "Server-IP: $SERVER_IP"
    echo "Port: $PROD_PORT"
    echo "PostgreSQL Port: $POSTGRES_PORT"
    echo "API-URL: Relative Pfade (/api)"
    echo ""
    
    check_ssh_connection
    build_application
    
    # Deployment-Dateien vorbereiten
    prepare_deployment
    TEMP_DIR_PATH=$TEMP_DIR
    
    transfer_files "$TEMP_DIR_PATH"
    install_dependencies
    start_postgres
    setup_demo_users
    start_application
    check_status
    
    echo ""
    echo "🎉 Deployment erfolgreich abgeschlossen!"
    echo "Anwendung läuft auf: http://$SERVER_IP:$PROD_PORT"
    echo "API verfügbar unter: http://$SERVER_IP:$PROD_PORT/api (relativer Pfad: /api)"
    echo ""
    echo "Nützliche Befehle:"
    echo "  ./monitor.sh status"
    echo "  ./monitor.sh logs"
    echo "  ssh $PROD_SERVER 'pm2 restart $APP_NAME'"
    echo ""
    echo "Verwendung: $0 [server] [port]"
    echo "Beispiel: $0 root@10.0.0.2 2110"
}

# Script ausführen
main "$@"
