#!/bin/bash

# Deployment Script für Willi Mako Produktivumgebung
# Produktivserver: root@10.0.0.2
# Por    # Gebaute Dateien kopieren
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
    fireSQL Port: 5117

set -e

echo "🚀 Deployment Script für Willi Mako Produktivumgebung"
echo "=================================================="

# Konfiguration
PROD_SERVER="root@10.0.0.2"
FRONTEND_PORT="3003"  # Next.js Frontend (extern)
BACKEND_PORT="3009"   # Express.js Backend (intern)
POSTGRES_PORT="5117"
APP_NAME="willi_mako"
DEPLOY_DIR="/opt/willi_mako"
POSTGRES_CONTAINER="willi_mako_postgres"
POSTGRES_DB="willi_mako"
POSTGRES_USER="willi_user"
POSTGRES_PASSWORD="willi_password"

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
    
    if [ -d "client/build" ]; then
        mkdir -p "$TEMP_DIR/client"
        cp -r client/build "$TEMP_DIR/client/"
    else
        echo "❌ client/build-Verzeichnis nicht gefunden. Client-Build fehlgeschlagen?"
        exit 1
    fi
    
    # Uploads-Verzeichnis erstellen
    mkdir -p "$TEMP_DIR/uploads"
    
    # PM2 Ecosystem-Datei erstellen
    cat > "$TEMP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/server.js',
    cwd: '$DEPLOY_DIR',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PROD_PORT
    },
    error_file: '$DEPLOY_DIR/logs/err.log',
    out_file: '$DEPLOY_DIR/logs/out.log',
    log_file: '$DEPLOY_DIR/logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
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

    # Deployment-Script für den Server erstellen
    cat > "$TEMP_DIR/server_setup.sh" << 'EOF'
#!/bin/bash

set -e

echo "🛠️  Server-Setup für Willi Mako"
echo "================================"

# Variablen
DEPLOY_DIR="/opt/willi_mako"
APP_NAME="willi_mako"
POSTGRES_CONTAINER="willi_mako_postgres"

# Warte auf APT-Sperre
wait_for_apt() {
    local timeout=300
    local elapsed=0
    
    while fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
        echo "Warte auf APT-Sperre... ($elapsed/$timeout Sekunden)"
        sleep 10
        elapsed=$((elapsed + 10))
        if [ $elapsed -ge $timeout ]; then
            echo "Timeout erreicht, breche ab..."
            exit 1
        fi
    done
}

# Nur notwendige Pakete installieren/aktualisieren
echo "📦 Prüfe und installiere notwendige Pakete..."
wait_for_apt
apt-get update

# Installiere nur curl, wenn nicht vorhanden
if ! command -v curl &> /dev/null; then
    echo "📦 Installiere curl..."
    apt-get install -y curl
fi

# Node.js installieren (falls nicht vorhanden)
if ! command -v node &> /dev/null; then
    echo "📦 Installiere Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Docker installieren (falls nicht vorhanden)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installiere Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Docker Compose installieren (falls nicht vorhanden)
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installiere Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# PM2 global installieren (falls nicht vorhanden)
if ! command -v pm2 &> /dev/null; then
    echo "⚙️  Installiere PM2..."
    npm install -g pm2
fi

# Deployment-Verzeichnis erstellen
echo "📁 Erstelle Deployment-Verzeichnis..."
mkdir -p $DEPLOY_DIR
mkdir -p $DEPLOY_DIR/logs

# Alte Container stoppen und entfernen (falls vorhanden)
echo "🛑 Stoppe alte Container..."
docker-compose down 2>/dev/null || true
docker stop $POSTGRES_CONTAINER 2>/dev/null || true
docker rm $POSTGRES_CONTAINER 2>/dev/null || true

# PM2 App stoppen (falls läuft)
echo "🛑 Stoppe PM2 App..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

echo "✅ Server-Setup abgeschlossen"
EOF

    chmod +x "$TEMP_DIR/server_setup.sh"
    
    echo "✅ Deployment-Dateien vorbereitet in: $TEMP_DIR"
}

# Dateien auf Server übertragen
transfer_files() {
    local temp_dir=$1
    echo "📤 Übertrage Dateien auf Produktivserver..."
    
    # Deployment-Verzeichnis auf Server erstellen
    ssh $PROD_SERVER "mkdir -p $DEPLOY_DIR"
    
    # Dateien übertragen
    rsync -avz --progress "$temp_dir/" "$PROD_SERVER:$DEPLOY_DIR/"
    
    echo "✅ Dateien erfolgreich übertragen"
}

# Server-Setup ausführen
setup_server() {
    echo "⚙️  Führe Server-Setup aus..."
    
    ssh $PROD_SERVER << 'EOF'
cd /opt/willi_mako
chmod +x server_setup.sh
./server_setup.sh
EOF
    
    echo "✅ Server-Setup abgeschlossen"
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

# PostgreSQL-Container starten
start_postgres() {
    echo "🐳 Starte PostgreSQL-Container..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
docker-compose up -d postgres
sleep 10
docker-compose logs postgres
EOF
    
    echo "✅ PostgreSQL-Container gestartet"
}

# Anwendung mit PM2 starten
start_application() {
    echo "🚀 Starte Anwendung mit PM2..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup
EOF
    
    echo "✅ Anwendung gestartet"
}

# Status prüfen
check_status() {
    echo "🔍 Prüfe Status..."
    
    ssh $PROD_SERVER << EOF
echo "Docker Container:"
docker ps | grep postgres
echo ""
echo "PM2 Prozesse:"
pm2 list
echo ""
echo "Anwendung Status:"
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
    echo "Starte Deployment für Willi Mako Produktivumgebung"
    echo "Server: $PROD_SERVER"
    echo "Port: $PROD_PORT"
    echo "PostgreSQL Port: $POSTGRES_PORT"
    echo ""
    
    check_ssh_connection
    build_application
    
    # Deployment-Dateien vorbereiten und temporäres Verzeichnis in Variable speichern
    prepare_deployment
    TEMP_DIR_PATH=$TEMP_DIR
    
    transfer_files "$TEMP_DIR_PATH"
    setup_server
    install_dependencies
    start_postgres
    start_application
    check_status
    
    echo ""
    echo "🎉 Deployment erfolgreich abgeschlossen!"
    echo "Anwendung läuft auf: http://10.0.0.2:$PROD_PORT"
    echo ""
    echo "Nützliche Befehle:"
    echo "  ssh $PROD_SERVER 'pm2 status'"
    echo "  ssh $PROD_SERVER 'pm2 logs $APP_NAME'"
    echo "  ssh $PROD_SERVER 'docker-compose logs -f postgres'"
    echo "  ssh $PROD_SERVER 'pm2 restart $APP_NAME'"
}

# Script ausführen
main "$@"
