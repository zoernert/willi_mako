# Deployment Guide für Stromhaltig

## Systemanforderungen

### Hardware
- **CPU**: Mindestens 2 Cores, empfohlen 4 Cores
- **RAM**: Mindestens 4GB, empfohlen 8GB
- **Storage**: Mindestens 20GB freier Speicherplatz
- **Netzwerk**: Stabile Internetverbindung für API-Aufrufe

### Software
- **Node.js**: Version 18 oder höher
- **PostgreSQL**: Version 13 oder höher
- **Qdrant**: Vector Database auf 10.0.0.2:6333
- **Nginx**: Für Production Reverse Proxy (optional)

## Produktionssetup

### 1. Server-Vorbereitung
```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL installieren
sudo apt-get install -y postgresql postgresql-contrib

# PM2 für Process Management
sudo npm install -g pm2
```

### 2. Datenbank-Setup
```sql
-- Als postgres user
sudo -u postgres psql

CREATE DATABASE willi_mako;
CREATE USER willi_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE willi_mako TO willi_user;
```

### 3. Anwendung deployen
```bash
# Repository klonen
git clone https://github.com/zoernert/willi_mako.git
cd willi_mako

# Dependencies installieren
npm install
cd client && npm install && cd ..

# Environment konfigurieren
cp .env.example .env
# Bearbeiten Sie die .env Datei mit Produktionswerten

# Build erstellen
npm run build
cd client && npm run build && cd ..

# Datenbank initialisieren
node dist/init.js
```

### 4. PM2 Konfiguration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'willi-mako',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
```

```bash
# Anwendung starten
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Konfiguration (optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /path/to/willi_mako/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL/TLS Setup mit Let's Encrypt

```bash
# Certbot installieren
sudo apt-get install -y certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d your-domain.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

## Backup-Strategien

### Datenbank-Backup
```bash
# Backup erstellen
pg_dump -h localhost -U willi_user willi_mako > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup wiederherstellen
psql -h localhost -U willi_user -d willi_mako < backup_file.sql
```

### Datei-Backup
```bash
# Uploads sichern
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Logs sichern
tar -czf logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz logs/
```

## Monitoring & Logging

### Log-Rotation
```bash
# Logrotate konfigurieren
sudo nano /etc/logrotate.d/willi-mako

/path/to/willi_mako/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload willi-mako
    endscript
}
```

### Health Checks
```bash
# Health Check Script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ $response -eq 200 ]; then
    echo "OK - Application is running"
else
    echo "CRITICAL - Application is down"
    pm2 restart willi-mako
fi
```

## Sicherheitshinweise

### Firewall
```bash
# UFW konfigurieren
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # PostgreSQL (nur intern)
```

### Regelmäßige Updates
```bash
# System-Updates
sudo apt update && sudo apt upgrade -y

# Node.js Dependencies
npm audit fix
cd client && npm audit fix
```

### Sicherheits-Checklist
- [ ] SSL/TLS aktiviert
- [ ] Firewall konfiguriert
- [ ] Starke Passwörter verwendet
- [ ] JWT Secret geändert
- [ ] Rate Limiting aktiviert
- [ ] Backup-Strategie implementiert
- [ ] Monitoring eingerichtet
- [ ] Logs konfiguriert
- [ ] Regelmäßige Updates geplant

## Umgebungsvariablen (Production)

```env
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=willi_mako
DB_USER=willi_user
DB_PASSWORD=very_secure_password

# JWT
JWT_SECRET=very_long_and_secure_secret_key
JWT_EXPIRES_IN=24h

# Qdrant
QDRANT_URL=http://10.0.0.2:6333
QDRANT_API_KEY=str0mdao0
QDRANT_COLLECTION=willi

# Gemini
GEMINI_API_KEY=your_real_gemini_api_key

# File Upload
UPLOAD_PATH=/var/uploads/willi_mako
MAX_FILE_SIZE=50MB

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Troubleshooting

### Häufige Probleme
1. **Verbindung zu Qdrant fehlschlägt**: Überprüfen Sie die Netzwerkverbindung und Firewall
2. **Datenbank-Verbindungsfehler**: Stellen Sie sicher, dass PostgreSQL läuft
3. **Gemini API Fehler**: Überprüfen Sie den API-Key und die Quotas
4. **Datei-Upload Probleme**: Überprüfen Sie Berechtigungen im Upload-Verzeichnis

### Debugging
```bash
# Logs anzeigen
pm2 logs willi-mako

# Prozess-Status
pm2 status

# Speicher-Monitoring
pm2 monit
```

## Performance-Optimierung

### Caching
- Redis für Session-Caching
- Nginx für statische Dateien
- CDN für globale Verteilung

### Datenbank-Optimierung
- Indexe für häufige Queries
- Connection Pooling
- Query-Optimierung

---

Dieses Deployment-Guide bietet eine solide Grundlage für die Produktionsbereitstellung von Stromhaltig.

© 2025 [STROMDAO GmbH](https://stromdao.de/)
