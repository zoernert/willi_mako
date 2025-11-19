# 404 Page Analytics - Plausible Tracking

**Datum:** 19. November 2025  
**Feature:** Custom Event Tracking für 404-Fehlerseiten  
**Zweck:** Nutzerfreundlichkeit durch Analyse von 404-Fehlern verbessern

## Überblick

Die custom 404-Seite (`src/pages/404.tsx`) tracked automatisch alle 404-Fehler und Nutzerinteraktionen mit Plausible Analytics. Dies ermöglicht:

- **Fehleranalyse**: Welche URLs führen zu 404-Fehlern?
- **Nutzerverhalten**: Wie reagieren User auf 404-Seiten?
- **Optimierung**: Häufige 404s durch Redirects oder bessere Navigation beheben

## Tracked Events

### 1. `404_error` Event
**Wird automatisch gefeuert beim Laden der 404-Seite**

```typescript
trackEvent('404_error', {
  path: '/chat/bf3fbf79-676c-4988-aee5-62ed0d05d020',
  referrer: 'https://stromhaltig.de/wissen/thema/mscons',
  timestamp: '2025-11-19T10:30:45.123Z'
});
```

**Properties:**
- `path`: Der angeforderte Pfad, der nicht existiert
- `referrer`: Von welcher Seite der User kam (leer bei Direct/Bookmark)
- `timestamp`: ISO-8601 Zeitstempel des Fehlers

**Use Cases:**
- Identifiziere die häufigsten 404-Pfade → Redirects einrichten
- Analysiere Referrer → Wo sind defekte Links?
- Zeitanalyse → Wann treten 404-Fehler vermehrt auf?

### 2. `404_navigation` Event
**Wird gefeuert beim Klick auf Navigation-Buttons**

```typescript
trackEvent('404_navigation', {
  destination: 'home',  // oder 'login'
  path: '/chat/invalid-id'
});
```

**Properties:**
- `destination`: `'home'` (Startseite) oder `'login'` (App-Login)
- `path`: Der ursprüngliche 404-Pfad

**Use Cases:**
- Conversion-Rate: Wie viele User navigieren weiter vs. verlassen die Seite?
- Button-Performance: Wird "Startseite" oder "Login" häufiger geklickt?
- User Intent: Chat-URLs führen zu 404 → User klickt "Login" (Token abgelaufen)

## Plausible Dashboard Setup

### Goals anlegen (falls noch nicht vorhanden)

1. Gehe zu https://stats.corrently.cloud/stromhaltig.de
2. Settings → Goals → "+ Add Goal"
3. Goal Type: **Custom Event**
4. Event Name: `404_error`
5. Wiederholen für: `404_navigation`

> **Hinweis:** Events erscheinen automatisch in Plausible, sobald sie zum ersten Mal gefeuert werden. Manuelle Goal-Konfiguration ist optional, aber empfohlen für bessere Übersicht.

### Dashboard-Ansichten

#### 1. 404-Error-Übersicht
**Filter:** Custom Events → `404_error`  
**Gruppierung:** Nach `path` Property  
**Sortierung:** Nach Häufigkeit

**Beispiel-Insights:**
```
/chat/* → 45 Fehler (Token abgelaufen)
/old-page → 23 Fehler (alte URL)
/wissen/nicht-existierender-artikel → 12 Fehler
```

#### 2. Referrer-Analyse
**Filter:** Custom Events → `404_error`  
**Gruppierung:** Nach `referrer` Property

**Beispiel-Insights:**
```
(direct) → 30 Fehler (Bookmarks/alte Links)
stromhaltig.de/wissen/thema/mscons → 15 Fehler (defekter interner Link)
google.com → 8 Fehler (veraltete Suchergebnisse)
```

#### 3. Navigation-Performance
**Filter:** Custom Events → `404_navigation`  
**Gruppierung:** Nach `destination` Property

**Beispiel-Insights:**
```
login → 35 Klicks (70%)
home → 15 Klicks (30%)
```

## Analyse-Workflows

### Workflow 1: Häufige 404-Fehler beheben

1. **Identifiziere Top 404s:**
   ```
   Plausible → Custom Events → 404_error → Gruppiere nach path
   ```

2. **Analysiere Ursache:**
   - Alte URLs? → Redirect einrichten
   - Abgelaufene Chat-Links? → Besser kommunizieren
   - Tippfehler in Links? → Interne Links korrigieren

3. **Implementiere Fix:**
   ```javascript
   // next.config.js
   redirects: [
     {
       source: '/old-page',
       destination: '/new-page',
       permanent: true
     }
   ]
   ```

4. **Monitoring:**
   - Nach 1 Woche: Hat sich die Fehlerrate reduziert?

### Workflow 2: User Journey optimieren

1. **Analysiere Referrer:**
   ```
   Welche Seiten verlinken auf nicht-existierende URLs?
   ```

2. **Conversion Rate:**
   ```
   404_error Events: 100
   404_navigation Events: 70
   → Conversion Rate: 70% (gut!)
   → Bounce Rate: 30% (User verlassen ohne Interaktion)
   ```

3. **Button-Präferenz:**
   ```
   Login-Button: 70%
   Startseite-Button: 30%
   → Insight: Viele User haben Token-Probleme (Chat-Links abgelaufen)
   ```

### Workflow 3: Token-Ablauf-Problem identifizieren

**Hypothese:** User öffnen gespeicherte Chat-Links, Token ist abgelaufen → 404

**Validierung:**
```
1. Filtere 404_error nach path='/chat/*'
2. Prüfe referrer='(direct)' → Bookmarks/gespeicherte Links
3. Prüfe 404_navigation destination='login' → User versteht Problem
```

**Action:**
- Bessere Kommunikation: "Ihr Link ist abgelaufen, bitte neu einloggen"
- Token-Lebensdauer erhöhen?
- Automatische Redirect zu /app/ bei abgelaufenen Chat-Links

## Beispiel-Queries

### SQL-ähnliche Analyse (via Plausible Export)

```sql
-- Top 10 404-Pfade
SELECT path, COUNT(*) as errors
FROM plausible_events
WHERE event = '404_error'
  AND date >= '2025-11-19'
GROUP BY path
ORDER BY errors DESC
LIMIT 10;

-- Conversion Rate nach 404
SELECT 
  (COUNT(CASE WHEN event = '404_navigation' THEN 1 END) * 100.0 / 
   COUNT(CASE WHEN event = '404_error' THEN 1 END)) as conversion_rate
FROM plausible_events
WHERE date >= '2025-11-19';

-- Button-Präferenz
SELECT destination, COUNT(*) as clicks
FROM plausible_events
WHERE event = '404_navigation'
GROUP BY destination;
```

> **Hinweis:** Plausible hat kein SQL-Interface. Diese Queries dienen als Konzept. Nutze Plausible UI oder CSV-Export für ähnliche Analysen.

## Integration in Content-Strategie

### KPIs für 404-Optimierung

| Metrik | Baseline (Woche 1) | Ziel (Monat 1) | Messung |
|--------|-------------------|----------------|---------|
| 404-Fehlerrate | TBD | < 1% aller Pageviews | `404_error / total_pageviews` |
| Conversion nach 404 | TBD | > 60% | `404_navigation / 404_error` |
| Chat-404-Rate | TBD | < 10 pro Woche | `404_error where path='/chat/*'` |
| Bounce nach 404 | TBD | < 40% | `(404_error - 404_navigation) / 404_error` |

### Wöchentliches Monitoring

**Montags, 5 Minuten:**
1. Plausible öffnen → Custom Events
2. `404_error`: Anzahl der Fehler (letzte 7 Tage)
3. Neue Pfade? → Notieren für Fix
4. `404_navigation`: Conversion Rate berechnen
5. Auffälligkeiten dokumentieren

**Monatliches Review:**
1. Export aller `404_error` Events (CSV)
2. Analyse in Spreadsheet/SQL
3. Top 10 Fehler identifizieren
4. Redirects/Fixes implementieren
5. Dokumentation aktualisieren

## Testing

### Lokales Testing (Development)

```bash
# Terminal 1: Start Dev Server
npm run dev:next-only

# Terminal 2: Test 404 Page
curl http://localhost:3003/not-existing-page
```

**Browser Console:**
```javascript
// Nach Laden der 404-Seite:
// Sollte erscheinen (Development-Mode):
[Plausible Debug] 404_error {
  path: '/not-existing-page',
  referrer: 'http://localhost:3003/',
  timestamp: '2025-11-19T10:30:45.123Z'
}

// Nach Klick auf "Zur Startseite":
[Plausible Debug] 404_navigation {
  destination: 'home',
  path: '/not-existing-page'
}
```

### Produktions-Testing

```bash
# Test 404 Page
curl -I https://stromhaltig.de/test-404-page
# Expected: HTTP/1.1 404 Not Found

# Test Chat mit abgelaufenem Token
curl -I https://stromhaltig.de/chat/invalid-id
# Expected: HTTP/1.1 404 Not Found
```

**Plausible Realtime Check:**
1. Öffne https://stats.corrently.cloud/stromhaltig.de
2. Gehe zu "Realtime" View
3. Öffne https://stromhaltig.de/test-404-analytics
4. Event sollte sofort in Realtime erscheinen

## Technische Details

### Code-Location
- **404 Page:** `src/pages/404.tsx`
- **Analytics Library:** `src/lib/analytics.ts`
- **Plausible Script:** `src/pages/_document.tsx`

### Dependencies
- `next/router` (useRouter Hook)
- `@/lib/analytics` (trackEvent Function)
- Plausible Analytics (https://stats.corrently.cloud/js/script.js)

### Event-Struktur

```typescript
// src/pages/404.tsx
import { useRouter } from 'next/router';
import { trackEvent } from '../lib/analytics';

useEffect(() => {
  trackEvent('404_error', {
    path: router.asPath,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
  });
}, [router.asPath]);
```

### Plausible Integration

```html
<!-- src/pages/_document.tsx -->
<script
  defer
  data-domain="stromhaltig.de"
  src="https://stats.corrently.cloud/js/script.js"
/>
```

## Troubleshooting

### Problem: Events erscheinen nicht in Plausible

**Ursachen:**
1. Ad-Blocker blockiert Plausible Script
2. CSP-Header blockiert externe Scripts
3. Plausible Domain falsch konfiguriert

**Lösung:**
```bash
# Check Plausible Script lädt
curl -I https://stats.corrently.cloud/js/script.js
# Expected: HTTP/2 200

# Check Browser Console
# Sollte keine Errors zeigen

# Check Network Tab
# Request zu https://stats.corrently.cloud/api/event sollte erfolgen
```

### Problem: Events feuern mehrfach

**Ursache:** React StrictMode in Development führt zu doppeltem useEffect

**Lösung:**
```typescript
// Already implemented in 404.tsx
useEffect(() => {
  trackEvent('404_error', { ... });
}, [router.asPath]); // Only fires when path changes
```

### Problem: Properties fehlen in Plausible

**Ursache:** Properties werden nicht in Event-Object übergeben

**Lösung:**
```typescript
// Correct:
trackEvent('404_error', {
  path: router.asPath,
  referrer: document.referrer
});

// Wrong:
trackEvent('404_error'); // Properties missing!
```

## Deployment

### Quick Deployment (nur 404 + Docs)
```bash
./deploy-404-analytics.sh
```

### Full Deployment
```bash
./quick-deploy.sh
```

### Verify Deployment
```bash
# SSH to production
ssh root@10.0.0.2

# Check 404 page exists
ls -la /opt/willi_mako/.next/server/pages/404.html

# Check service running
pm2 status willi-mako

# Test 404 page
curl -I https://stromhaltig.de/test-404-check
```

## Related Documentation

- **Custom Error Pages:** `CUSTOM-ERROR-PAGES.md`
- **Analytics Library:** `src/lib/analytics.ts`
- **Content Strategy:** `docs/strategy/implementation-plan.md`
- **Plausible Goals:** `docs/strategy/baseline-metrics-2025-11-07.md`

## Changelog

### 2025-11-19
- ✅ Initial implementation of 404 analytics tracking
- ✅ Added `404_error` event with path, referrer, timestamp
- ✅ Added `404_navigation` event for button clicks
- ✅ Documentation created
- ✅ Deployment script created

### Geplante Erweiterungen
- [ ] A/B-Test: Verschiedene CTA-Texte testen
- [ ] Exit-Intent Tracking: User verlässt Seite ohne Klick
- [ ] Heatmap: Wo klicken User auf der 404-Seite?
- [ ] Scroll-Tracking: Lesen User den Hilfetext?

---

**Kontakt:** Siehe `docs/` für weitere Dokumentation  
**Plausible Dashboard:** https://stats.corrently.cloud/stromhaltig.de
