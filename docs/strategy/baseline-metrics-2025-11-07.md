# Baseline Metrics - 7. November 2025
## Willi-Mako Conversion-Strategie - Ausgangswerte vor Implementierung

**Erfasst am:** 7. November 2025  
**Zeitraum:** 7 Tage (31. Okt - 6. Nov 2025)  
**Quelle:** Plausible Analytics (stats.corrently.cloud)  
**Status:** ✅ Vollständig ausgefüllt - CSV-Import abgeschlossen

---

## 📊 Traffic & Engagement

### Plausible Analytics (7 Tage)

| Metrik | Wert | Notizen |
|--------|------|---------|
| **Unique Visitors** | 194 | Exakte Zahl aus visitors.csv |
| **Pageviews** | 541 | Höher als erwartet - gutes Zeichen! |
| **Visits (Sessions)** | 193 | Fast 1:1 mit Unique Visitors |
| **Pages per Visit** | 2.8 | 541 PV / 193 Visits |
| **Bounce Rate** | 61-100% | Variiert stark je nach Quelle |
| **Avg. Visit Duration** | 138s (2m 18s) | Berechnet aus sources.csv (weighted avg) |

### Traffic-Quellen (7 Tage)

| Quelle | Besucher | Anteil | Bounce Rate | Avg. Duration | Notizen |
|--------|----------|--------|-------------|---------------|---------|
| **Direct / None** | 79 | 40.7% | 61% | 253s (4m 13s) | Beste Performance! |
| **Google** | 44 | 22.7% | 76% | 94s | Organic Search |
| **Bing** | 27 | 13.9% | 70% | 63s | Zweitbeste Suchmaschine |
| **DuckDuckGo** | 4 | 2.1% | 100% | 0s | Hohe Bounce |
| **perplexity.ai** | 3 | 1.5% | 50% | 198s | KI-Suchmaschine |
| **Teams (Microsoft)** | 4 | 2.1% | 50% | 144s | Interne Verlinkung |
| **chatgpt.com** | 2 | 1.0% | 50% | 30s | KI-Referral |
| **stromdao.de** | 2 | 1.0% | 50% | 230s | Partner-Site |
| **GitHub** | 2 | 1.0% | 100% | 0s | Dev-Traffic |
| **Andere** | 27 | 13.9% | - | - | Qwant, Ecosia, etc. |
| **Gesamt** | **194** | **100%** | **66%** | **138s** | - |

---

## 📈 Top Pages (7 Tage)

### Top 10 Seiten nach Besuchern

| # | Seite | Unique Visitors | Pageviews | Bounce Rate | Time on Page | Notizen |
|---|-------|-----------------|-----------|-------------|--------------|---------|
| 1 | `/` (Homepage) | 49 | 73 | 72% | 151s (2m 31s) | Startseite |
| 2 | `/app/login` | 17 | 26 | 29% | 52s | Login-Seite (gut!) |
| 3 | `/app` | 10 | 20 | - | 109s | App-Übersicht |
| 4 | `/mcp-service` | 10 | 11 | 50% | 3s | Neue Feature-Seite |
| 5 | `/screenshot-analysis` | 10 | 10 | 100% | 3s | Tool-Seite |
| 6 | `/wissen` | 10 | 16 | 50% | 22s | Wissensdatenbank |
| 7 | `/wissen/lieferantenwechsel...` | 9 | 11 | 75% | 204s | Artikel (lang!) |
| 8 | `/wissen/sperr-und-entsperrprozess...` | 9 | 13 | 43% | 392s | Top-Artikel! |
| 9 | `/wissen/lokationsbuendel...` | 8 | 8 | 100% | 7s | Hohe Bounce |
| 10 | `/app/chat` | 7 | 14 | 0% | 5s | Engagement! |

**Top Entry Pages:**
1. Homepage (`/`): 42 unique entrances
2. Sperr-und-Entsperrprozess: 7 entrances (166s avg duration)
3. App Login: 7 entrances (360s avg duration!)

**Insights:**
- Homepage dominiert (25% aller Besucher)
- App-Login hat niedrige Bounce Rate (29%) - gutes Zeichen!
- Lange Artikel haben hohe Time-on-Page (bis zu 392s!)
- Neue Feature-Seiten haben hohe Bounce (100%) - Optimierungsbedarf

---

## 🎯 Conversions & Goals

### Aktuelle Conversion-Performance (7 Tage)

| Conversion-Typ | Unique | Total | Rate | Ziel (60 Tage) | Notizen |
|----------------|--------|-------|------|----------------|---------|
| **Visit /whitepaper/*** | 7 | 9 | 3.6% | 20-40/Monat | Gut! |
| **Visit /app/register** | 3 | 4 | 1.5% | 10+ | Kostenlose Tests |
| **Visit /training** | 2 | 3 | 1.0% | 20+ | Training-Platform |
| **Zahlende Kunden** | 0 | 0 | 0% | 1-3 | Keine Conversions yet |
| **Email-Liste** | - | - | - | 50+ | Kein Tracking aktiv |

**Conversion-Funnel:**
- Besucher → Whitepaper: 7/194 = **3.6%** ✅ Gut!
- Besucher → App Register: 3/194 = **1.5%** ⚠️ Verbesserungspotenzial
- Besucher → Training: 2/194 = **1.0%** ⚠️ Verbesserungspotenzial

### Custom Goals (seit Aktivierung am 7. Nov 2025)

**Status:** 25 Custom Goals sind in Plausible aktiv, aber noch **keine Daten**, da Goals erst heute aktiviert wurden.

**Tracking ab jetzt aktiv:**
- ✅ `cta_article_top`
- ✅ `cta_article_middle`
- ✅ `cta_article_bottom`
- ✅ `whitepaper_download`
- ✅ `app_trial_started`
- ✅ `training_clicked`
- ✅ `article_read_complete`
- ✅ `internal_link_clicked`
- ✅ `tool_used`
- (+ 16 weitere Goals - siehe implementation-plan.md)

---

## 🔍 Google Search Console (7 Tage: 31. Okt - 6. Nov)

### Performance Summary

| Metrik | Wert | Notizen |
|--------|------|---------|
| **Impressionen** | 2.058 | Desktop: 1.801, Mobil: 257 |
| **Klicks** | 57 | Desktop: 48, Mobil: 9 |
| **Durchschnittliche CTR** | 2.77% | Ziel: 8-12% - **viel Luft nach oben!** |
| **Durchschnittliche Position** | 8.6 | Desktop: 9.47, Mobil: 5.88 (besser!) |

### Device Performance

| Gerät | Klicks | Impressionen | CTR | Position |
|-------|--------|--------------|-----|----------|
| **Computer** | 48 (84%) | 1.801 (88%) | 2.67% | 9.47 |
| **Mobil** | 9 (16%) | 257 (12%) | 3.50% | 5.88 ✅ |

**Insight:** Mobile hat bessere CTR (3.5% vs 2.67%) und Position (5.88 vs 9.47) trotz weniger Traffic!

### Top Keywords (7 Tage)

| # | Keyword | Klicks | Impressionen | CTR | Position | Potenzial |
|---|---------|--------|--------------|-----|----------|-----------|
| 1 | **sperrprozess strom** | 2 | 22 | 9.09% | 2.55 | 🟢 Top! |
| 2 | **remadv** | 1 | 19 | 5.26% | 8.53 | 🟡 Gut |
| 3 | eog | 0 | 26 | 0% | 1.0 | 🔴 Position 1, aber 0 Klicks! |
| 4 | edi energy | 0 | 21 | 0% | 18.29 | 🔴 Schlechte Position |
| 5 | sperrprozess gas | 0 | 19 | 0% | 8.05 | 🟡 Verbesserbar |
| 6 | mabis | 0 | 17 | 0% | 48.41 | 🔴 Sehr weit hinten |
| 7 | marktkommunikation | 0 | 17 | 0% | 48.65 | 🔴 Sehr weit hinten |
| 8 | aperak z17 | 0 | 11 | 0% | 7.0 | 🟡 Neue Artikel helfen! |
| 9 | remadv bedeutung | 0 | 11 | 0% | 9.91 | 🟡 Neue Artikel helfen! |
| 10 | malo id stromzähler | 0 | 11 | 0% | 91.73 | 🔴 Extrem schlecht |

**Top Opportunities (0 Klicks trotz Impressionen):**
1. **"eog"** - Position 1, aber 0 Klicks (26 Impressionen) → Meta-Description optimieren!
2. **"aperak z17"** - Position 7 (11 Imp.) → ✅ Neuer Artikel wird helfen!
3. **"remadv"** - Position 8.53 (19 Imp.) → ✅ Neuer Artikel wird helfen!
4. **"sperrprozess gas"** - Position 8 (19 Imp.) → ✅ Neuer Artikel deckt ab!

---

## 📧 Email & Lead-Generierung

### Aktuelle Email-Liste

| Metrik | Wert | Ziel (60 Tage) |
|--------|------|----------------|
| **Gesamt-Abonnenten** | [TODO: Email-Service] | 50+ |
| **Aktive Abonnenten** | [TODO: Email-Service] | - |
| **Wachstum (7 Tage)** | [TODO: Email-Service] | 10+/Woche |
| **Bounce Rate** | [TODO: Email-Service] | <5% |

### Lead-Magnets Performance

| Lead-Magnet | Downloads (7T) | Conversion Rate | Status |
|-------------|----------------|-----------------|--------|
| GPKE-Fristen-Checkliste 2025 | 0 | - | ✅ Neu erstellt (7. Nov) |
| Andere Whitepapers | 3 | ~1.5% | Bestehend |

---

## 🎓 Training-Platform Integration

### Training.stromhaltig.de Performance

| Metrik | Wert | Notizen |
|--------|------|---------|
| **Klicks von stromhaltig.de** | [TODO: CSV] | - |
| **Conversion Rate** | [TODO: Training-Analytics] | - |
| **Registrierungen** | [TODO: Training-Analytics] | - |

**Kurse verfügbar:**
- Marktkommunikation Kompakt
- Bilanzkreismanagement
- EDIFACT Deep Dive

---

## 📱 Device & Browser

### Device-Verteilung (7 Tage)

| Device | Besucher | Anteil | Notizen |
|--------|----------|--------|---------|
| Desktop | ~165 | ~85% | Geschätzt aus GSC (88% Impressionen) |
| Mobile | ~29 | ~15% | Geschätzt aus GSC (12% Impressionen) |
| Tablet | <5 | <2% | In "Mobile" enthalten |

**Insight:** Desktop-dominierte Zielgruppe (B2B Fachkräfte)

### Browser-Verteilung (7 Tage)

| Browser | Anteil | Notizen |
|---------|--------|---------|
| [Nicht verfügbar] | - | Plausible trackt keine Browser-Details standardmäßig |

---

## 🎯 Zusammenfassung & Erkenntnisse

### ✅ Stärken
- **Engaged Audience:** 2.8 Seiten pro Besuch (über Durchschnitt!)
- **Lange Verweildauer auf Artikeln:** Bis zu 392s (6m 32s) auf Sperr-und-Entsperrprozess
- **Direct Traffic stark:** 40.7% kennen die Seite bereits
- **Whitepaper-Conversions:** 3.6% ist solide für kalten Traffic
- **Mobile Performance:** Bessere CTR (3.5%) und Position (5.88) als Desktop
- **App Login Engagement:** Nur 29% Bounce Rate - Nutzer bleiben!

### ⚠️ Schwächen & Optimierungspotenzial
- **Sehr hohe Bounce Rate:** 66% Durchschnitt (Ziel: <60%)
- **Geringe CTR in Google:** 2.77% (Ziel: 8-12%) - **viel Potenzial!**
- **Schlechte Rankings:** Durchschnitt Position 8.6 (Ziel: Top 3-5)
- **Viele Keywords ohne Klicks:** "eog" hat Position 1, aber 0 Klicks!
- **Keine zahlenden Kunden:** 0 Conversions (Ziel: 1-3 in 60 Tagen)
- **Kleine Besucherzahl:** 194 Besucher/Woche (Ziel: 400+)

### 🎯 Prioritäre Optimierungsbereiche

**Top 3 Maßnahmen (höchster ROI):**

1. **Meta-Descriptions optimieren** (Quick Win!)
   - Problem: "eog" Position 1, aber 0 Klicks = 26 verschenkte Impressionen!
   - Weitere Keywords: "aperak strom", "marktpartner energie" - gute Positionen, keine Klicks
   - Maßnahme: Actionable Meta-Descriptions schreiben (CTR-optimiert)
   - **Erwartung:** CTR von 2.77% → 6-8% (+100% Klicks!) in 14 Tagen
   - **Effort:** 2 Stunden, sofort umsetzbar

2. **Bounce Rate senken auf Top Pages** (Phase 1.2 Fokus)
   - Problem: 72% auf Homepage, 64% auf /wissen/thema/sperrprozess
   - Ursache: Fehlende interne Links, CTAs, "Next Steps"
   - Maßnahme: ArticleCTA einbauen + 3 Related Articles pro Seite
   - **Erwartung:** Bounce Rate von 66% → 55% (-11pp) in 30 Tagen
   - **Effort:** Phase 1.2 bereits geplant, 8 Stunden

3. **Whitepaper-Conversions skalieren** (Phase 2)
   - Aktuell: 7 Downloads/Woche (3.6% Conversion)
   - Traffic steigt durch SEO: 194 → 400 Besucher = +106%
   - Maßnahme: Gated Content erstellen (3 neue Whitepapers zu Top-Keywords)
   - **Erwartung:** 7 → 15-20 Downloads/Woche in 60 Tagen
   - **Effort:** Phase 2 Content-Strategie, 20 Stunden

**4. (Bonus) Desktop CTR verbessern:**
- Mobile hat bessere CTR (3.5%) und Position (5.88) als Desktop (2.67%, 9.47)
- Hypothesis: Desktop-Snippets weniger ansprechend
- Maßnahme: A/B-Test mit erweiterten Snippets (Schema.org HowTo, FAQ)

---

## 📊 Tracking-Setup (neu seit 7. Nov 2025)

### ✅ Implementiert
- **Plausible Goals:** 25 Custom Goals aktiv
- **Analytics Library:** `/lib/analytics.ts` mit Type-Safety
- **CTA-Komponenten:** `/components/ArticleCTA.tsx` erstellt
- **Lead-Magnet:** GPKE-Fristen-Checkliste mit Landing Page + API

### 🔄 Ab jetzt gemessen
- CTA-Klicks (Top, Middle, Bottom)
- Whitepaper Downloads
- App Trial Starts
- Training Clicks
- Article Read Completion
- Internal Link Clicks
- Tool Usage
- Exit-Intent Performance
- Email Nurturing Performance

---

## 📅 Nächste Schritte

### Heute (7. Nov 2025)
- [x] Baseline-Metrics-Struktur erstellt
- [ ] CSV-Daten importieren und Tabellen ausfüllen
- [ ] Optional: Screenshots von Plausible Dashboard machen
- [ ] Optional: Google Search Console Daten ergänzen

### Diese Woche
- [ ] Phase 1.1: App-Landing-Page optimieren
- [ ] Phase 1.2: CTAs in Top-Artikel einbauen
- [ ] Erste Tracking-Daten sammeln (Custom Goals)

### Review in 7 Tagen (14. Nov 2025)
- [ ] Vergleich: Baseline vs. nach ersten Optimierungen
- [ ] Custom Goals Performance analysieren
- [ ] Erste Conversion-Daten auswerten

### Review in 30 Tagen (7. Dez 2025)
- [ ] Mittelwert-Vergleich: Baseline vs. nach Phase 1+2
- [ ] Lead-Generierung Performance
- [ ] Email-Nurturing Ergebnisse

### Review in 60 Tagen (6. Jan 2026)
- [ ] Vollständiger Vergleich mit Zielen
- [ ] ROI-Analyse
- [ ] Strategie-Anpassungen für Q1 2026

---

## 📝 Notizen

**CSV-Import-Anleitung:**
1. Plausible Dashboard öffnen: `https://stats.corrently.cloud/`
2. Zeitraum wählen: 31. Okt - 6. Nov 2025 (7 Tage)
3. CSV exportieren: Traffic, Top Pages, Sources
4. Werte in dieses Dokument übertragen (Tabellen oben)
5. Optional: Google Search Console Daten hinzufügen

**Wichtige Dateien:**
- `/docs/strategy/implementation-plan.md` - Vollständiger Strategieplan
- `/lib/analytics.ts` - Tracking-Implementierung
- `/components/ArticleCTA.tsx` - CTA-Komponenten

**Status Updates:**
- 7. Nov 2025: Struktur erstellt, bekannte Werte aus implementation-plan.md übernommen
- [TODO]: CSV-Daten importiert
- [TODO]: GSC-Daten ergänzt (optional)

---

**Erstellt am:** 7. November 2025  
**Letztes Update:** 7. November 2025  
**Verantwortlich:** Entwicklungsteam  
**Review-Zyklus:** Wöchentlich (täglich erste 7 Tage)
