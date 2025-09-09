#!/bin/bash

# Schnelles Deployment Script für Willi Mako (ohne System-Updates)
# Für Server, die bereits konfiguriert sind
git add -A;git commit -m "Auto" -a;git push --set-upstream origin main || git push origin main
set -e

echo "🚀 Schnelles Deployment für Willi Mako"
echo "======================================"

# Teste die Build-Pipeline lokal:
echo "🔍 Erstelle alle lokalen Builds..."

# 1. Backend Build (zuerst, da es am wahrscheinlichsten fehlschlägt)
echo "📦 Baue Backend..."
npm run build:backend
ls -la dist/ || true

# 2. Legacy App Build
echo "📦 Baue Legacy App..."
echo "🔧 Erstelle .env.production für Legacy App..."
cd app-legacy
# Stelle sicher, dass die richtige API-URL verwendet wird
cat > .env.production << 'LEGACYENVEOF'
REACT_APP_API_URL=/api
REACT_APP_APP_NAME=Willi Mako
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
LEGACYENVEOF
npm run build && cd ..

# Füge Plausible Analytics Tracking Code zur Legacy App hinzu
echo "📊 Füge Plausible Analytics Tracking Code zur Legacy App hinzu..."
if [ -f "app-legacy/build/index.html" ]; then
  # Sichere die originale Datei
  cp app-legacy/build/index.html app-legacy/build/index.html.bak
  
  # Füge den Tracking Code vor dem schließenden </head> Tag ein
  sed -i 's|</head>|<script defer data-domain="stromhaltig.de" src="https://stats.corrently.cloud/js/script.js"></script></head>|' app-legacy/build/index.html
  
  echo "✅ Plausible Analytics Tracking Code zur Legacy App hinzugefügt"
else
  echo "❌ Legacy App Build index.html nicht gefunden"
fi

ls -la app-legacy/build/

# 3. Next.js Pipeline  
echo "📦 Baue Next.js App..."

# .env.production für Next.js Build erstellen
echo "🔧 Erstelle .env.production für Next.js Build..."
cat > .env.production << 'ENVEOF'
NODE_ENV=production
API_URL=http://127.0.0.1:4101
ENVEOF

npm run build:legacy
npm run move:legacy
NODE_ENV=production npm run build:next
ls -la .next/

echo "✅ Alle Builds erfolgreich"


# Git Commit Hash für Versionierung erfassen
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT_SHORT=${GIT_COMMIT:0:7}
BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

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
ADDITIONAL_EXCLUDES="--exclude node_modules --exclude .git --exclude .cache"

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

# Validiere dass alle Builds vorhanden sind
validate_builds() {
    echo "🔎 Validiere vorhandene Builds..."
    # Prüfe Backend Build
    if [ -f "dist/server.js" ]; then
        echo "✅ Backend Build gefunden (dist/server.js)"
    else
        echo "❌ Backend Build nicht gefunden - dist/server.js fehlt"
        exit 1
    fi
    
    # Prüfe Legacy App Build (wurde nach public/app verschoben)
    if [ ! -f "public/app/index.html" ]; then
        echo "❌ Legacy App Build nicht gefunden - public/app/index.html fehlt"
        exit 1
    fi
    
    # Prüfe ob die index.html die korrekten /app Pfade hat
    if ! grep -q 'src="/app/static/js/' public/app/index.html; then
        echo "❌ Legacy App Build hat falsche Pfade - /app basename nicht korrekt"
        exit 1
    fi
    echo "✅ Legacy App Build mit korrekten /app Pfaden gefunden"
    
    # Prüfe Next.js Build
    if [ ! -d ".next" ]; then
        echo "❌ Next.js Build nicht gefunden - .next Verzeichnis fehlt"
        exit 1
    fi
    echo "✅ Next.js Build gefunden"
    
    # Prüfe ob Legacy App in public/app kopiert wurde
    if [ ! -f "public/app/index.html" ]; then
        echo "❌ Legacy App nicht in public/app gefunden"
        exit 1
    fi
    echo "✅ Legacy App in public/app kopiert"
    
    # Basic MIME sanity check locally using file(1) to ensure built asset types look right
    if command -v file >/dev/null 2>&1; then
        echo "🔍 Prüfe lokale Asset-Typen (heuristisch)..."
        file -b --mime-type public/app/static/css/*.css | grep -q 'text/css' || echo "⚠️ CSS MIME nicht eindeutig text/css (lokal Heuristik)"
        file -b --mime-type public/app/static/js/*.js | grep -Eq 'application/javascript|text/javascript' || echo "⚠️ JS MIME nicht eindeutig javascript (lokal Heuristik)"
    fi
    
    echo "✅ Alle Builds validiert"
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
    
    # VERSION Datei erzeugen
    cat > "$TEMP_DIR/VERSION" << EOF
Application: $APP_NAME
GitCommit: $GIT_COMMIT
GitCommitShort: $GIT_COMMIT_SHORT
BuildTimestamp: $BUILD_TIMESTAMP
LocalHost: $(hostname 2>/dev/null || echo unknown)
EOF
    
    # Produktions-.env erstellen (mit remote PostgreSQL + Versionsinfo)
    cat > "$TEMP_DIR/.env" << EOF
# Environment Configuration
NODE_ENV=production
PORT=$BACKEND_PORT
GIT_COMMIT=$GIT_COMMIT
GIT_COMMIT_SHORT=$GIT_COMMIT_SHORT
BUILD_TIMESTAMP=$BUILD_TIMESTAMP

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
QDRANT_COMMUNITY_COLLECTION=community_content

# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k
GOOGLE_AI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash

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

# Feature Flags
FEATURE_COMMUNITY_HUB=true
ENABLE_M2C_ROLES=true
COMMUNITY_ENABLE_PUBLIC_READ=true

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

    # package.json & package-lock.json kopieren
    cp package.json "$TEMP_DIR/"
    if [ -f package-lock.json ]; then
        cp package-lock.json "$TEMP_DIR/"
    fi
    
    # Gebaute Dateien kopieren (prüfen ob sie existieren)
    if [ -d "dist" ]; then
        cp -r dist "$TEMP_DIR/"
        # Build Info einbetten (Marker für neue CodeLookup Felder)
        cat > "$TEMP_DIR/dist/BUILD_INFO.json" << EOF
{"application":"$APP_NAME","gitCommit":"$GIT_COMMIT","buildTimestamp":"$BUILD_TIMESTAMP","marker":"BDEW_CODES_MARKER"}
EOF
    else
        echo "❌ dist-Verzeichnis nicht gefunden. Build fehlgeschlagen?"
        exit 1
    fi
    
    # Light API Service Dateien kopieren
    if [ -f "willi-mako-light-api.js" ]; then
        cp willi-mako-light-api.js "$TEMP_DIR/"
        chmod +x "$TEMP_DIR/willi-mako-light-api.js"
        
        # Kopiere light-api-package.json für separate Dependency-Installation
        if [ -f "light-api-package.json" ]; then
            cp light-api-package.json "$TEMP_DIR/"
        fi
        
        if [ -f "start-willi-mako-light-api.sh" ]; then
            cp start-willi-mako-light-api.sh "$TEMP_DIR/"
            chmod +x "$TEMP_DIR/start-willi-mako-light-api.sh"
        fi
        
        if [ -f "test-willi-mako-light-api.sh" ]; then
            cp test-willi-mako-light-api.sh "$TEMP_DIR/"
            chmod +x "$TEMP_DIR/test-willi-mako-light-api.sh"
        fi
        
        if [ -f "willi-mako-light-api-README.md" ]; then
            cp willi-mako-light-api-README.md "$TEMP_DIR/"
        fi
        
        # Logs-Verzeichnis für Light API erstellen
        mkdir -p "$TEMP_DIR/logs"
    else
        echo "⚠️ Light API Service Datei nicht gefunden - Light API wird nicht installiert"
    fi
    
    # Migration-Dateien kopieren (falls vorhanden)
    if [ -f "migration-screenshot-support.sql" ]; then
        cp migration-screenshot-support.sql "$TEMP_DIR/"
        echo "✅ Screenshot-Migration-Datei kopiert"
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
        cp "$TEMP_DIR/VERSION" "$TEMP_DIR/public/version.txt" || true
    else
        echo "❌ public-Verzeichnis nicht gefunden."
        exit 1
    fi

    # Content (MDX) Dateien kopieren für Laufzeit (ISR-Regeneration)
    if [ -d "content" ]; then
        cp -r content "$TEMP_DIR/"
        echo "✅ content/ Verzeichnis für MDX-Inhalte hinzugefügt"
    else
        echo "⚠️  content/ Verzeichnis nicht gefunden – Whitepaper/Artikel werden nur aus dem Build bedient (ISR könnte leeren Zustand liefern)"
    fi
    
    # Next.js Config kopieren
    if [ -f "next.config.js" ]; then
        cp next.config.js "$TEMP_DIR/"
    fi
    
    # .env.production kopieren (für Next.js Runtime) mit Feature Flags ergänzen
    cat > "$TEMP_DIR/.env.production" << EOF
NODE_ENV=production
API_URL=http://127.0.0.1:$BACKEND_PORT
FEATURE_COMMUNITY_HUB=true
ENABLE_M2C_ROLES=true
GEMINI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k
GOOGLE_AI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash
EOF
    
    # .env.light-api für den Light API Service erstellen
    cat > "$TEMP_DIR/.env.light-api" << EOF
# Willi-Mako-Light API Konfiguration
PORT=3719
API_BASE_URL=https://stromhaltig.de/api
EMAIL=kontakt+demo@stromdao.com
PASSWORD=willi.mako
VERBOSE=true
EOF

    # HINWEIS: lib Verzeichnis ist jetzt in src/lib und wird automatisch mit dist/ kopiert
    
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
    BACKEND_ENTRY="dist/server.js"
    if [ ! -f "$TEMP_DIR/$BACKEND_ENTRY" ]; then
      echo "❌ Backend Entry Point nicht gefunden: $BACKEND_ENTRY"
      exit 1
    fi
    echo "✅ Verwende korrekten Backend Entry: $BACKEND_ENTRY"
    
    # Export für spätere Funktionen
    export BACKEND_ENTRY
    cat > "$TEMP_DIR/ecosystem_4100.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'willi_mako_backend_4101',
      script: '$BACKEND_ENTRY',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: { 
        NODE_ENV: 'production', 
        PORT: $BACKEND_PORT,
        FEATURE_COMMUNITY_HUB: 'true',
        ENABLE_M2C_ROLES: 'true',
        COMMUNITY_ENABLE_PUBLIC_READ: 'true',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_VISION_MODEL: 'gemini-2.5-flash'
      },
      env_file: '$DEPLOY_DIR/.env',
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
      env: { NODE_ENV: 'production', PORT: $FRONTEND_PORT },
      error_file: '$DEPLOY_DIR/logs/frontend_4100_err.log',
      out_file: '$DEPLOY_DIR/logs/frontend_4100_out.log',
      log_file: '$DEPLOY_DIR/logs/frontend_4100_combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'willi_mako_light_api_3719',
      script: 'willi-mako-light-api.js',
      cwd: '$DEPLOY_DIR',
      instances: 1,
      exec_mode: 'fork',
      env: { 
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '$DEPLOY_DIR/.env.light-api'
      },
      error_file: '$DEPLOY_DIR/logs/light_api_3719_err.log',
      out_file: '$DEPLOY_DIR/logs/light_api_3719_out.log',
      log_file: '$DEPLOY_DIR/logs/light_api_3719_combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
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
    
    # Alte Anwendung stoppen & löschen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && pm2 delete willi_mako_backend_4101 willi_mako_frontend_4100 2>/dev/null || true"
    
    # Backup erstellen
    ssh $PROD_SERVER "cd $DEPLOY_DIR && [ -d dist ] && cp -r dist dist.backup.\$(date +%Y%m%d_%H%M%S) || true"
    ssh $PROD_SERVER "cd $DEPLOY_DIR && [ -d client ] && cp -r client client.backup.\$(date +%Y%m%d_%H%M%S) || true"
    
    # Deployment-Verzeichnis auf Server erstellen
    ssh $PROD_SERVER "mkdir -p $DEPLOY_DIR/logs"
    
    # Dateien übertragen (vollständige Spiegelung, alte entfernen außer uploads & logs)
    rsync -avz --delete $ADDITIONAL_EXCLUDES \
      --exclude 'logs' --exclude 'uploads' --exclude '.env' \
      "$temp_dir/" "$PROD_SERVER:$DEPLOY_DIR/"
    
    # Ensure uploads & logs exist
    ssh $PROD_SERVER "mkdir -p $DEPLOY_DIR/uploads $DEPLOY_DIR/logs"
    
    # Validiere dass dist Verzeichnis korrekt übertragen wurde (lib ist jetzt in dist/lib)
    echo "🔍 Validiere dist Verzeichnis auf Produktivserver..."
    ssh $PROD_SERVER "ls -la $DEPLOY_DIR/dist/ && echo '✅ dist Verzeichnis gefunden' || echo '❌ dist Verzeichnis fehlt'"
    ssh $PROD_SERVER "ls -la $DEPLOY_DIR/dist/lib/ && echo '✅ dist/lib Verzeichnis gefunden' || echo '❌ dist/lib Verzeichnis fehlt'"
    
    # Prüfe VERSION & Marker
    ssh $PROD_SERVER "echo 'Root-Inhalt nach rsync:'; ls -1 $DEPLOY_DIR | head; [ -f $DEPLOY_DIR/VERSION ] && echo '✅ VERSION vorhanden' || echo '❌ VERSION fehlt'; [ -f $DEPLOY_DIR/dist/BUILD_INFO.json ] && echo '✅ BUILD_INFO.json vorhanden' || echo '❌ BUILD_INFO.json fehlt'"
    
    echo "✅ Dateien erfolgreich übertragen"
    
        # Server-side MIME check via curl HEAD to catch misrouted HTML responses for CSS/JS
        echo "🔍 Remote MIME-Type Check (CSS/JS Assets unter /app)..."
        ssh $PROD_SERVER "\
            set -e; \
            CSS_FILE=\$(basename \$(ls $DEPLOY_DIR/public/app/static/css/*.css | head -1)); \
            JS_FILE=\$(basename \$(ls $DEPLOY_DIR/public/app/static/js/*.js | head -1)); \
            echo CSS: \$CSS_FILE; echo JS: \$JS_FILE; \
            echo 'Local HEAD checks (over localhost:'$FRONTEND_PORT') will run in check_status()'; \
        "
}

# Abhängigkeiten installieren
install_dependencies() {
    echo "📦 Installiere Abhängigkeiten..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR
if [ -f package-lock.json ]; then
  echo "Nutze npm ci (deterministisch)";
  npm ci --omit=dev;
else
  echo "Nutze npm install --production";
  npm install --production;
fi
npm prune --production || true
EOF
    
    echo "✅ Abhängigkeiten installiert"
}

# Verifiziere dass neuer Backend-Code (bdewCodes Marker) vorhanden ist
verify_backend_code() {
    echo "🔍 Verifiziere neuen CodeLookup-Code (bdewCodes) auf Server..."
    ssh $PROD_SERVER "grep -R 'bdewCodes' $DEPLOY_DIR/dist 2>/dev/null || echo '❌ bdewCodes nicht im kompilierten Backend gefunden'"
    
    # Teste Backend Entry Point auf Module-Import Errors
    echo "🔍 Teste Backend Entry Point ($BACKEND_ENTRY)..."
    ssh $PROD_SERVER "cd $DEPLOY_DIR && node -e \"console.log('Testing backend entry...'); require('./$BACKEND_ENTRY');\" 2>&1 | head -5 || echo '❌ Backend Entry Point hat Import-Errors'"
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

# Führe Datenbankmigrationen aus
run_database_migrations() {
    echo "🗃️ Führe Datenbankmigrationen aus..."
    
    ssh $PROD_SERVER << 'EOF'
cd $DEPLOY_DIR

# Prüfe ob Migration-Dateien existieren
if [ -f "migration-screenshot-support.sql" ]; then
    echo "📄 Screenshot-Support Migration gefunden"
    
    # Prüfe ob Screenshot-Tabellen bereits existieren
    if PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "\d file_uploads" 2>/dev/null | grep -q "file_uploads"; then
        echo "✅ Screenshot-Support bereits migriert (file_uploads Tabelle existiert)"
    else
        echo "🔄 Führe Screenshot-Support Migration aus..."
        if PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -f migration-screenshot-support.sql; then
            echo "✅ Screenshot-Support Migration erfolgreich"
        else
            echo "❌ Screenshot-Support Migration fehlgeschlagen"
            exit 1
        fi
    fi
else
    echo "⚠️  migration-screenshot-support.sql nicht gefunden - überspringe Screenshot-Migration"
fi

# Prüfe Upload-Verzeichnisse
echo "📁 Erstelle Upload-Verzeichnisse..."
mkdir -p uploads/screenshots uploads/temp
chmod 755 uploads uploads/screenshots uploads/temp
echo "✅ Upload-Verzeichnisse erstellt"
EOF

    echo "✅ Datenbankmigrationen abgeschlossen"
}

# Anwendung mit PM2 starten
start_application() {
    echo "🚀 Starte Anwendung mit PM2..."
    
    ssh $PROD_SERVER << EOF
cd $DEPLOY_DIR

# Installiere Light API Abhängigkeiten separat
if [ -f "light-api-package.json" ]; then
    echo "📦 Installiere Light API Abhängigkeiten..."
    # Erstelle temporäres Verzeichnis für Light API und installiere Abhängigkeiten
    mkdir -p light-api-deps
    cp light-api-package.json light-api-deps/package.json
    cd light-api-deps
    npm install --production
    cd ..
    # Kopiere node_modules zurück ins Hauptverzeichnis
    cp -r light-api-deps/node_modules/dotenv node_modules/
    cp -r light-api-deps/node_modules/express node_modules/
    cp -r light-api-deps/node_modules/axios node_modules/
    cp -r light-api-deps/node_modules/morgan node_modules/
    cp -r light-api-deps/node_modules/body-parser node_modules/
    echo "✅ Light API Abhängigkeiten installiert"
else
    # Fallback: Nur dotenv neu installieren
    echo "📦 Reinstalliere dotenv und andere Light API Abhängigkeiten..."
    npm install dotenv express axios morgan body-parser
    echo "✅ dotenv und andere Abhängigkeiten reinstalliert"
fi

pm2 start ecosystem_4100.config.js
pm2 save
pm2 describe willi_mako_backend_4101 | grep cwd || true
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
echo "Light API (Port 3719, intern):"
curl -s http://localhost:3719/ || echo "Light API Health-Check fehlgeschlagen"
echo ""
echo "Static Pages Test:"
curl -s -I http://localhost:$FRONTEND_PORT/ | head -1 || echo "Homepage nicht erreichbar"
curl -s -I http://localhost:$FRONTEND_PORT/app/ | head -1 || echo "Legacy App nicht erreichbar"
curl -s -I http://localhost:$FRONTEND_PORT/wissen/ | head -1 || echo "Wissen Page nicht erreichbar"
echo "\nMIME-Type Checks (Legacy Assets):"
CSS_ASSET=$(basename $(ls public/app/static/css/*.css | head -1) 2>/dev/null)
JS_ASSET=$(basename $(ls public/app/static/js/*.js | head -1) 2>/dev/null)
if [ -n "$CSS_ASSET" ]; then
    curl -s -I http://localhost:$FRONTEND_PORT/app/static/css/$CSS_ASSET | sed -n '1p;/Content-Type/p'
fi
if [ -n "$JS_ASSET" ]; then
    curl -s -I http://localhost:$FRONTEND_PORT/app/static/js/$JS_ASSET | sed -n '1p;/Content-Type/p'
fi
echo ""
echo "CodeLookup API Test (/api/codes):"
curl -s "http://localhost:$FRONTEND_PORT/api/codes?query=test&_ts=\$(date +%s)" | head -c 400; echo ""
echo "CodeLookup API Test (/api/codes-new):"
curl -s "http://localhost:$FRONTEND_PORT/api/codes-new?query=test&_ts=\$(date +%s)" | head -c 400; echo ""
echo "Prüfe ob Antwort Felder bdewCodes oder contacts enthält:"
curl -s "http://localhost:$FRONTEND_PORT/api/codes?query=test" | grep -q 'bdewCodes' && echo '✅ bdewCodes in /api/codes' || echo '❌ bdewCodes fehlen in /api/codes'
curl -s "http://localhost:$FRONTEND_PORT/api/codes-new?query=test" | grep -q 'bdewCodes' && echo '✅ bdewCodes in /api/codes-new' || echo '❌ bdewCodes fehlen in /api/codes-new'

echo ""
echo "FAQ API Test:"
echo "Anzahl FAQs über API:"
curl -s http://localhost:$FRONTEND_PORT/api/faqs | jq '. | length' 2>/dev/null || echo "FAQ API nicht erreichbar oder jq nicht verfügbar"
echo "Erste FAQ über API:"
curl -s http://localhost:$FRONTEND_PORT/api/faqs | jq '.[0].title' 2>/dev/null || echo "Keine FAQs über API verfügbar"

echo ""
echo "Community API Test:"
curl -s -I http://localhost:$FRONTEND_PORT/api/community/threads | head -1 || echo "Community API nicht erreichbar"

if [ -f $DEPLOY_DIR/VERSION ]; then
  echo "\nVERSION Datei:"; cat $DEPLOY_DIR/VERSION; echo "";
else
  echo "❌ VERSION Datei fehlt im Deploy-Verzeichnis"
fi
if [ -f $DEPLOY_DIR/public/version.txt ]; then
  echo "\npublic/version.txt:"; head -n 5 $DEPLOY_DIR/public/version.txt; echo "";
fi
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
    validate_builds
    
    # Deployment-Dateien vorbereiten
    prepare_deployment
    TEMP_DIR_PATH=$TEMP_DIR
    
    transfer_files "$TEMP_DIR_PATH"
    install_dependencies
    verify_backend_code
    test_database_connection
    run_database_migrations
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
