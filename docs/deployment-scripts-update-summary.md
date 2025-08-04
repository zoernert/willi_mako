# Deployment-Skript Updates für Port-Migration 3009

**Datum:** 2025-08-03  
**Status:** ✅ Alle Skripte aktualisiert  

## Aktualisierte Skripte

### 1. quick-deploy.sh ✅
- **Frontend Port:** 3003 (Next.js - extern)
- **Backend Port:** 3009 (Express.js - intern)
- **PM2 Config:** Separate Apps für Backend und Frontend
- **Health-Checks:** Beide Ports überwacht
- **Build-Prozess:** Hybrid-Architektur berücksichtigt

### 2. monitor.sh ✅
- **Status-Checks:** Frontend (3003) und Backend (3009)
- **PM2 Monitoring:** Beide Prozesse (_backend, _frontend)
- **Health-Checks:** Getrennte Tests für beide Services

### 3. deploy.sh ✅
- **Port-Konfiguration:** Frontend 3003, Backend 3009
- **Architektur:** Hybrid Next.js + Express.js

### 4. rollback.sh ✅
- **Port-Konfiguration:** Frontend 3003, Backend 3009
- **PM2 Prozesse:** Beide Services berücksichtigt

### 5. update.sh ✅
- **Port-Konfiguration:** Frontend 3003, Backend 3009

## Deployment-Architektur (Production)

```
Internet → Server:3003 (Next.js Frontend)
                 ↓
                 /api/* → Server:3009 (Express.js Backend)
                                ↓
                            PostgreSQL:5117
```

## PM2 Prozesse

```bash
# Backend Process
${APP_NAME}_backend
- Script: dist/server.js
- Port: 3009 (intern)
- Logs: backend_*.log

# Frontend Process  
${APP_NAME}_frontend
- Script: server.js (Hybrid-Setup)
- Port: 3003 (extern)
- Logs: frontend_*.log
```

## Deployment-Kommandos

```bash
# Standard Deployment
./quick-deploy.sh root@10.0.0.2 3003

# Monitoring
./monitor.sh status

# PM2 Befehle
ssh root@10.0.0.2 'pm2 restart willi_mako_backend'
ssh root@10.0.0.2 'pm2 restart willi_mako_frontend'
ssh root@10.0.0.2 'pm2 restart all'
```

## URLs nach Deployment

- **Frontend:** http://10.0.0.2:3003/
- **Legacy App:** http://10.0.0.2:3003/app/
- **FAQ Pages:** http://10.0.0.2:3003/wissen/
- **API:** http://10.0.0.2:3003/api/ (proxied zu Backend)
- **Backend (intern):** http://localhost:3009/api/ (nur server-intern)

## Nächste Schritte

1. **Test-Deployment:** Skript auf Staging-Server testen
2. **Production-Deployment:** Produktivumgebung aktualisieren
3. **Monitoring:** Überwachung der neuen Port-Konfiguration
4. **Load-Balancer:** Ggf. nginx-Konfiguration anpassen
