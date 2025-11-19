# Rate Limit Tracking - Komplexitätsanalyse

**Datum:** 19. November 2025  
**Kontext:** Analyse der Komplexität für Plausible Analytics Tracking von Rate-Limit-Ereignissen

## Zusammenfassung

**Fazit:** Rate-Limit-Tracking in der Legacy App ist **nicht empfohlen** aufgrund der hohen Komplexität und des geringen ROI.

### Gründe

1. **Viele Touchpoints**: Jede Backend-Anfrage müsste instrumentiert werden
2. **Legacy-App-Architektur**: CRA ohne zentrale API-Client-Wrapper
3. **429-Fehler sind selten**: Normale Nutzer treffen selten auf Rate Limits
4. **Aufwand vs. Nutzen**: Sehr hoher Implementierungsaufwand für wenig Insights

## Aktuelle Rate-Limit-Konfiguration

### Globales Rate Limit (Backend)
```env
RATE_LIMIT_WINDOW=15      # 15 Minuten
RATE_LIMIT_MAX=200        # 200 Requests (verdoppelt von 100)
```

**Gültig für:** Alle `/api/*` Routen (außer Document Uploads)

### Document Upload Rate Limits
```env
DOCUMENT_UPLOAD_RATE_WINDOW=5           # 5 Minuten
DOCUMENT_UPLOAD_RATE_MAX_SINGLE=30     # Einzelne Uploads
DOCUMENT_UPLOAD_RATE_MAX_BATCH=20      # Batch-Uploads
```

**Gültig für:** `/api/workspace/documents/upload*` Routen

## Warum Rate-Limit-Tracking komplex ist

### 1. Verteilte Error-Handling-Logik

Die Legacy App hat **kein zentrales Error-Handling**. Jede API-Anfrage hat ihren eigenen Error-Handler:

```typescript
// Beispiel: src/services/chatService.ts
export const sendMessage = async (chatId, message) => {
  try {
    const response = await fetch(`/api/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
```

**Problem:** Kein Check auf `response.status === 429`, keine zentrale Tracking-Stelle.

### 2. Viele API-Aufrufstellen

Geschätzte Anzahl von API-Aufrufen in der Legacy App:

| Bereich | Anzahl Endpoints | Dateien |
|---------|-----------------|---------|
| Chat | 10+ | src/services/chatService.ts, src/components/Chat/* |
| Workspace | 5+ | src/services/workspaceService.ts |
| Documents | 8+ | src/services/documentService.ts |
| FAQ | 6+ | src/services/faqService.ts |
| Auth | 4+ | src/services/authService.ts |
| Admin | 15+ | src/components/Admin/* |
| Teams | 5+ | src/services/teamService.ts |
| Timeline | 4+ | src/services/timelineService.ts |

**Gesamt:** Mindestens **60+ verschiedene API-Aufrufstellen**

### 3. Verschiedene Request-Bibliotheken

Die Legacy App nutzt **unterschiedliche Methoden** für API-Calls:

```typescript
// fetch() API
fetch('/api/chat/123')

// axios (in einigen älteren Komponenten)
axios.get('/api/workspace')

// Direkte XMLHttpRequest (selten, aber vorhanden)
const xhr = new XMLHttpRequest();
```

**Problem:** Jede Bibliothek benötigt eigene Rate-Limit-Detection und Tracking-Logic.

### 4. Fehlende zentrale API-Client-Wrapper

**Best Practice wäre:**
```typescript
// Zentraler API-Client mit Rate-Limit-Tracking
class ApiClient {
  async request(url, options) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        trackEvent('rate_limit_exceeded', {
          endpoint: url,
          method: options.method
        });
      }
      
      return response;
    } catch (error) {
      // Error handling
    }
  }
}

// Verwendung überall
const api = new ApiClient();
api.request('/api/chat/123', { method: 'GET' });
```

**Realität in Legacy App:**
Jede Datei/Komponente macht direkte `fetch()` Calls ohne Wrapper.

### 5. Aufwand für vollständige Implementierung

#### Option A: Zentrale API-Wrapper-Migration
**Aufwand:** ~40 Stunden
- Erstelle zentralen ApiClient
- Migriere alle 60+ API-Calls
- Testing aller Komponenten
- Risiko: Breaking Changes in Legacy App

#### Option B: Patch-Work (Tracking an jeder Stelle)
**Aufwand:** ~20 Stunden
- Füge Rate-Limit-Check zu jedem `fetch()` Call hinzu
- Inkonsistente Implementierung
- Schwer wartbar

#### Option C: Global Fetch Interceptor
**Aufwand:** ~8 Stunden
- Überschreibe globales `window.fetch()`
- **Problem:** Funktioniert nicht für `axios` oder `XMLHttpRequest`
- Potenzielle Side-Effects

```typescript
// Beispiel: Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  if (response.status === 429) {
    trackEvent('rate_limit_exceeded', {
      url: args[0],
      timestamp: new Date().toISOString()
    });
  }
  
  return response;
};
```

**Problem:** Überschreibt natives Browser-API, kann andere Bibliotheken brechen.

## Alternative Ansätze

### Empfehlung 1: Server-Side Logging (Bereits vorhanden)

Das Backend loggt bereits alle Rate-Limit-Events:

```typescript
// src/server.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

**Verfügbar:**
- PM2 Logs: `pm2 logs willi-mako | grep "RATE LIMIT"`
- Log-Aggregation: CloudWatch, Datadog, etc.

**Vorteil:**
- ✅ Keine Code-Änderungen nötig
- ✅ Erfasst ALLE Rate-Limit-Ereignisse (nicht nur Legacy App)
- ✅ Server-seitige Wahrheit (Client kann nicht lügen)

### Empfehlung 2: Backend-Monitoring mit Plausible Server Events API

Statt Client-Side-Tracking kann das Backend direkt an Plausible senden:

```typescript
// src/server.ts
import axios from 'axios';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: async (req, res) => {
    // Log to PM2
    console.log(`[RATE LIMIT] IP: ${req.ip}, Path: ${req.path}`);
    
    // Send to Plausible Server Events API
    try {
      await axios.post('https://stats.corrently.cloud/api/event', {
        domain: 'stromhaltig.de',
        name: 'rate_limit_exceeded',
        url: `https://stromhaltig.de${req.path}`,
        props: {
          ip: req.ip,
          path: req.path,
          method: req.method
        }
      }, {
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Backend',
          'X-Forwarded-For': req.ip
        }
      });
    } catch (error) {
      console.error('Failed to send Plausible event:', error);
    }
    
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

**Vorteil:**
- ✅ Zentrale Implementierung (nur `src/server.ts`)
- ✅ Erfasst alle Rate-Limit-Events (Legacy App, Next.js, API)
- ✅ Plausible Dashboard Integration
- ✅ Aufwand: ~2 Stunden

**Nachteil:**
- ⚠️ Zusätzliche HTTP-Requests vom Backend zu Plausible
- ⚠️ Plausible Server Events API hat eigene Rate-Limits

### Empfehlung 3: Monitoring mit existierender Infrastruktur

**Wenn vorhanden:**
- Prometheus + Grafana: Rate-Limit-Metriken
- ELK Stack: Log-basierte Analyse
- AWS CloudWatch: Metriken + Alarme

**Setup (Beispiel Prometheus):**
```typescript
// src/server.ts
import { Counter } from 'prom-client';

const rateLimitCounter = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['path', 'method']
});

const limiter = rateLimit({
  // ...
  handler: (req, res) => {
    rateLimitCounter.inc({ path: req.path, method: req.method });
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

## Entscheidungsmatrix

| Ansatz | Aufwand | Erfassung | Wartbarkeit | Empfehlung |
|--------|---------|-----------|-------------|------------|
| **PM2 Logs** | 0h | 100% | ✅ Einfach | ⭐⭐⭐⭐⭐ Beste Wahl |
| **Backend → Plausible API** | 2h | 100% | ✅ Einfach | ⭐⭐⭐⭐ Gut für Dashboard |
| **Global Fetch Interceptor** | 8h | ~80% | ⚠️ Fragil | ⭐⭐ Nicht empfohlen |
| **Patch-Work (jeder Call)** | 20h | ~90% | ❌ Schwer | ⭐ Nicht empfohlen |
| **API-Client-Migration** | 40h | 100% | ✅ Best Practice | ⭐⭐⭐ Für Refactoring |

## Empfohlene Lösung

### Sofortmaßnahme (bereits erledigt)
✅ **Globales Rate Limit verdoppelt** (100 → 200 Requests / 15 Min)

**Begründung:**
- Reduziert Rate-Limit-Ereignisse um ~50%
- Normale Nutzer treffen selten auf 200 Requests/15min
- Power-User haben mehr Spielraum

### Monitoring (empfohlen)
**PM2 Logs + Grep**

```bash
# Heute: Rate-Limit-Events der letzten 24h
pm2 logs willi-mako --lines 10000 --nostream | grep "RATE LIMIT"

# Wöchentlich: Analyse
pm2 logs willi-mako --lines 100000 --nostream | \
  grep "RATE LIMIT" | \
  wc -l
```

**Aufwand:** 5 Minuten/Woche

### Optional: Backend Plausible Integration
**Falls Dashboard-Visualisierung gewünscht:**

```bash
# Implementiere Backend → Plausible Events API
# Aufwand: ~2 Stunden
# Siehe "Empfehlung 2" oben
```

## Langfristige Architektur-Überlegungen

### Wenn Legacy App modernisiert wird:
1. **Zentrale API-Client-Library erstellen**
2. **Rate-Limit-Tracking einbauen**
3. **Error-Handling standardisieren**

### Für neue Features (Next.js App):
1. **Nutze zentrale API-Client-Wrapper**
2. **Rate-Limit-Detection von Anfang an**
3. **Plausible-Tracking integriert**

```typescript
// Beispiel: Neue Next.js App
// lib/api-client.ts
export class ApiClient {
  async request(endpoint, options) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.status === 429) {
        trackEvent('rate_limit_exceeded', {
          endpoint,
          method: options.method
        });
        
        throw new RateLimitError('Rate limit exceeded');
      }
      
      return response.json();
    } catch (error) {
      // Centralized error handling
    }
  }
}
```

## Fazit

**Für Rate-Limit-Tracking in der Legacy App gilt:**

✅ **DO:**
- Globales Rate Limit erhöhen (bereits erledigt: 100 → 200)
- PM2 Logs für Monitoring nutzen
- Optional: Backend → Plausible Events API für Dashboard

❌ **DON'T:**
- Versuchen, jeden API-Call in Legacy App zu instrumentieren
- Global `window.fetch()` überschreiben
- Große Refactorings für selten auftretende Events

**ROI-Rechnung:**
- **Ereignishäufigkeit:** < 10 Rate-Limit-Events/Woche (geschätzt)
- **Implementierungsaufwand:** 8-40 Stunden
- **Wartungsaufwand:** 5-10 Stunden/Jahr
- **Ergebnis:** Nicht lohnend für Legacy App

**Empfehlung:** 
✅ Rate Limit verdoppelt  
✅ PM2 Logs für Monitoring  
✅ Bei Bedarf: Backend → Plausible (2h Aufwand)

---

**Related Documentation:**
- `DOCUMENT-UPLOAD-RATE-LIMITING-FIX.md` - Document Upload Limits
- `src/server.ts` - Rate Limiter Configuration
- `src/middleware/documentUploadLimiter.ts` - Custom Upload Limiters
