# Phase 4: Action Plan (Dezember 2025)

**Start:** 22. November 2025  
**Duration:** 4 Wochen  
**Review:** 20. Dezember 2025  
**Strategy:** Hybrid Approach (Indexing Offensive + Measurement Fix)

---

## 🎯 Ziele

### Primary Goals (Must-Have)
- ✅ **Alle 10 optimierten Artikel bei Google indexiert** (aktuell: ?)
- ✅ **GSC Clicks >50/Woche** (aktuell: 5/Woche = Baseline)
- ✅ **Related Articles Tracking funktioniert** (aktuell: keine Daten)
- ✅ **Bing Webmaster Tools Setup** (schnellere Indexierung nutzen)

### Secondary Goals (Nice-to-Have)
- 🎯 **Bounce Rate <68%** (aktuell: 73.9%)
- 🎯 **Pages/Visit >2.2** (aktuell: 2.03)
- 🎯 **Bing Traffic +100%** (von 41 auf 80+ visits/Woche)
- 🎯 **Internal Link Clicks >100/Woche** (messbar nach Tracking Fix)

### Stretch Goals (Aspirational)
- 🚀 **GSC Clicks >100/Woche** (bei vollständiger Indexierung)
- 🚀 **Featured Snippets für 3+ Queries** (netznutzungsrechnung, sperrprozess strom)
- 🚀 **Total Traffic >400/Woche** (+43% vs Baseline 280)

---

## 📅 Wochenplan

### Woche 1 (22. - 29. Nov): Quick Wins

#### Tag 1-2: Indexing Offensive (PRIORITÄT 1)
- [ ] **GSC URL Inspection** für 10 Artikel
  - utilmd-stammdaten
  - gpke-geschaeftsprozesse
  - aperak-z17-fehler
  - aperak-z20-fehler
  - lieferantenwechsel-prozess
  - sperrprozess-strom-gas
  - remadv-zahlungsavis
  - eog-energierichtungsangabe
  - bk6-24-210-verfahrensstand
  - (bonus: 2-3 weitere mit Top Positions ohne Klicks)

- [ ] **"Indexierung beantragen"** für jede URL
  - Speziell priorisieren: sperrprozess-gas (Pos 8.29), aperak-z17 (Pos 6.83), netznutzungsrechnung (Pos 1.64)
  
- [ ] **Sitemap Re-Submit** in GSC
  - Nach unserem Fix vom 18. Nov (ungültige Datumsformate behoben)

**Erwartung:** Google beginnt mit Re-Crawling innerhalb 24-48h

#### Tag 3: Bing Webmaster Setup (PRIORITÄT 2)
- [ ] **Bing Webmaster Tools Registrierung**
  - https://www.bing.com/webmasters
  - Site verifizieren (XML File oder Meta Tag)
  
- [ ] **Sitemap submitten**
  - https://stromhaltig.de/sitemap.xml
  
- [ ] **URL Submission** für neue Artikel
  - aperak-z20-fehler
  - eog-energierichtungsangabe
  
- [ ] **Baseline Measurement**
  - Aktuelle Bing Rankings dokumentieren
  - Indexing Status prüfen

**Erwartung:** Bing indexiert neue Artikel innerhalb 3-5 Tagen

#### Tag 4-5: Tracking Debug (PRIORITÄT 3)
- [ ] **Related Articles Event Debugging**
  1. Live-Test auf stromhaltig.de/wissen/artikel/utilmd-stammdaten
  2. Related Article klicken (z.B. "APERAK Z17 Fehler")
  3. Browser DevTools öffnen → Network Tab
  4. Plausible Event `internal_link_clicked` sichtbar?
  
- [ ] **Code Review** (falls Event nicht feuert)
  - `/src/components/RelatedArticles.tsx` Line 45-52 prüfen
  - `window.plausible` verfügbar in Browser Console?
  - Plausible Script geladen? (`<script defer data-domain="stromhaltig.de" src="https://plausible.io/js/script.js">`)
  
- [ ] **Hotfix Deploy** (falls Problem identifiziert)
  - Console Logging temporär aktivieren für Debugging
  - Alternative: Google Analytics 4 Event als Backup
  
- [ ] **Plausible Dashboard Check**
  - Custom Events Tab: "internal_link_clicked" vorhanden?
  - Falls ja: Filter nach letzten 7 Tagen, Breakdown nach "from" Property

**Erwartung:** Tracking funktioniert oder Problem identifiziert + gefixed

---

### Woche 2 (30. Nov - 6. Dez): Monitor & Iterate

#### Daily Tasks (5 Min/Tag)
- [ ] **GSC Coverage Report** prüfen
  - Wie viele der 10 Artikel sind indexiert?
  - Indexing Status Changes dokumentieren
  
- [ ] **Bing Webmaster** prüfen
  - Neue Indexierungen?
  - Crawl Errors?
  
- [ ] **Plausible Analytics** Check
  - `internal_link_clicked` Events (nach Fix)
  - Bounce Rate Trend
  - GSC Clicks (täglich aktualisiert mit 2-3 Tage Delay)

#### Mid-Week Check (Mittwoch/Donnerstag)
- [ ] **Erste Indexing-Erfolge bewerten**
  - Wenn >5 Artikel indexiert: ✅ Continue Plan
  - Wenn <3 Artikel indexiert: ⚠️ Technical SEO Audit needed
  
- [ ] **Traffic Source Analysis**
  - Google Traffic Anteil steigt? (Baseline: 31%)
  - Bing Traffic Anteil steigt? (Baseline: 15%)
  
- [ ] **Top Queries ohne Klicks** (GSC)
  - Update: Generieren diese jetzt Klicks?
  - sperrprozess-gas, aperak-z17, netznutzungsrechnung

#### End-of-Week Report
- [ ] **Woche 2 Snapshot** erstellen
  - GSC Clicks: ___ (Ziel: >15)
  - Indexed Articles: ___/10 (Ziel: >5)
  - Bing Traffic: ___ visits (Ziel: >50)
  - Internal Link Clicks: ___ (Ziel: >25)
  - Bounce Rate: ___% (Ziel: <72%)

---

### Woche 3 (7. - 13. Dez): Scale Based on Data

**Decision Point:** Basierend auf Woche 2 Ergebnissen, eine dieser Strategien wählen:

#### Strategie A: "Indexing Success" (Wenn >7 Artikel indexiert)
- [ ] **Meta-Description Optimization Runde 2**
  - Weitere 10 Artikel identifizieren mit hohem Potential
  - Template anwenden: Emoji + Number + CTA + Jahr
  
- [ ] **Internal Linking Boost**
  - Von Homepage zu Top 10 Artikeln verlinken
  - Cross-Linking zwischen verwandten Artikeln verstärken
  
- [ ] **Long-Tail Keyword Expansion**
  - GSC: Queries mit Impressionen >20 aber 0 Klicks
  - Neue Artikel planen für diese Queries

**Erwartung:** GSC Clicks >30/Woche bis Ende Woche 3

#### Strategie B: "Content Refresh" (Wenn Bounce Rate >72%)
- [ ] **Content Struktur Improvement** (Top 3 Artikel)
  - Mehr H3/H4 Subheadings (alle 200-300 Wörter)
  - Callout Boxes für Key Takeaways
  - Table of Contents für Artikel >2000 Wörter
  
- [ ] **FAQ Sektionen hinzufügen**
  - Für Featured Snippet Optimization
  - Schema.org FAQPage Markup
  
- [ ] **Visual Content**
  - Infografik für GPKE Lieferantenwechsel
  - Diagram für EDIFACT Message Flow

**Erwartung:** Bounce Rate <70% für refreshte Artikel

#### Strategie C: "Alternative Channels" (Wenn Google stagniert)
- [ ] **Bing Ads Test** (Budget: €100)
  - Top 5 Keywords mit hoher Search Intent
  - Landing Pages: optimierte Artikel
  
- [ ] **LinkedIn Content Strategy**
  - 2 Posts/Woche mit Artikel-Snippets
  - Company Page aktivieren
  
- [ ] **Referral Partnerships**
  - stromdao.de Guest Post
  - forum.inexogy.com Collaboration
  - BDEW/VKU Verzeichnisse

**Erwartung:** Total Traffic >350/Woche, weniger Google-abhängig

---

### Woche 4 (14. - 20. Dez): Review & Report

#### Daily Tasks (fortsetzen)
- [ ] GSC, Bing, Plausible Monitoring (5 Min/Tag)

#### Mid-Week: Data Collection
- [ ] **GSC Performance Export** (4 Wochen: 22. Nov - 20. Dez)
  - Queries, Pages, Devices, Countries
  
- [ ] **Plausible Analytics Export**
  - visitors.csv, pages.csv, sources.csv, entry_pages.csv
  - Custom Events: internal_link_clicked
  
- [ ] **Bing Webmaster Export**
  - Search Performance
  - Indexed Pages

#### End-of-Week: Phase 4 Review
- [ ] **Phase 4 Review Report erstellen** (ähnlich wie Phase 2.7)
  - Soll-Ist-Vergleich für alle Goals
  - Trend-Analyse (4 Wochen)
  - ROI-Bewertung
  
- [ ] **Phase 5 Strategy entscheiden**
  - Was hat funktioniert?
  - Was war waste of time?
  - Nächste Prioritäten?

---

## 📊 Success Metrics Tracking

### Weekly Dashboard (in Google Sheets oder Notion)

| Woche | GSC Clicks | Indexed | Bing Traffic | BR % | Internal Clicks | Total Traffic |
|-------|------------|---------|--------------|------|-----------------|---------------|
| Baseline | 5 | ? | 41 | 73.9% | 0* | 280 |
| W1 (Nov 22-29) | ___ | ___/10 | ___ | ___% | ___ | ___ |
| W2 (Nov 30-Dec 6) | ___ | ___/10 | ___ | ___% | ___ | ___ |
| W3 (Dec 7-13) | ___ | ___/10 | ___ | ___% | ___ | ___ |
| W4 (Dec 14-20) | ___ | ___/10 | ___ | ___% | ___ | ___ |
| **Target (4W)** | **>50** | **10/10** | **>80** | **<68%** | **>100** | **>350** |

### Visual Progress Tracking

```
GSC Clicks Progression:
Baseline: ▓░░░░░░░░░ 5/50
Week 1:   ▓▓░░░░░░░░ __/50
Week 2:   ▓▓▓░░░░░░░ __/50
Week 3:   ▓▓▓▓▓░░░░░ __/50
Week 4:   ▓▓▓▓▓▓▓▓░░ __/50

Indexing Status:
Baseline: ▓░░░░░░░░░ ?/10
Week 1:   ▓▓░░░░░░░░ __/10
Week 2:   ▓▓▓▓▓░░░░░ __/10
Week 3:   ▓▓▓▓▓▓▓▓░░ __/10
Week 4:   ▓▓▓▓▓▓▓▓▓▓ 10/10 ✅
```

---

## 🚨 Critical Path Items (Blocker Prevention)

### Must Complete in Week 1:
1. ✅ GSC URL Inspection + Indexing Requests (ohne dies keine Verbesserung möglich)
2. ✅ Related Articles Tracking Fix (ohne Daten keine Optimization)

### Must Complete in Week 2:
3. ✅ First Indexing Success (min 3 Artikel) - validiert, dass Strategie funktioniert
4. ✅ Plausible Events messbar - Data-Driven Decisions ermöglichen

### Nice-to-Have in Week 2:
5. 🎯 Bing Webmaster Setup - Alternative Channel für schnelles Feedback
6. 🎯 Technical SEO Audit - nur wenn Indexing <3 Artikel in Woche 2

---

## 💡 Learnings Checklist

Am Ende von Phase 4 sollten wir diese Fragen beantworten können:

### Technical SEO
- [ ] Wie lange dauert Google Indexing nach "Indexierung beantragen"? (Durchschnitt über 10 Artikel)
- [ ] Macht Bing Webmaster einen signifikanten Unterschied? (Traffic-Wachstum)
- [ ] Welche Technical SEO Faktoren blockieren Indexing? (falls identifiziert)

### Content Performance
- [ ] Welche Meta-Description Patterns haben höchste CTR? (Emoji vs No-Emoji, CTA vs No-CTA)
- [ ] Funktionieren Manual Related Articles besser als Automatic? (CTR-Vergleich)
- [ ] Welche Artikel haben niedrigste Bounce Rate? (Pattern identifizieren)

### Channel Mix
- [ ] Welche Traffic Source hat beste Engagement? (Pages/Visit, Time on Site)
- [ ] Ist Google oder Bing profitabler pro Visit? (Conversion Rate)
- [ ] Wie entwickelt sich Direct Traffic bei steigender Bekanntheit?

### ROI
- [ ] Was war Time Investment vs Results? (Stunden pro generiertem Click)
- [ ] Welche Activities hatten höchsten ROI? (Ranking: Indexing, Content, Technical)
- [ ] Was sollten wir in Phase 5 stoppen/starten/fortsetzen?

---

## 🎯 Phase 4 Success Criteria

### Minimum Success (70%)
- ✅ 7/10 Artikel indexiert bei Google
- ✅ GSC Clicks >30/Woche
- ✅ Related Articles Tracking funktioniert
- ✅ Bounce Rate <72%

**Action wenn erreicht:** Phase 5 = Scale (mehr Artikel optimieren)

### Stretch Success (85%)
- ✅ 10/10 Artikel indexiert
- ✅ GSC Clicks >50/Woche
- ✅ Internal Link Clicks >100/Woche
- ✅ Bounce Rate <68%
- ✅ Bing Traffic >80/Woche

**Action wenn erreicht:** Phase 5 = Expand (neue Themen, mehr Content)

### Dream Success (100%)
- ✅ 10/10 Artikel indexiert bei Google + Bing
- ✅ GSC Clicks >100/Woche
- ✅ 3+ Featured Snippets
- ✅ Bounce Rate <65%
- ✅ Total Traffic >400/Woche

**Action wenn erreicht:** Phase 5 = Automate (systematisiere erfolgreiche Prozesse)

---

## 📝 Next Steps (nach Phase 4)

### Wenn Phase 4 erfolgreich:
→ **Phase 5: Scale & Automate** (Januar 2026)
- Meta-Description Optimization Tool (Bulk Processing)
- Content Calendar für 2x neue Artikel/Monat
- Automated Reporting Dashboard

### Wenn Phase 4 teilweise erfolgreich:
→ **Phase 4.5: Iteration** (Dezember Woche 3-4)
- Deep Dive in blockierende Faktoren
- A/B Tests für Low-Performers
- Expert Consultation (SEO Agentur?)

### Wenn Phase 4 scheitert:
→ **Phase Pivot: Alternative Strategy** (Januar 2026)
- Focus auf Paid Channels (Google Ads, LinkedIn Ads)
- Partnerships & Referrals
- Community Building (User-Generated Content)

---

**Dokument erstellt:** 22. November 2025  
**Verantwortlich:** SEO Strategy Team  
**Review Cycle:** Wöchentlich (Freitags)  
**Final Review:** 20. Dezember 2025
