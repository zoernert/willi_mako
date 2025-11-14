# Sofortmaßnahmen nach Phase 2.6 Review

**Datum:** 14. November 2025  
**Zeitaufwand:** 30-45 Minuten  
**Ziel:** Google Indexierung beschleunigen

---

## ✅ Checkliste (in dieser Reihenfolge abarbeiten)

### 1. Google Search Console URL-Prüfung (15 Min)

**A) Neue Artikel prüfen:**

1. Gehe zu: https://search.google.com/search-console
2. Wähle Property: `stromhaltig.de`
3. Klicke auf "URL-Prüfung" (oben)

**Artikel 1: EOG Energierichtungsangabe**
```
https://stromhaltig.de/wissen/artikel/eog-energierichtungsangabe
```
- [ ] URL eingeben → "Prüfen"
- [ ] Status notieren:
  - ✅ "URL ist bei Google" → Gut! Abwarten.
  - ⏳ "URL wird gecrawlt" → Warte 2-3 Tage
  - ❌ "URL ist nicht bei Google" → **"Indexierung beantragen" klicken!**

**Artikel 2: APERAK Z20**
```
https://stromhaltig.de/wissen/artikel/aperak-z20-fehler
```
- [ ] Gleiche Schritte wie bei EOG

**B) Aktualisierte Artikel stichprobenartig prüfen:**

```
https://stromhaltig.de/wissen/artikel/utilmd-stammdaten
https://stromhaltig.de/wissen/artikel/gpke-geschaeftsprozesse
https://stromhaltig.de/ (Homepage)
```

Für jeden:
- [ ] Status prüfen
- [ ] Wenn "Zuletzt gecrawlt" < 7. November → **Re-Crawl beantragen**

---

### 2. Sitemap-Check (5 Min)

**A) Sitemap im Browser öffnen:**
```
https://stromhaltig.de/sitemap.xml
```

**Prüfen:**
- [ ] Ist `/wissen/artikel/eog-energierichtungsangabe` enthalten?
- [ ] Ist `/wissen/artikel/aperak-z20-fehler` enthalten?
- [ ] Alle 10 optimierten Seiten vorhanden?

**Falls NEIN:**
→ Sitemap muss regeneriert werden! (siehe unten)

**B) Sitemap bei GSC einreichen:**
1. GSC → "Sitemaps" (linkes Menü)
2. "Neue Sitemap hinzufügen": `sitemap.xml`
3. Klick "Senden"
4. Status prüfen:
   - ✅ "Erfolgreich" → Gut!
   - ❌ "Fehler" → Screenshot machen, debuggen

---

### 3. Live SERP-Check (10 Min)

**Ziel:** Sehen, ob Google die neuen Meta-Descriptions anzeigt

**A) Google Suche (Inkognito-Modus!):**

Öffne Chrome/Firefox **Inkognito-Fenster**

**Test 1: EOG Keyword**
```
Suche: eog energiewirtschaft
```
- [ ] Erscheint `stromhaltig.de` in den Ergebnissen?
- [ ] Welche Description wird angezeigt?
  - ✅ NEU: "EOG Energierichtungsangabe erklärt! ✅ Definition..." → **Perfekt!**
  - ❌ ALT/Generic → **Google hat Update noch nicht!**
- [ ] Screenshot machen (für Dokumentation)

**Test 2: Sperrprozess Strom**
```
Suche: sperrprozess strom
```
- [ ] Position prüfen (sollte #1-2 sein)
- [ ] Description: "Sperrprozess Strom 2025: Schritt-für-Schritt..." sichtbar?
- [ ] Screenshot

**Test 3: REMADV**
```
Suche: remadv energiewirtschaft
```
- [ ] Position prüfen
- [ ] Description: "REMADV Zahlungsavis verstehen..." sichtbar?
- [ ] Screenshot

**Ergebnis dokumentieren:**
```
EOG: [Neue Description JA/NEIN]
Sperrprozess: [Neue Description JA/NEIN]
REMADV: [Neue Description JA/NEIN]
```

---

### 4. Site:-Suche für neue Artikel (5 Min)

**Prüfen ob Artikel überhaupt im Google-Index sind:**

**Test 1:**
```
site:stromhaltig.de/wissen/artikel/eog-energierichtungsangabe
```
- ✅ Ergebnis gefunden → Artikel ist indexed
- ❌ "Keine Ergebnisse" → **Artikel ist NICHT indexed!** → GSC "Indexierung beantragen"

**Test 2:**
```
site:stromhaltig.de/wissen/artikel/aperak-z20-fehler
```
- Gleicher Check

---

### 5. Bing Webmaster Tools Setup (Optional, 15 Min)

**Warum:** Bing bringt schon 39 Visitors - kann ausgebaut werden!

**Setup:**
1. Gehe zu: https://www.bing.com/webmasters
2. "Get started" → Login mit Microsoft-Account
3. "Add a site" → `https://stromhaltig.de`
4. Verifizierung:
   - Option 1: XML-Datei hochladen (schnell)
   - Option 2: Meta-Tag in Homepage (dauerhafter)
5. Nach Verifizierung:
   - Sitemap einreichen: `https://stromhaltig.de/sitemap.xml`
   - URL Submit für neue Artikel:
     ```
     https://stromhaltig.de/wissen/artikel/eog-energierichtungsangabe
     https://stromhaltig.de/wissen/artikel/aperak-z20-fehler
     ```

**Vorteil:** Bing indexiert oft **schneller als Google** (1-3 Tage)!

---

## 📸 Dokumentation

**Screenshots machen für:**
1. GSC URL-Prüfung Status (EOG + APERAK Z20)
2. Google SERP für "eog energiewirtschaft" (Inkognito)
3. Google SERP für "sperrprozess strom"
4. Sitemap-Ansicht im Browser

**Speichern in:**
```
/docs/strategy/screenshots-phase-2-6/
```

---

## 🚨 Falls Sitemap neu generiert werden muss

**Wenn neue Artikel NICHT in sitemap.xml sind:**

### Option A: Automatische Regenerierung (Next.js)

```bash
cd /config/Development/willi_mako
npm run build:next
```
→ Next.js generiert automatisch neue Sitemap bei jedem Build

### Option B: Manuelle Prüfung

**Sitemap-Generator finden:**
```bash
grep -r "sitemap" src/pages/
```

**Typische Dateien:**
- `/src/pages/sitemap.xml.tsx` (dynamisch)
- `/public/sitemap.xml` (statisch)

**Falls dynamisch:**
- Code prüfen: Werden neue Artikel aus `/content/articles/` geladen?
- Falls NEIN: Code anpassen

---

## ✅ Ergebnis-Dokumentation

**Nach allen Checks, trage hier ein:**

### GSC URL-Prüfung:
- EOG Artikel: [indexed / nicht indexed / wird gecrawlt]
- APERAK Z20: [indexed / nicht indexed / wird gecrawlt]
- Indexierung beantragt: [JA / NEIN]

### Sitemap:
- Neue Artikel enthalten: [JA / NEIN]
- Bei GSC eingereicht: [JA / NEIN]

### Live SERP:
- EOG neue Description sichtbar: [JA / NEIN]
- Sperrprozess neue Description: [JA / NEIN]
- REMADV neue Description: [JA / NEIN]

### Site:-Suche:
- EOG Artikel im Index: [JA / NEIN]
- APERAK Z20 im Index: [JA / NEIN]

### Bing Webmaster:
- Account eingerichtet: [JA / NEIN]
- Sitemap eingereicht: [JA / NEIN]

---

## 📅 Timeline nach Sofortmaßnahmen

**Heute (14. Nov):**
- Alle Checks durchgeführt
- Indexierung beantragt (falls nötig)

**15.-20. November:**
- **Nichts tun!** Google arbeiten lassen.
- Höchstens: Bounce Rate Analyse (separate Aufgabe)

**21. November:**
- **Phase 2.7 Final Review**
- Neue Metrics exportieren
- Vergleich: Haben die Sofortmaßnahmen gewirkt?

---

## 🎯 Erwartete Ergebnisse (21. November)

**Falls Indexierung heute beantragt:**
- GSC Klicks: 10-30 (statt 2)
- EOG Artikel: 5-10 Visitors (Plausible)
- Neue Descriptions in 80% der SERPs sichtbar

**Falls schon alles indexed war:**
- GSC Klicks: 30-50
- EOG Artikel: 10-20 Visitors
- CTR: 2-4%

---

**Status:** 🚀 Sofortmaßnahmen bereit  
**Aufwand:** 30-45 Minuten  
**Nächster Check:** 21. November 2025

---

✅ **Los geht's! Diese Checks beschleunigen die Google-Indexierung um 3-5 Tage.**
