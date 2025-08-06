# File Watcher Limit Problem - Lösungsansätze

## Problem
Der Fehler "System limit for number of file watchers reached" tritt auf, wenn zu viele Dateien gleichzeitig überwacht werden (nodemon, Next.js, etc.).

## Lösung 1: Entwicklung ohne File Watching (Empfohlen für VM/Container)

### Verwendung des angepassten start-dev.sh
```bash
npm run dev
```
- Backend startet ohne Auto-Restart
- Next.js läuft normal weiter
- Bei Backend-Änderungen: Strg+C und `npm run dev` erneut ausführen

### Alternative mit reduziertem File Watching
```bash
npm run dev:limited
```
- Backend ohne File Watching
- Next.js mit Polling (alle 3 Sekunden)
- Reduziert die Anzahl der File Watchers erheblich

### Einzelne Services starten
```bash
# Nur Backend (ohne File Watching)
npm run dev:backend-no-watch

# Nur Next.js Frontend
npm run dev:next-only
```

## Lösung 2: System File Watcher Limit erhöhen (Systemweite Änderung)

### Temporäre Erhöhung (bis zum nächsten Neustart)
```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

### Permanente Erhöhung
```bash
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Überprüfung des aktuellen Limits
```bash
cat /proc/sys/fs/inotify/max_user_watches
```

### Überprüfung der aktuellen Nutzung
```bash
# Aktuelle Anzahl File Watchers pro Benutzer
lsof | awk '/inotify/ {print $2}' | sort | uniq -c | sort -nr

# Oder detaillierter:
find /proc/*/fd -user "$USER" -lname anon_inode:inotify -printf '%hinfo/%f\n' 2>/dev/null | xargs cat | grep -c '^inotify'
```

## Lösung 3: Selektive File Watching Konfiguration

### Next.js Konfiguration (next.config.js)
```javascript
module.exports = {
  experimental: {
    // Reduziert File Watching
    optimizeCss: false,
  },
  // Für sehr große Projekte
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }
}
```

### Nodemon Konfiguration (nodemon.json)
```json
{
  "watch": ["src"],
  "ext": "ts,js",
  "ignore": [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "node_modules/**",
    "dist/**",
    ".next/**",
    "app-legacy/**"
  ],
  "delay": 2000
}
```

## Empfohlener Workflow für Entwicklung

### Für normale Entwicklung
1. Verwende `npm run dev:limited` 
2. Bei Backend-Änderungen: Strg+C und erneut starten
3. Frontend-Änderungen werden automatisch erkannt (mit Polling)

### Für intensive Backend-Entwicklung
1. Terminal 1: `npm run dev:backend-no-watch`
2. Terminal 2: `npm run dev:next-only`  
3. Backend manuell neustarten bei Änderungen

### Für Production-ähnliche Tests
1. `npm run build`
2. `npm start`

## Überwachung der Ressourcennutzung

### File Watcher Nutzung überwachen
```bash
watch -n 2 'echo "Current file watchers: $(find /proc/*/fd -user "$USER" -lname anon_inode:inotify 2>/dev/null | wc -l)"'
```

### Memory und CPU Überwachung
```bash
htop
# oder
ps aux | grep -E "(node|tsx|next)"
```

## Troubleshooting

### Problem: "ENOSPC: System limit for number of file watchers reached"
- Lösung: Verwende `npm run dev:limited` oder erhöhe das System-Limit

### Problem: Backend startet nicht nach Änderungen
- Lösung: Manueller Restart mit Strg+C und `npm run dev` erneut

### Problem: Hohe CPU-Last
- Lösung: Verwende `npm run dev:limited` für reduziertes Polling

### Problem: Speicher-Verbrauch zu hoch
- Lösung: Einzelne Services in separaten Terminals starten
