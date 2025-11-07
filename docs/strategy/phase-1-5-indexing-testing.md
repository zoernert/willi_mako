# Phase 1.5: Indexierung & Testing

**Datum:** 7. November 2025  
**Status:** 🟢 In Progress  
**Ziel:** Sicherstellen, dass alle Phase 1 Verbesserungen von Suchmaschinen indexiert werden und korrekt funktionieren.

---

## ✅ 1. robots.txt Optimierung

### Was wurde gemacht:
- `/articles/` Path explizit für alle Crawler erlaubt
- AI-Crawler (ChatGPT, Claude, Google-Extended, etc.) haben Zugriff auf `/articles/`
- Sitemap-Referenzen bleiben bestehen

### Änderungen:
```diff
User-agent: *
Allow: /
Allow: /wissen/
+ Allow: /articles/
Allow: /whitepaper/
```

**Dateien geändert:** `/public/robots.txt`

### Verifikation:
```bash
# Testen Sie robots.txt lokal
curl https://stromhaltig.de/robots.txt | grep articles

# Google Robots Testing Tool (wenn verfügbar)
# https://www.google.com/webmasters/tools/robots-testing-tool
```

**Status:** ✅ Abgeschlossen (7. Nov 2025)

---

## 📊 2. Google Search Console (GSC)

### 2.1 Sitemap einreichen

**Aktuelle Sitemap URL:** `https://stromhaltig.de/sitemap.xml`

**Schritte:**
1. Gehen Sie zu [Google Search Console](https://search.google.com/search-console)
2. Property auswählen: `stromhaltig.de`
3. Linke Sidebar → **Sitemaps**
4. Neue Sitemap hinzufügen: `sitemap.xml`
5. **Absenden** klicken

**Erwartete Ergebnisse:**
- Status: "Erfolgreich" (grüner Haken)
- Entdeckte URLs: ~50-80 (je nach Anzahl der Artikel)
- Indexierte URLs: Nach 7-14 Tagen sollten 80%+ indexiert sein

**Wichtig:** Nach Sitemap-Einreichung kann es 24-48 Stunden dauern, bis Google die URLs crawlt.

### 2.2 URL-Inspection für neue Artikel

Testen Sie die 5 neuen Artikel manuell:

| Artikel | URL | Aktion |
|---------|-----|--------|
| REMADV | `https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas` | URL-Inspection → Live-Test → Indexierung beantragen |
| Sperrprozess | `https://stromhaltig.de/articles/sperr-und-entsperrprozess-strom` | URL-Inspection → Live-Test → Indexierung beantragen |
| UTILMD | `https://stromhaltig.de/articles/utilmd-stammdaten-strom-gas` | URL-Inspection → Live-Test → Indexierung beantragen |
| APERAK Z17 | `https://stromhaltig.de/articles/aperak-z17-ablehnungsgrund-strom` | URL-Inspection → Live-Test → Indexierung beantragen |
| Lieferantenwechsel | `https://stromhaltig.de/articles/lieferantenwechsel-prozess-strom` | URL-Inspection → Live-Test → Indexierung beantragen |

**Schritte pro URL:**
1. GSC → **URL-Inspection** (oben)
2. URL eingeben
3. **Live-Test** durchführen
4. Prüfen: "URL ist auf Google" oder Fehler?
5. Falls nicht indexiert → **Indexierung beantragen**

### 2.3 Core Web Vitals & Mobile Usability prüfen

**Schritte:**
1. GSC → **Core Web Vitals**
   - Prüfen: Gibt es "Schlechte URLs"?
   - Ziel: Alle URLs "Gut" (grün)

2. GSC → **Mobile Usability**
   - Prüfen: Gibt es Fehler?
   - Ziel: 0 Fehler

**Status:** ⏳ Ausstehend (Manual Task)

---

## 🔍 3. Bing Webmaster Tools

### 3.1 Site verifizieren

**URL:** [https://www.bing.com/webmasters](https://www.bing.com/webmasters)

**Schritte:**
1. Login mit Microsoft-Konto
2. **Site hinzufügen:** `stromhaltig.de`
3. Verifikationsmethode wählen:
   - **Option A (empfohlen):** DNS TXT-Record
   - **Option B:** Meta-Tag in `<head>`
   - **Option C:** XML-Datei hochladen

**Empfohlene Methode (DNS):**
```
Typ: TXT
Host: @
Wert: [Von Bing generierter Code, z.B. "msvalidate.01=ABC123..."]
TTL: 3600
```

### 3.2 Sitemap einreichen

**Nach Verifikation:**
1. Bing Webmaster Tools Dashboard
2. **Sitemaps** → **Sitemap einreichen**
3. URL: `https://stromhaltig.de/sitemap.xml`
4. **Absenden**

**Zusätzliche Sitemaps (optional):**
- `https://stromhaltig.de/feed.xml`
- `https://stromhaltig.de/atom.xml`

### 3.3 URL-Inspection analog zu Google

Bing hat ein ähnliches Tool: **URL-Prüfung**
- Nutzen Sie es für die 5 neuen Artikel
- "URL an Bing senden" für schnellere Indexierung

**Status:** ⏳ Ausstehend (Manual Task)

---

## 📈 4. Plausible Analytics: Goals Testing

### Aktuelle Goals (aus baseline-metrics-2025-11-07.md):

| Goal Name | Event | Status |
|-----------|-------|--------|
| Visit /whitepaper/* | Pageview | ✅ Tracking (7 conversions/7d) |
| Visit /app/register | Pageview | ✅ Tracking (3 conversions/7d) |
| Visit /training | Pageview | ✅ Tracking (2 conversions/7d) |
| Outbound Link: Click | Custom Event | ⏳ Zu testen |
| File Download | Custom Event | ⏳ Zu testen |

### Testing-Checklist:

#### 4.1 Whitepaper Goal
**Test:**
1. Navigieren Sie zu einer Artikel-Seite mit CTA
2. Klicken Sie auf "Whitepaper herunterladen"
3. Prüfen Sie Plausible Dashboard → **Goal Conversions**

**Erwartung:** "Visit /whitepaper/*" wird getrackt

#### 4.2 App-Register Goal
**Test:**
1. Navigieren Sie zu `/app/register` (direkt oder via CTA)
2. Prüfen Sie Plausible Dashboard

**Erwartung:** "Visit /app/register" erscheint

#### 4.3 Training Goal
**Test:**
1. Klicken Sie auf "Training buchen" CTA
2. Prüfen Sie `/training` Pageview

**Erwartung:** "Visit /training" wird gezählt

#### 4.4 Outbound Links (Custom Event)
**Falls implementiert:**
```javascript
plausible('Outbound Link: Click', {
  props: { url: 'https://example.com' }
});
```

**Test:** Klicken Sie auf externe Links (z.B. zu BDEW, BNetzA)

#### 4.5 File Downloads (Custom Event)
**Falls implementiert:**
```javascript
plausible('File Download', {
  props: { file: 'remadv-whitepaper.pdf' }
});
```

**Test:** Download eines PDF/CSV Files

### Plausible Dashboard URL:
`https://plausible.io/stromhaltig.de`

**Status:** ⏳ Zu testen (7.-14. Nov 2025)

---

## 🔗 5. Link-Validierung

### 5.1 Interne Links prüfen

**Tools:**
- [W3C Link Checker](https://validator.w3.org/checklink)
- `broken-link-checker` (npm)

**Befehl (lokal):**
```bash
npx broken-link-checker https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas -ro
```

**Zu prüfen:**
- Alle 5 neuen Artikel
- Interne Links zu `/wissen/thema/*`
- CTA-Links zu `/whitepaper/*`, `/app/register`, `/training`

### 5.2 Canonical URLs prüfen

**Test:**
1. Öffnen Sie eine Artikel-Seite
2. View Source (Rechtsklick → Seitenquelltext anzeigen)
3. Suchen Sie nach `<link rel="canonical"`

**Erwartung:**
```html
<link rel="canonical" href="https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas" />
```

**Status:** ⏳ Ausstehend

---

## 🧪 6. Schema.org Validierung

### Tool: Google Rich Results Test

**URL:** [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)

**Schritte:**
1. URL eingeben: `https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas`
2. **URL testen** klicken
3. Warten (10-30 Sekunden)

**Erwartete Schema.org Types:**
- ✅ `Article` (mit headline, datePublished, author, publisher)
- ✅ `BreadcrumbList` (Startseite → Wissen → Artikel → REMADV)
- ❌ Keine Fehler oder Warnungen

**Alternativ:** [Schema.org Validator](https://validator.schema.org/)

**Status:** ⏳ Zu testen für alle 5 Artikel

---

## 📱 7. Mobile Testing

### 7.1 Google Mobile-Friendly Test

**URL:** [https://search.google.com/test/mobile-friendly](https://search.google.com/test/mobile-friendly)

**Test für:**
- Artikel-Seiten (`/articles/*`)
- Themen-Seiten (`/wissen/thema/*`)
- Homepage

**Erwartung:** "Page is mobile-friendly" ✅

### 7.2 PageSpeed Insights

**URL:** [https://pagespeed.web.dev/](https://pagespeed.web.dev/)

**Prüfen für Desktop & Mobile:**
- Performance Score (Ziel: >80)
- Accessibility Score (Ziel: >90)
- Best Practices (Ziel: >90)
- SEO Score (Ziel: 100)

**Test URL:** `https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas`

**Status:** ⏳ Ausstehend

---

## ✅ 8. Meta-Description Quick Win (aus Baseline Metrics)

### Problem:
- **"eog" Keyword:** Position 1, aber **0 Klicks** (26 Impressionen verschwendet!)
- **Weitere Keywords:** "aperak strom", "marktpartner energie" - gute Positionen, keine Klicks

### Aktion: Meta-Descriptions optimieren

**Aktuelle Meta-Descriptions prüfen:**
```bash
curl -s https://stromhaltig.de/articles/remadv-zahlungsavis-strom-gas | grep -i "meta name=\"description"
```

**Für jede Seite:**
1. Keyword recherchieren (aus GSC)
2. Actionable Meta-Description schreiben:
   - Max. 155 Zeichen
   - Keyword enthalten
   - Call-to-Action ("Jetzt lernen", "Kostenlos testen", etc.)
   - Emotional Hook ("Vermeiden Sie teure Fehler...")

**Beispiel (aktuell):**
```html
<meta name="description" content="REMADV Nachricht im Energiemarkt: Zahlungsavis zwischen Marktpartnern. Erfahren Sie alles über Aufbau, Praxisbeispiele und BDEW-Vorgaben." />
```

**Optimiert (CTR-fokussiert):**
```html
<meta name="description" content="REMADV Zahlungsavis in 5 Minuten verstehen! ✅ BDEW-konform ✅ Praxisbeispiele ✅ Kostenlose Checkliste. Jetzt Fehler vermeiden!" />
```

**Status:** ⏳ Zu implementieren (Quick Win - 2 Stunden!)

---

## 📊 9. Tracking der Phase 1.5 Erfolge

### Messbare Ziele (in 14 Tagen):

| Metrik | Baseline (31.10.-6.11.) | Ziel (14.11.-20.11.) | Status |
|--------|------------------------|---------------------|--------|
| **CTR (Google)** | 2.77% | 6-8% (+100%) | ⏳ |
| **Indexierte Artikel** | 0 (neue) | 5 (100%) | ⏳ |
| **Google Impressionen** | 2,058 | 3,000+ (+50%) | ⏳ |
| **Organische Klicks** | 57 | 100+ (+75%) | ⏳ |
| **Bounce Rate** | 66% | 60% (-6pp) | ⏳ |
| **Whitepaper Downloads** | 7/Woche | 10-12/Woche (+50%) | ⏳ |

### Weekly Check-in (jeden Donnerstag):
1. Plausible Analytics prüfen
2. GSC: Impressionen & Klicks vergleichen
3. Position-Tracking für Top Keywords ("sperrprozess", "remadv", "aperak")

---

## 🚀 10. Deployment Checklist

### Pre-Deployment:
- [x] robots.txt aktualisiert (`/articles/` erlaubt)
- [x] ArticleSEO-Komponente implementiert
- [x] Sitemap.xml optimiert
- [x] URL-Rewrites konfiguriert (`/articles → /wissen/artikel`)
- [x] Type-Check erfolgreich

### Post-Deployment (Manual):
- [ ] GSC: Sitemap einreichen
- [ ] GSC: URL-Inspection für 5 Artikel
- [ ] Bing Webmaster: Site verifizieren
- [ ] Bing Webmaster: Sitemap einreichen
- [ ] Plausible Goals testen (Whitepaper, App, Training)
- [ ] Schema.org validieren (Rich Results Test)
- [ ] Mobile-Friendly Test durchführen
- [ ] PageSpeed Insights prüfen
- [ ] Meta-Descriptions optimieren (Quick Win!)

### Deployment-Befehl:
```bash
./quick-deploy.sh
```

**Erwartete Downtime:** Keine (Zero-Downtime-Deployment via PM2)

---

## 📝 Nächste Schritte (Post-Phase 1.5)

### Phase 2: Content-Skalierung (ab 14. Nov 2025)
- 10 weitere Artikel (MSCONS, ORDERS, PRICAT, etc.)
- Gated Content (3 Whitepapers zu Top-Keywords)
- Interne Verlinkung optimieren (Related Articles)

### Phase 3: Conversion-Optimierung (ab 1. Dez 2025)
- A/B-Tests für CTAs
- Lead-Magneten erweitern
- Email-Marketing aufsetzen

---

## 🆘 Troubleshooting

### Problem: Artikel werden nicht indexiert (nach 14 Tagen)

**Diagnose:**
1. GSC → Coverage → "Ausgeschlossen"
2. Prüfen: `noindex` Meta-Tag? (sollte nicht sein)
3. robots.txt nochmal prüfen

**Lösung:**
- URL-Inspection → "Indexierung beantragen"
- Externe Links zu den Artikeln setzen (Social Media, Foren)

### Problem: Schema.org Fehler

**Diagnose:**
- Rich Results Test zeigt "Fehler" oder "Warnungen"

**Häufige Fehler:**
- Fehlende `publisher.logo` (sollte vorhanden sein)
- `datePublished` im falschen Format (muss ISO 8601 sein)

**Lösung:**
- `ArticleSEO.tsx` anpassen
- Nochmal validieren

### Problem: Plausible Goals tracken nicht

**Diagnose:**
- Browser-DevTools → Network Tab
- Prüfen: Wird `/api/event` an Plausible gesendet?

**Lösung:**
- Script-Tag prüfen: `<script defer data-domain="stromhaltig.de" src="https://plausible.io/js/script.js"></script>`
- AdBlocker deaktivieren (zum Testen)

---

## ✅ Completion Criteria (Phase 1.5)

Phase 1.5 ist **abgeschlossen**, wenn:

1. ✅ robots.txt erlaubt `/articles/` (DONE)
2. ✅ GSC Sitemap eingereicht (Manual)
3. ✅ Bing Webmaster Sitemap eingereicht (Manual)
4. ✅ 5 neue Artikel in GSC "URL-Inspection" getestet (Manual)
5. ✅ Schema.org validiert (keine Fehler) (Manual)
6. ✅ Plausible Goals funktionieren (3 getestet) (Manual)
7. ✅ Mobile-Friendly Test bestanden (Manual)
8. ✅ Meta-Descriptions optimiert für Top 5 Keywords (To Do)

**Geschätzte Dauer:** 2-4 Stunden (Manual Tasks)

---

**Autor:** GitHub Copilot + Willi-Mako  
**Letzte Aktualisierung:** 7. November 2025  
**Version:** 1.0
