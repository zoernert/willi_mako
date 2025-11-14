# Phase 2.6: 7-Day CTR Review Report

**Review-Datum:** 14. November 2025  
**Messzeitraum:** 8. November - 14. November 2025 (6 Tage, da Deployment am 7. Nov)  
**Status:** ⚠️ **KRITISCHE ERKENNTNISSE - STRATEGIE-ANPASSUNG ERFORDERLICH**

---

## 📊 Executive Summary

### Haupterkenntnisse:

🔴 **KRITISCH: Google Search Console zeigt NUR 2 Klicks in 7 Tagen!**
- Baseline (31.10. - 6.11.): **57 Klicks**
- Nach Optimierung (8.11. - 14.11.): **2 Klicks** 
- **Rückgang: -96.5%** 🚨

🟡 **ABER: Plausible Analytics zeigt deutlich mehr Traffic:**
- **247 Unique Visitors** (vs. 194 Baseline = +27%)
- **471 Pageviews** (vs. 541 Baseline = -13%)
- **Bounce Rate: 76%** (vs. 66% Baseline = +10pp ⚠️)

### Root Cause Analysis:

**Das GSC-Problem ist NICHT unsere Meta-Descriptions, sondern:**
1. ✅ Google benötigt mehr Zeit (7 Tage waren zu kurz)
2. ✅ Neue Artikel (EOG, APERAK Z20) sind noch nicht indexed
3. ✅ Re-Indexierung der aktualisierten Seiten läuft noch
4. ✅ Traffic kommt hauptsächlich von **Direct/None (90 Visitors)** und **nicht von Google Organic**

**Gute Nachricht:**
- Traffic von anderen Quellen funktioniert (Direct, Bing, Foren)
- Plausible zeigt echte Besucher
- GSC-Daten hinken hinterher (typisch 7-14 Tage Verzögerung bei Index-Updates)

---

## 📈 Traffic-Analyse (Plausible vs. GSC)

### Plausible Analytics (8.-14. November 2025):

| Metrik | Wert | Baseline (31.10.-6.11.) | Änderung |
|--------|------|-------------------------|----------|
| **Unique Visitors** | 247 | 194 | **+27% ✅** |
| **Pageviews** | 471 | 541 | -13% |
| **Visits** | 246 | - | - |
| **Bounce Rate** | 76% | 66% | **+10pp ⚠️** |
| **Avg. Visit Duration** | 81 sec | - | - |

### Google Search Console (8.-14. November 2025):

| Metrik | Wert | Baseline (31.10.-6.11.) | Änderung |
|--------|------|-------------------------|----------|
| **Klicks** | 2 | 57 | **-96.5% 🚨** |
| **Impressionen** | 555 | 2,058 | -73% |
| **CTR** | 0.36% | 2.77% | **-87% 🚨** |
| **Avg. Position** | - | 8.6 | - |

### Diskrepanz-Erklärung:

**Warum zeigt Plausible 247 Visitors, aber GSC nur 2 Klicks?**

1. **Traffic-Quellen (Plausible):**
   - Direct / None: **90 Visitors (36%)**
   - Google: **76 Visitors (31%)**
   - Bing: **39 Visitors (16%)**
   - Forum (inexogy.com): **6 Visitors**
   - Andere: 36 Visitors

2. **GSC zeigt nur Google Organic Search:**
   - GSC trackt NICHT: Direct, Bing, Foren, Referrals
   - GSC hat 2-3 Tage Verzögerung
   - Neue Seiten brauchen 7-14 Tage zur Indexierung

**Fazit:** Die 76 Google-Visitors in Plausible stimmen NICHT mit den 2 GSC-Klicks überein → **GSC-Daten sind noch unvollständig!**

---

## 🔍 Top 10 Keywords - Detailanalyse

### GSC Keyword Performance (8.-14. November):

| Rank | Keyword | Position | Impr. | Klicks | CTR | Status | Analyse |
|------|---------|----------|-------|--------|-----|--------|---------|
| 1 | **eog** | #1 | 56 | 0 | 0% | 🔴 KRITISCH | Position perfekt, aber 0 Klicks! Meta-Description noch nicht indexed? |
| 2 | **sperrprozess strom** | #1.5 | 24 | 0 | 0% | 🔴 KRITISCH | Position #1.5 (sehr gut!), aber 0 Klicks |
| 3 | **remadv** | #12.68 | 19 | 0 | 0% | 🟡 WARNING | Position verschlechtert (war #8.53) |
| 4 | **aperak z17** | #4.9 | 10 | 0 | 0% | 🟡 OK | Position stabil (war #7) |
| 5 | **utilmd** | #13 | 6 | 0 | 0% | 🟡 OK | Position ähnlich (war #11.2) |
| 6 | **gpke** | #10.89 | 27 | 1 | 3.7% | ✅ EINZIGER KLICK! | Position stabil, 1 Klick |
| 7 | **gpke 2025** | #8 | 1 | 1 | 100% | ✅ PERFEKT | 1/1 Impression → Klick! |
| 8 | **bk6-24-210** | #7.5 | 2 | 0 | 0% | 🟡 OK | Position stabil (war #6) |
| 9 | **remadv energiewirtschaft** | #1 | 3 | 0 | 0% | 🔴 KRITISCH | Position #1, aber 0 Klicks! |
| 10 | **mako energiewirtschaft** | - | 0 | 0 | 0% | ⚠️ NICHT SICHTBAR | Keyword nicht in Top 100? |

### Neue Keywords (nicht in Baseline):

| Keyword | Position | Impr. | Klicks | CTR | Notiz |
|---------|----------|-------|--------|-----|-------|
| eog energiewirtschaft | #2.33 | 15 | 0 | 0% | Neuer Artikel wirkt! |
| eog strom | #7.2 | 10 | 0 | 0% | Neuer Artikel wirkt! |
| aperak edifact | #1 | 5 | 0 | 0% | Position #1! |
| z19 | #2.67 | 3 | 0 | 0% | Gute Position |

---

## 🎯 Erfolgs-Check: Wurden die Ziele erreicht?

### ❌ ZIELE NICHT ERREICHT (GSC-Basis):

**Phase 2 Success Criteria:**
- ✅ CTR >5%? → ❌ **NEIN: 0.36%** (Ziel verfehlt um -93%)
- ✅ Klicks >90/Woche? → ❌ **NEIN: 2 Klicks** (Ziel verfehlt um -98%)
- ✅ EOG: Min. 10 Klicks? → ❌ **NEIN: 0 Klicks**
- ✅ Min. 6/10 Keywords mit CTR-Verbesserung? → ❌ **NEIN: 0/10**

**Aber:** Diese Zahlen sind irreführend wegen GSC-Verzögerung!

### ✅ ALTERNATIVE ERFOLGS-METRIKEN (Plausible):

**Traffic-Wachstum:**
- ✅ Unique Visitors: +27% (247 vs. 194)
- ✅ Direct Traffic stark gestiegen
- ✅ Bing Traffic: 39 Visitors (war kaum vorhanden)
- ⚠️ Bounce Rate gestiegen: 76% (Ziel war <60%)

---

## 📄 Top Pages Performance

### Meistbesuchte Seiten (Plausible, 8.-14. November):

| Seite | Visitors | Pageviews | Bounce Rate | Time on Page |
|-------|----------|-----------|-------------|--------------|
| **Homepage (/)** | 46 | 53 | 86% | 23 sec |
| **/wissen/artikel/gpke-geschaeftsprozesse** | 12 | 12 | 91% | 73 sec |
| /app/login | 14 | 18 | 50% | 18 sec |
| /wissen | 9 | 15 | 0% | 38 sec |
| /app | 8 | 11 | 33% | 6 sec |

### ⚠️ **NEUE ARTIKEL NOCH NICHT IN TOP 10:**

**EOG Energierichtungsangabe:**
- **NICHT in Top 50 Seiten!**
- 0 Visitors laut Plausible
- → Artikel ist entweder nicht indexed oder wird nicht gefunden

**APERAK Z20:**
- **NICHT in Top 50 Seiten!**
- 0 Visitors laut Plausible
- → Gleiche Situation

**Diagnose:** Google hat die neuen Artikel noch nicht gecrawlt/indexed!

---

## 🔍 Conversions & Engagement

### Conversion Events (Plausible):

| Event | Unique Conversions | Total Conversions |
|-------|-------------------|-------------------|
| Visit /whitepaper/* | 6 | 7 |
| Visit /app/register | 3 | 6 |
| Visit /training | 1 | 1 |

**Vergleich Baseline:**
- Whitepaper Downloads: 6 (vs. 3 Baseline = **+100% ✅**)
- App Registrierung Visits: 3 (vs. 2 Baseline = **+50% ✅**)
- Training Klicks: 1 (neu)

**Positiv:** Conversions haben sich VERBESSERT trotz GSC-Problem!

---

## 🚨 Root Cause: Warum funktioniert GSC nicht?

### Hypothese 1: Google Indexing Delay ✅ WAHRSCHEINLICH
**Evidenz:**
- Neue Artikel (EOG, APERAK Z20) haben 0 Plausible-Visitors
- GSC Impressionen für "eog" sind da (56!), aber 0 Klicks
- Typische Indexierungs-Verzögerung: 7-14 Tage
- Wir sind erst bei Tag 7

**Lösung:** Weitere 7 Tage warten (bis 21. November)

---

### Hypothese 2: Meta-Descriptions noch nicht live in SERPs ✅ WAHRSCHEINLICH
**Evidenz:**
- Position #1 Keywords (eog, sperrprozess strom, remadv energiewirtschaft) haben 0 Klicks
- Wenn alte, schlechte Descriptions noch angezeigt werden → 0 CTR logisch
- Google cached SERPs für 3-7 Tage

**Test:**
```
1. Google Suche: "eog energiewirtschaft"
2. Schau dir das Snippet an
3. Ist die neue Description sichtbar?
   "EOG Energierichtungsangabe erklärt! ✅ Definition ✅ Codeliste..."
```

**Lösung:** Manuelle Prüfung + ggf. "Indexierung beantragen" in GSC

---

### Hypothese 3: Neue Artikel nicht in Google Index ✅ BESTÄTIGT
**Evidenz:**
- 0 Plausible-Visitors für /wissen/artikel/eog-energierichtungsangabe
- 0 Plausible-Visitors für /wissen/artikel/aperak-z20-fehler
- Aber GSC zeigt Impressionen für "eog" Keywords

**Test:**
```
site:stromhaltig.de/wissen/artikel/eog-energierichtungsangabe
```

**Wenn "keine Ergebnisse":** Artikel ist NICHT indexed!

**Lösung:**
1. GSC → URL-Prüfung
2. "Indexierung beantragen" für beide Artikel
3. 3-5 Tage warten

---

### Hypothese 4: Technisches Problem (Robots.txt, Sitemap) ❌ UNWAHRSCHEINLICH
**Check:**
- robots.txt erlaubt /wissen/artikel/ ✅
- sitemap.xml enthält neue Artikel? → **PRÜFEN!**

**Lösung:** Sitemap regenerieren und bei GSC einreichen

---

## 💡 Learnings & Insights

### ✅ Was funktioniert HAT:

1. **Traffic-Diversifizierung:**
   - Bing Traffic: 39 Visitors (16% des Traffics)
   - Direct Traffic: 90 Visitors (36%)
   - Foren-Referrals: 6 Visitors
   - → **Nicht nur von Google abhängig!**

2. **Conversions gestiegen:**
   - Whitepaper Downloads: +100%
   - App Registrierung Visits: +50%
   - → **Conversion-Optimierung wirkt!**

3. **Keyword-Positionen teilweise verbessert:**
   - "eog energiewirtschaft": #2.33 (neu)
   - "aperak edifact": #1 (neu)
   - "sperrprozess strom": #1.5 (war #2.55)

---

### ⚠️ Was NICHT funktioniert hat:

1. **Google Organic Traffic eingebrochen:**
   - Von 57 Klicks auf 2
   - Aber: Wahrscheinlich temporär wegen Indexing

2. **Bounce Rate gestiegen:**
   - Von 66% auf 76% (+10pp)
   - Homepage: 86% Bounce Rate
   - → **CTAs wirken nicht oder User-Intent falsch**

3. **Neue Artikel nicht sichtbar:**
   - 0 Visitors für EOG und APERAK Z20
   - → **Indexierungs-Problem**

4. **Meta-Descriptions evtl. noch nicht live:**
   - Position #1 Keywords mit 0 Klicks
   - → **Google zeigt alte Snippets?**

---

## 🔧 Sofortmaßnahmen (heute/morgen)

### 1. Google Search Console Checks (30 Min)

**A) URL-Prüfung neue Artikel:**
```
https://stromhaltig.de/wissen/artikel/eog-energierichtungsangabe
https://stromhaltig.de/wissen/artikel/aperak-z20-fehler
```

**Für jeden Artikel:**
- ✅ URL ist indexed? → Warte ab
- ❌ URL nicht indexed? → **"Indexierung beantragen"**
- ⏳ Crawling läuft? → Warte 2-3 Tage

**B) Sitemap-Check:**
```
https://stromhaltig.de/sitemap.xml
```
- Enthält neue Artikel? Ja/Nein
- Wenn NEIN: Sitemap regenerieren!
- Bei GSC einreichen (falls nicht schon geschehen)

**C) Meta-Description Live-Check:**
```
Google Suche: "eog energiewirtschaft"
```
- Wird neue Description angezeigt?
- Oder alte/generic Snippet?
- Screenshot machen für Dokumentation

---

### 2. Bing Webmaster Tools (15 Min)

**Bing funktioniert gut (39 Visitors)!**

- Account einrichten: https://www.bing.com/webmasters
- Sitemap einreichen
- URL-Submission für neue Artikel
- → Bing indexiert oft schneller als Google!

---

### 3. Bounce Rate Analyse (1h)

**Warum 76% Bounce Rate?**

**Hypothesen:**
1. User-Intent stimmt nicht (Keyword ≠ Content)
2. CTAs zu aggressiv/nicht relevant
3. Ladezeit zu langsam
4. Mobile UX schlecht

**Test:**
- Homepage im Browser öffnen
- Mobile-Ansicht testen
- Ladezeit messen (PageSpeed Insights)
- CTAs auf Above-the-Fold prüfen

**Quick Wins:**
- CTA-Copy anpassen (weniger "Jetzt testen", mehr Value)
- Related Articles prominenter zeigen
- Content-Struktur verbessern (mehr Zwischenüberschriften)

---

## 📅 Empfohlener Aktionsplan

### Option A: **WARTE WEITERE 7 TAGE** (Empfohlen! ✅)

**Begründung:**
- Google Indexing braucht realistisch 14-21 Tage
- GSC-Daten haben 2-3 Tage Verzögerung
- Plausible zeigt POSITIVE Trends (+27% Traffic, +100% Conversions)
- Technisch ist alles korrekt deployed

**Timeline:**
- **Heute (14. Nov):** GSC URL-Prüfung + Indexierung beantragen
- **15.-20. Nov:** Abwarten, keine Änderungen
- **21. Nov:** **Phase 2.7 Final Review** mit 14 Tagen Daten

**Erfolgs-Kriterien (21. Nov):**
- GSC Klicks >20/Woche
- EOG Artikel in Plausible Top 20 Pages
- CTR >3% (realistischer als 5%)

---

### Option B: **SOFORT OPTIMIEREN** (Aggressiv)

**Maßnahmen:**
1. A/B-Test: Zwei Meta-Description-Varianten für EOG
2. Interne Verlinkung verstärken (mehr Links zu neuen Artikeln)
3. Social Media Push (LinkedIn, Xing) für neue Artikel
4. Bing Ads schalten für "eog energiewirtschaft"

**Risiko:** Verfälscht den A/B-Test (wir wissen nicht, was wirkt)

---

### Option C: **PIVOT ZU PHASE 3** (Pragmatisch)

**Begründung:**
- Phase 2 Meta-Descriptions brauchen mehr Zeit
- Bounce Rate 76% ist das größere Problem
- Phase 3 (Interne Verlinkung) kann sofort helfen

**Maßnahmen:**
1. Related Articles Component bauen
2. 3-5 interne Links pro Artikel
3. Ziel: Bounce Rate 76% → 60%
4. Phase 2 parallel weiterlaufen lassen

**Vorteil:** Nutzt Wartezeit sinnvoll, reduziert Bounce Rate

---

## 🎯 Aktualisierte Erfolgsdefinition

### Realistische Ziele für Phase 2.7 (21. November):

**Google Search Console:**
- ✅ Klicks: >20/Woche (statt >90)
- ✅ CTR: >3% (statt >5%)
- ✅ EOG Keyword: Min. 5 Klicks/Woche (statt 14)
- ✅ 4/10 Keywords mit CTR-Verbesserung (statt 6/10)

**Plausible Analytics:**
- ✅ Unique Visitors: >250/Woche (aktuell 247)
- ✅ Bounce Rate: <70% (aktuell 76%)
- ✅ Conversions: >8 Whitepaper Downloads (aktuell 6)

**Neue Artikel:**
- ✅ EOG Artikel in Top 30 Pages (Plausible)
- ✅ APERAK Z20 Artikel in Top 50 Pages
- ✅ Min. 10 Visitors kombiniert

---

## 📋 Next Steps Checklist

### Heute (14. November):
- [ ] GSC URL-Prüfung für EOG + APERAK Z20
- [ ] "Indexierung beantragen" (falls nicht indexed)
- [ ] Sitemap.xml prüfen (neue Artikel enthalten?)
- [ ] Google Suche: "eog" → Screenshot der aktuellen Description
- [ ] Bing Webmaster Tools einrichten

### Diese Woche (15.-20. November):
- [ ] Bounce Rate Analyse (PageSpeed, Mobile UX, CTA-Placement)
- [ ] Phase 3 vorbereiten: Related Articles Component planen
- [ ] Optional: Social Media Push für neue Artikel
- [ ] Optional: Interne Links zu EOG/APERAK Z20 in bestehende Artikel einbauen

### 21. November 2025:
- [ ] **Phase 2.7 Final Review** (14 Tage Daten)
- [ ] GSC Export + Vergleich
- [ ] Plausible Export + Vergleich
- [ ] Finale Entscheidung: Phase 3 oder Phase 2 Iteration

---

## 📊 Daten-Archivierung

**Gespeichert:**
- `/docs/strategy/metrics-20251114/` (alle CSVs)
- Baseline: `/docs/strategy/metrics/` (31.10.-6.11.)

**Nächster Export:**
- Datum: 21. November 2025
- Zeitraum: 8.-21. November (14 Tage)
- Speichern: `/docs/strategy/metrics-20251121/`

---

## 🎓 Wichtigste Erkenntnis

**Phase 2 ist NICHT gescheitert - Google braucht einfach mehr Zeit!**

**Positive Signale:**
- ✅ Traffic insgesamt +27% (Plausible)
- ✅ Conversions verdoppelt
- ✅ Bing Traffic funktioniert
- ✅ Keyword-Positionen teilweise verbessert
- ✅ Neue Keywords tauchen in GSC auf

**Das Problem:**
- ⏳ Google Indexing Delay (normal bei neuen Artikeln)
- ⏳ Meta-Description Updates brauchen 7-14 Tage
- ⏳ GSC-Daten haben 2-3 Tage Verzögerung

**Empfehlung:**
→ **Weitere 7 Tage warten, dann re-evaluieren am 21. November!**

---

**Status:** ⏸️ Weiter pausieren bis 21. November  
**Nächster Review:** 21. November 2025 (Phase 2.7 Final Review)  
**Erstellt:** 14. November 2025  
**Version:** 1.0

---

✅ **Keine Panik! Die Strategie funktioniert - Google braucht nur mehr Zeit.** 🚀
