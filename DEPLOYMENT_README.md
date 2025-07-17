# Willi Mako - Deployment Scripts

Dieses Repository enthält Scripts für das Deployment der Willi Mako Anwendung auf dem Produktivserver.

## Produktivumgebung

- **Server**: `root@10.0.0.2`
- **Port**: `2110`
- **PostgreSQL Port**: `5117`
- **Deployment-Pfad**: `/opt/willi_mako`

## Verfügbare Scripts

### 1. `deploy.sh` - Vollständiges Deployment (Erstinstallation)

Führt ein komplettes Deployment der Anwendung durch mit System-Setup:

```bash
./deploy.sh
```

**Was macht das Script:**
- Prüft SSH-Verbindung zum Produktivserver
- Erstellt lokale Builds (Client & Server)
- Generiert einen zufälligen JWT-Secret
- Erstellt Produktions-.env-Datei
- Installiert notwendige System-Komponenten (Node.js, Docker, PM2)
- Startet PostgreSQL-Container mit Docker
- Deployed die Anwendung mit PM2
- Führt Status-Checks durch

**Hinweis:** Verwende dieses Script nur für die Erstinstallation!

### 1.1. `quick-deploy.sh` - Schnelles Deployment (Empfohlen)

Für bereits konfigurierte Server - ohne System-Updates:

```bash
./quick-deploy.sh
```

**Was macht das Script:**
- Prüft SSH-Verbindung zum Produktivserver
- Erstellt lokale Builds (Client & Server)
- Generiert einen zufälligen JWT-Secret
- Erstellt Backup der aktuellen Version
- Deployed die Anwendung ohne System-Updates
- Startet Services und prüft Status

**Vorteile:**
- Keine unnötigen System-Updates (VirtualBox, etc.)
- Schnelleres Deployment
- Weniger Fehlerquellen
- Automatisches Backup

### 2. `update.sh` - Schnelle Updates

Für schnelle Updates ohne vollständige Neuinstallation:

```bash
./update.sh
```

**Was macht das Script:**
- Erstellt lokale Builds
- Stoppt die Anwendung
- Erstellt Backup der aktuellen Version
- Überträgt neue Dateien
- Startet die Anwendung neu

### 3. `rollback.sh` - Rollback zu vorheriger Version

Für Rollback zu einer vorherigen Version:

```bash
./rollback.sh [BACKUP_SUFFIX]
```

**Beispiel:**
```bash
./rollback.sh 20250717_143022
```

**Was macht das Script:**
- Zeigt verfügbare Backups an
- Führt Rollback zu gewählter Version durch
- Startet die Anwendung neu
- Optional: Bereinigt alte Backups

### 4. `monitor.sh` - Monitoring und Status

Überwacht den Status der Anwendung:

```bash
./monitor.sh [COMMAND]
```

**Verfügbare Kommandos:**
- `status` - Vollständiger Status-Check (Standard)
- `health` - Nur Anwendungs-Health-Check
- `logs` - Aktuelle Logs anzeigen
- `monitor` - Kontinuierliches Monitoring
- `restart` - Services neustarten
- `disk` - Festplattenspeicher prüfen
- `help` - Hilfe anzeigen

**Beispiele:**
```bash
./monitor.sh status      # Vollständiger Status
./monitor.sh health      # Nur Health-Check
./monitor.sh monitor     # Kontinuierliches Monitoring
./monitor.sh restart     # Services neustarten
```

## Workflow

### Erstes Deployment (Erstinstallation)

1. **Vollständiges Deployment durchführen:**
   ```bash
   ./deploy.sh
   ```

2. **Status prüfen:**
   ```bash
   ./monitor.sh status
   ```

### Reguläre Deployments (Empfohlen)

1. **Schnelles Deployment durchführen:**
   ```bash
   ./quick-deploy.sh
   ```

2. **Status prüfen:**
   ```bash
   ./monitor.sh health
   ```

### Updates (Alternative)

1. **Update durchführen:**
   ```bash
   ./update.sh
   ```

2. **Status prüfen:**
   ```bash
   ./monitor.sh health
   ```

### Rollback bei Problemen

1. **Verfügbare Backups anzeigen:**
   ```bash
   ./rollback.sh
   ```

2. **Rollback durchführen:**
   ```bash
   ./rollback.sh [BACKUP_SUFFIX]
   ```

## Konfiguration

### Umgebungsvariablen (Produktion)

Die Produktions-.env wird automatisch erstellt mit:

```env
NODE_ENV=production
PORT=2110
DB_HOST=localhost
DB_PORT=5117
DB_NAME=willi_mako
DB_USER=willi_user
DB_PASSWORD=willi_password
JWT_SECRET=[ZUFÄLLIG_GENERIERT]
JWT_EXPIRES_IN=24h
QDRANT_URL=http://10.0.0.2:6333
QDRANT_API_KEY=str0mda0
QDRANT_COLLECTION=willi
GEMINI_API_KEY=AIzaSyAUV_utRoqQgumx1iGa9fdM5qGxDMbfm_k
```

### PostgreSQL Container

- **Container Name**: `willi_mako_postgres`
- **Port**: `5117`
- **Datenbank**: `willi_mako`
- **Benutzer**: `willi_user`
- **Passwort**: `willi_password`

### PM2 Konfiguration

- **App Name**: `willi_mako`
- **Deployment-Pfad**: `/opt/willi_mako`
- **Logs**: `/opt/willi_mako/logs/`
- **Restart Policy**: `always`
- **Max Memory**: `1GB`

## Fehlerbehebung

### Anwendung läuft nicht

```bash
./monitor.sh status
./monitor.sh restart
```

### Datenbank-Probleme

```bash
ssh root@10.0.0.2 "docker logs willi_mako_postgres"
ssh root@10.0.0.2 "docker restart willi_mako_postgres"
```

### Festplatte voll

```bash
./monitor.sh disk
ssh root@10.0.0.2 "docker system prune -f"
```

### Logs einsehen

```bash
./monitor.sh logs
ssh root@10.0.0.2 "pm2 logs willi_mako"
```

## Nützliche Befehle

### Server-Zugriff
```bash
ssh root@10.0.0.2
```

### PM2 Verwaltung
```bash
ssh root@10.0.0.2 "pm2 list"
ssh root@10.0.0.2 "pm2 restart willi_mako"
ssh root@10.0.0.2 "pm2 stop willi_mako"
ssh root@10.0.0.2 "pm2 logs willi_mako"
```

### Docker Verwaltung
```bash
ssh root@10.0.0.2 "docker ps"
ssh root@10.0.0.2 "docker logs willi_mako_postgres"
ssh root@10.0.0.2 "docker restart willi_mako_postgres"
```

### Anwendung testen
```bash
curl http://10.0.0.2:2110/health
```

## Sicherheit

- SSH-Schlüssel für Authentifizierung verwenden
- Firewall-Regeln für Port 2110 konfigurieren
- Regelmäßige Backups der Datenbank
- Monitoring der Ressourcennutzung
- Regelmäßige Updates der Abhängigkeiten

## Support

Bei Problemen:
1. Status mit `./monitor.sh status` prüfen
2. Logs mit `./monitor.sh logs` einsehen
3. Bei kritischen Problemen Rollback durchführen
4. Kontinuierliches Monitoring mit `./monitor.sh monitor`
