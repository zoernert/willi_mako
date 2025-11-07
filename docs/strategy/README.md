# Content-Strategie Umsetzung - Quick Start Guide

## 🎯 Überblick

Dieser Guide zeigt dir, wie du mit der Umsetzung der Content-Strategie beginnst. Der vollständige Plan liegt in `implementation-plan.md`.

## 📊 Aktuelle Situation

**Baseline (vor Optimierung):**
- ~200 Unique Visitors/Woche
- 70-100% Bounce Rate
- 0% Conversion Rate
- 3 Whitepaper-Downloads, 2 kostenlose Tests

**Ziel (60 Tage):**
- 400+ Unique Visitors/Woche (+100%)
- 50-60% Bounce Rate (-20pp)
- 2% Conversion Rate (8 Trials/Woche)
- 50+ Email-Leads

## ✅ Verfügbare Assets

### Bereits implementiert:
✅ Whitepaper-Lead-Generation (`/src/pages/whitepaper/[slug].tsx`)  
✅ Email-Service (`/src/services/emailService.ts`)  
✅ Training-Platform (`https://training.stromhaltig.de/`)  
✅ Plausible Analytics (domain: stromhaltig.de)  
✅ Willi-Mako MCP Service (für technische Inhalte)  
✅ AI-Integration (Gemini/Mistral für Visuals)

### Neu erstellt:
✅ Analytics-Library (`/lib/analytics.ts`)  
✅ Implementierungsplan (`/docs/strategy/implementation-plan.md`)  
✅ Todo-Liste (im System aktiv)

## 🚀 Erste Schritte (heute)

### 1. Plausible Goals einrichten (2h)

Gehe zu https://stats.corrently.cloud/ → Settings → Goals

**Anzulegende Goals:**

```
Event-based Goals:
- cta_article_top
- cta_article_middle
- cta_article_bottom
- cta_app_register
- cta_training_link
- whitepaper_download
- lead_magnet_download
- app_trial_started
- contact_form_submitted
- training_clicked
- article_read_complete
- internal_link_clicked
- tool_used
- exit_intent_shown
- exit_intent_converted

Page Goals (URL-based):
- /app/register
- /whitepaper/*
- /training
```

### 2. Analytics Library testen

Erstelle eine Test-Komponente:

```tsx
// test-analytics.tsx
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

export default function TestAnalytics() {
  return (
    <button onClick={() => {
      trackEvent(AnalyticsEvents.CTA_APP_REGISTER, {
        article: 'test',
        position: 'top'
      });
    }}>
      Test Tracking
    </button>
  );
}
```

Öffne die Seite, klicke Button, prüfe in Plausible ob Event ankommt.

### 3. Baseline Metrics erfassen

Screenshot von Plausible Dashboard (letzte 7 Tage):
- Traffic
- Top Pages
- Bounce Rate

Speichere unter `/docs/strategy/baseline-metrics-[DATUM].png`

## 📅 Wochenplan

### Woche 1: Foundation (Phase 1)
**Montag-Dienstag:** App-Seite optimieren (8h)
- Hero-Section mit Value Proposition
- Screenshots/Video
- Social Proof
- CTAs mit Tracking

**Mittwoch-Donnerstag:** Top 5 Artikel mit CTAs (12h)
- REMADV, Sperrprozess, UTILMD, GPKE, APERAK Z17
- 3 CTAs pro Artikel
- Training-Links integrieren

**Freitag:** Title-Tags optimieren (2h)
- 5 Artikel mit niedrigster CTR
- Neue Titles nach Schema
- Meta-Descriptions

**Samstag:** Review & Tracking-Check
- Alle Events feuern?
- Erste Metriken?

### Woche 2: Lead-Generation (Phase 2)
**Montag-Mittwoch:** GPKE-Fristen-Checkliste (12h)
- Content mit Willi-Mako MCP
- PDF erstellen (mit Diagrammen)
- Landing Page bauen
- API-Endpoint

**Donnerstag-Freitag:** Email-Nurturing (8h)
- 5 Email-Templates
- Cron-Job Setup
- DB-Tabelle
- Test-Serie

### Woche 3: Content-Whitespots (Phase 3)
**Montag-Mittwoch:** "Marktkommunikation lernen"-Guide (16h)
**Donnerstag-Freitag:** APERAK-Serie (2 Artikel) (8h)

### Woche 4: Tools & Optimization (Phase 4+5)
**Nach Priorität & verfügbarer Zeit**

## 🛠️ Technische Checkliste

### Dateien zu erstellen:
- [ ] `/components/ArticleCTA.tsx`
- [ ] `/components/RelatedArticles.tsx`
- [ ] `/src/pages/checkliste/gpke-fristen.tsx`
- [ ] `/src/pages/api/send-lead-magnet.ts`
- [ ] `/src/email-templates/nurturing/*.html`

### Dependencies zu installieren:
```bash
npm install node-cron  # für Email-Scheduling
npm install mailparser  # falls noch nicht vorhanden
```

### Datenbank-Migrationen:
```sql
-- Email Nurturing Queue
CREATE TABLE email_nurturing_queue (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  sequence_step INT NOT NULL,
  magnet_type VARCHAR(100),
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead Magnet Downloads
CREATE TABLE lead_magnet_downloads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  magnet_type VARCHAR(100) NOT NULL,
  downloaded_at TIMESTAMP DEFAULT NOW(),
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100)
);
```

## 📈 Tracking verwenden

### In Komponenten:

```tsx
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { useRouter } from 'next/router';

// CTA-Button
<Button onClick={() => {
  trackEvent(AnalyticsEvents.CTA_ARTICLE_TOP, {
    article: 'remadv-artikel',
    position: 'top'
  });
  router.push('/app/register?utm_source=artikel&utm_campaign=remadv');
}}>
  Jetzt kostenlos testen
</Button>

// Training-Link
<Button onClick={() => {
  trackEvent(AnalyticsEvents.TRAINING_CLICKED, {
    article: 'gpke-artikel',
    course: 'marktkommunikation-kompakt'
  });
  window.open('https://training.stromhaltig.de/kurse/marktkommunikation-kompakt', '_blank');
}}>
  Training buchen
</Button>

// Interner Link
<Link 
  href="/wissen/artikel/utilmd" 
  onClick={() => {
    trackEvent(AnalyticsEvents.INTERNAL_LINK_CLICKED, {
      from: 'remadv-artikel',
      to: 'utilmd-artikel'
    });
  }}
>
  UTILMD erklärt →
</Link>

// Scroll-Tracking (in useEffect)
useEffect(() => {
  const cleanup = setupScrollTracking('remadv-artikel', 80);
  return cleanup;
}, []);
```

## 🤖 Willi-Mako MCP nutzen

### Content generieren:

```typescript
import { mcp_mcp_willi_mak_willi_mako_chat } from '@/mcp-tools';

// GPKE-Checkliste Content
const checklistContent = await mcp_mcp_willi_mak_willi_mako_chat({
  message: `Erstelle eine umfassende GPKE-Fristen-Checkliste für 2025. 
  Enthalte: 
  - Alle wichtigen Prozesse (Lieferantenwechsel, EoG, Sperrung)
  - Fristen mit Kalendertag-Angaben
  - Verantwortlichkeiten (NB, MSB, LF)
  - Häufige Fehlerquellen
  - Praxis-Tipps
  
  Format: Strukturiert für PDF-Export, 8-12 Seiten`,
  sessionId: 'gpke-checklist-generation'
});

// Artikel-Content
const articleContent = await mcp_mcp_willi_mak_willi_mako_chat({
  message: `Schreibe einen anfängerfreundlichen Artikel über APERAK Z17 Fehler.
  Zielgruppe: Junior-Mitarbeiter in der Marktkommunikation.
  Enthalte: Was ist Z17, Ursachen, Schritt-für-Schritt-Lösung, Prävention.
  Länge: 800-1200 Wörter`,
  sessionId: 'aperak-z17-article'
});
```

## 📊 Success Tracking

### Wöchentliches Review:

Erstelle jede Woche ein Dokument `/docs/strategy/weekly-reports/KW-[XX].md`:

```markdown
# Wöchentlicher Report KW [XX]

## Metriken
- Unique Visitors: [XXX] (+/-X% vs. Vorwoche)
- Pageviews: [XXX]
- Bounce Rate: [XX]%
- Conversions:
  - Whitepaper: [XX]
  - Trials: [XX]
  - Email-Leads: [XX]

## Completed Tasks
- [x] App-Seite optimiert
- [x] REMADV-Artikel mit CTAs
- [ ] ...

## Insights
- Artikel X performt besonders gut (+XX% Traffic)
- CTA-Position "middle" funktioniert am besten
- Training-Links werden gut geklickt

## Nächste Woche
- [ ] Lead-Magnet 1 fertigstellen
- [ ] Email-Serie aufsetzen
- [ ] ...
```

## 🚨 Troubleshooting

### Plausible Events kommen nicht an?
1. Check Browser Console: Werden Events geloggt? (Dev-Mode)
2. Check Plausible Script ist geladen: `window.plausible` definiert?
3. Ad-Blocker deaktiviert?
4. Goal in Plausible Dashboard angelegt?

### Email-Versand funktioniert nicht?
1. SMTP-Einstellungen prüfen: `/admin` → SMTP-Test
2. Email-Service-Logs checken
3. Firewall/Port-Freigabe prüfen

### Willi-Mako MCP antwortet nicht?
1. Session-ID korrekt?
2. Rate-Limits erreicht?
3. Fallback auf manuelle Content-Erstellung

## 📚 Weitere Ressourcen

- **Vollständiger Plan:** `/docs/strategy/implementation-plan.md`
- **Templates:** `/docs/strategy/templates_copy_paste.md`
- **Training-Platform:** https://training.stromhaltig.de/
- **Plausible Dashboard:** https://stats.corrently.cloud/
- **Whitepaper-Doku:** `/docs/whitepaper-content-authoring.md`

## ✅ Completion Checklist - Woche 1

- [ ] Plausible Goals angelegt (15+)
- [ ] Analytics Library getestet
- [ ] Baseline Metrics erfasst
- [ ] App-Seite optimiert (8h)
- [ ] CTA-Komponente erstellt
- [ ] Top 5 Artikel mit CTAs (12h)
- [ ] Title-Tags optimiert (2h)
- [ ] Erstes Wochenreview geschrieben
- [ ] Tracking funktioniert (alle Events feuern)

**Geschätzte Zeit Woche 1:** ~25h  
**Erwartetes Ergebnis:** Erste Conversion-Rate >0%, Bounce Rate -5pp

---

**Fragen?** Siehe `implementation-plan.md` oder erstelle ein Issue.

**Status-Update:** Dieser Guide wird wöchentlich aktualisiert basierend auf Fortschritt.

*Erstellt: 6. November 2025*
