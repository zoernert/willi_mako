# CR-WMAKO-001 Production Configuration

## Environment Variables für Production

# E-Mail Configuration
EMAIL_ENCRYPTION_SECRET=your_production_secret_key_here
EMAIL_DEFAULT_FROM=noreply@your-domain.com

# IMAP Configuration
IMAP_CHECK_INTERVAL=300000  # 5 Minuten in Millisekunden
IMAP_MAX_RETRIES=3
IMAP_TIMEOUT=30000  # 30 Sekunden

# LLM Configuration
LLM_CACHE_TTL=86400  # 24 Stunden
LLM_MAX_CACHE_SIZE=1000
LLM_BATCH_SIZE=10

# Auto-Klärfall Configuration
AUTO_CLARIFICATION_MIN_CONFIDENCE=0.8
AUTO_CLARIFICATION_ENABLED=true

# Performance Configuration
BULK_OPERATION_MAX_SIZE=100
API_RATE_LIMIT_WINDOW=900000  # 15 Minuten
API_RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
MONITORING_ENABLED=true
LOG_LEVEL=info

## Deployment Steps

1. **Database Migration:**
   ```bash
   psql $DATABASE_URL -f migration-cr-wmako-001.sql
   ```

2. **Install Dependencies:**
   ```bash
   npm install imap mailparser @google/generative-ai
   ```

3. **Environment Setup:**
   - Kopieren Sie diese Variablen in Ihre Production .env
   - Setzen Sie sichere Werte für alle Secrets

4. **Server Deployment:**
   ```bash
   npm run build
   npm run start:production
   ```

5. **IMAP-Service aktivieren:**
   ```bash
   curl -X POST https://your-domain.com/api/imap/start
   ```

## Security Considerations

1. **E-Mail-Passwort-Verschlüsselung:** Verwenden Sie starke Verschlüsselungsschlüssel
2. **API-Rate-Limiting:** Implementiert für alle Endpunkte
3. **Input-Validation:** Alle Eingaben werden validiert
4. **Authentication:** Bearer Token erforderlich für kritische Endpunkte

## Monitoring & Alerts

1. **IMAP-Service-Status:** `/api/imap/health`
2. **Service-Health:** `/api/cr-wmako-001/health`  
3. **Error-Logs:** Automatisch in Server-Logs
4. **Performance-Metriken:** Integration mit bestehenden Monitoring-Tools

## Backup & Recovery

1. **Database-Backup:** Regelmäßige Sicherungen der neuen Tabellen
2. **E-Mail-Archive:** Optional: E-Mails in separater Datenbank archivieren
3. **Configuration-Backup:** Team-E-Mail-Konfigurationen sichern
