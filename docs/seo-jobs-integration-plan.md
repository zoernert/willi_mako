# SEO-Integrationsplan: Jobs-Subdomain → Hauptwebseite

**Erstellt:** 5. Oktober 2025  
**Ziel:** Maximierung des SEO-Erfolgs durch strategische Integration von jobs.stromhaltig.de in die Hauptwebseite stromhaltig.de

## Executive Summary

Die Jobs-Subdomain (jobs.stromhaltig.de) verfügt über 215+ Stellenangebote und innovative KI-Features (Hotspot-Karte, Trend-Analysen, Skills-Radar). Diese Ressource soll als Traffic-Generator für die Hauptanwendung dienen. Der vorliegende Plan definiert eine SEO-optimierte Integrationsstrategie, die:

- **Verschiedene Suchintentionen** bedient (informational vs. transactional)
- **Cross-Domain Authority** aufbaut
- **Duplicate Content** vermeidet
- **User Journey** von Jobs-Interessenten zu Willi-Mako-Nutzern optimiert

---

## 1. Aktuelle Situation

### Hauptwebseite (stromhaltig.de)
- ✅ Starke SEO-Basis: Schema.org, Meta-Tags, Sitemaps, RSS/Atom-Feeds
- ✅ Content-Bereiche: FAQ (40+), Daten-Atlas, Community, Whitepaper
- ✅ Zielgruppe: Sachbearbeiter & Entscheider in der Energiewirtschaft
- ⚠️ Fehlende Karriere/Jobs-Sektion
- ⚠️ Keine Verbindung zur Jobs-Subdomain aus SEO-Perspektive

### Jobs-Subdomain (jobs.stromhaltig.de)
- ✅ 215+ aktive Stellenangebote
- ✅ KI-gestützte Features (Hotspot-Karte, Trends, Skills-Radar)
- ✅ Semantische Suche mit Vector-Search
- ✅ "Powered by Willi Mako" Branding
- ⚠️ Isolierte Subdomain ohne interne Verlinkung zur Hauptseite
- ⚠️ Potenzial als Traffic-Quelle nicht ausgeschöpft

---

## 2. SEO-Strategie: Drei-Säulen-Modell

### 2.1 Säule 1: Content-Integration auf der Hauptseite

**Ziel:** Willi-Mako als zentrale Plattform für Karriere UND Fachwissen positionieren

#### A) Neue Landing-Page: `/karriere` oder `/jobs-marktkommunikation`

**URL-Empfehlung:** `/karriere` (kürzere URL, besser merkbar, breiterer Scope)

**Inhalte:**
```markdown
# Karriere in der Marktkommunikation

## Der Jobmarkt für Energiewirtschafts-Experten

[Hero-Bereich mit Key-Metrics]
- 215+ aktuelle Stellenangebote
- 7 Fachbereiche überwacht
- Täglich aktualisiert

## Warum Marktkommunikation eine Zukunftsbranche ist
[Content-Block mit 3-4 Absätzen über:
- Energiewende und digitale Transformation
- Fachkräftemangel und Chancen
- Rolle der Marktkommunikation
- Willi-Mako als Karriere-Beschleuniger]

## Aktuelle Trends im Jobmarkt
[Eingebettete Widgets oder statische Snapshots von jobs.stromhaltig.de:
- Top 5 gefragte Skills (aus Skills-Radar)
- Regionale Hotspots (Karte mit Top-3 Städten)
- Gehalts-Trends (falls verfügbar)]

## Live-Stellenangebote
[Dynamischer Feed der neuesten 6-10 Jobs von der Subdomain
ODER: Statische Teaser mit "Alle Jobs ansehen" CTA]

## Ihr Karriere-Vorteil mit Willi-Mako
[3 Spalten mit Icons:
1. Expertenwissen aufbauen → FAQ/Wissensdatenbank
2. Trends verstehen → Jobs-Analytics
3. Netzwerk nutzen → Community Hub]

[Primärer CTA: "7 Tage kostenlos testen"]
[Sekundärer CTA: "Alle Stellenangebote durchsuchen" → jobs.stromhaltig.de]
```

**SEO-Optimierung:**
- **Meta-Title:** "Karriere in der Marktkommunikation | Jobmarkt Energiewirtschaft"
- **Meta-Description:** "Entdecken Sie 215+ Stellenangebote für Marktkommunikation in der Energiewirtschaft. KI-gestützte Job-Trends, Gehaltsanalysen und Skill-Radar. Jetzt kostenlos testen!"
- **Schema.org:** `WebPage` + `BreadcrumbList`
- **H1:** "Karriere in der Marktkommunikation"
- **Keywords:** Marktkommunikation Jobs, Energiewirtschaft Karriere, GPKE Jobs, Bilanzkreismanagement Stellenangebote

#### B) Homepage-Integration: Neue Sektion "Karriere-Insights"

**Position:** Nach "Häufig gestellte Fragen", vor "Bereit für den entscheidenden Vorteil?"

**Inhalt:**
```jsx
<Section title="Karriere-Insights für Marktkommunikation">
  <Grid container spacing={3}>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent>
          <TrendingUpIcon />
          <Typography variant="h6">Top Skills 2025</Typography>
          <List>
            <ListItem>GPKE-Prozesse</ListItem>
            <ListItem>Bilanzkreismanagement</ListItem>
            <ListItem>EDIFACT-Kenntnisse</ListItem>
          </List>
          <Link href="/karriere">Mehr Trends →</Link>
        </CardContent>
      </Card>
    </Grid>
    
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent>
          <LocationIcon />
          <Typography variant="h6">Regionale Hotspots</Typography>
          <Typography>München, Berlin, Düsseldorf führen den Jobmarkt an</Typography>
          <Link href="https://jobs.stromhaltig.de/map">Zur Karte →</Link>
        </CardContent>
      </Card>
    </Grid>
    
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent>
          <WorkIcon />
          <Typography variant="h6">215+ aktive Jobs</Typography>
          <Typography>Täglich aktualisierte Stellenangebote für Marktkommunikation</Typography>
          <Link href="https://jobs.stromhaltig.de/search">Jobs durchsuchen →</Link>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</Section>
```

**Vorteile:**
- Homepage-Besucher lernen Jobs-Angebot kennen
- Cross-Domain-Link mit kontextueller Relevanz
- Minimal invasiv (keine große Umstellung)

#### C) Integration in Navigation/Footer

**Hauptnavigation:**
- Neuer Top-Level-Punkt: "Karriere"
- Dropdown mit:
  - Jobmarkt-Übersicht (/karriere)
  - Stellenangebote durchsuchen (→ jobs.stromhaltig.de/search)
  - Karriere-Trends (→ jobs.stromhaltig.de/trends)
  - Regionale Hotspots (→ jobs.stromhaltig.de/map)

**Footer:**
- Neue Spalte "Karriere"
  - Jobmarkt-Übersicht
  - Stellenangebote
  - Trends & Analysen
  - Skills-Radar

---

### 2.2 Säule 2: Cross-Domain Linking & User Journey

#### A) Von Hauptseite → Jobs-Subdomain

**Primäre Links:**
1. **Homepage Karriere-Sektion** → jobs.stromhaltig.de (nofollow optional, aber empfohlen: dofollow für Link Juice)
2. **Karriere Landing-Page** → jobs.stromhaltig.de/search, /trends, /map (dofollow)
3. **Navigation** → jobs.stromhaltig.de (dofollow)
4. **FAQ-Artikel** → Kontextuelle Links zu relevanten Jobs (z.B. "GPKE-Prozesse" FAQ → jobs.stromhaltig.de/search?q=GPKE)

**Anchor-Text-Strategie:**
- ✅ "Aktuelle Stellenangebote für Marktkommunikation"
- ✅ "215+ Jobs im Energiesektor"
- ✅ "Jobmarkt-Trends ansehen"
- ❌ "Hier klicken" (zu generisch)
- ❌ "jobs.stromhaltig.de" (nicht SEO-optimiert)

#### B) Von Jobs-Subdomain → Hauptseite

**Ziel:** User Journey von Job-Interessent zu Willi-Mako-Nutzer

**Strategische Platzierungen:**

1. **Jobs-Homepage (jobs.stromhaltig.de):**
   - Hero-CTA: "Jetzt mit Willi-Mako durchstarten" → stromhaltig.de/app/login
   - "Powered by Willi Mako" → stromhaltig.de (bereits vorhanden, gut!)
   - Neuer Content-Block: "Warum Willi-Mako für Ihre Karriere?"
     - Expertenwissen aufbauen → stromhaltig.de/wissen
     - Praxisnahe Tools nutzen → stromhaltig.de (7-Tage-Test)
     - Community beitreten → stromhaltig.de/community

2. **Job-Detailseiten (falls vorhanden):**
   - Sidebar-Widget: "Expertenwissen für diese Stelle"
     - Beispiel: Job "GPKE-Spezialist" → Links zu FAQ-Artikeln über GPKE
     - CTA: "Kostenlos Fachwissen vertiefen"

3. **Dashboard (jobs.stromhaltig.de/dashboard):**
   - Banner: "Bereiten Sie sich optimal vor: Lernen Sie mit Willi-Mako die Fachthemen, die Arbeitgeber erwarten"
   - CTA: "7 Tage kostenlos testen"

4. **Trends-Seite (jobs.stromhaltig.de/trends):**
   - Content-Integration: "Diese Fähigkeiten lernen Sie mit Willi-Mako"
   - Verlinkung zu relevanten FAQ-Kategorien

**Anchor-Text-Strategie:**
- ✅ "Fachwissen in Marktkommunikation aufbauen"
- ✅ "Willi-Mako Expertensystem"
- ✅ "Kostenlos Energiewirtschaft lernen"
- ✅ "7 Tage kostenlosen Zugang sichern"

---

### 2.3 Säule 3: Content-Synergien ohne Duplicate Content

**Problem:** Beide Seiten könnten für ähnliche Keywords konkurrieren

**Lösung:** Klare Content-Differenzierung

| Keyword-Typ | Hauptseite (stromhaltig.de) | Jobs-Subdomain (jobs.stromhaltig.de) |
|-------------|------------------------------|---------------------------------------|
| **Informational** | ✅ "Was ist Marktkommunikation?" | ❌ |
| | ✅ "GPKE Prozesse erklärt" | ❌ |
| **Navigational** | ✅ "Willi-Mako Login" | ❌ |
| | ✅ "Marktkommunikation Tool" | ❌ |
| **Transactional** | ❌ | ✅ "Marktkommunikation Jobs" |
| | ❌ | ✅ "Stellenangebote Energiewirtschaft" |
| | ❌ | ✅ "GPKE Spezialist Job" |
| **Commercial** | ✅ "Marktkommunikation Software" | ❌ |
| | ✅ "Willi-Mako Preise" | ❌ |

**Unique Content-Bereiche:**

**Hauptseite exklusiv:**
- FAQ-Artikel (Wissensvermittlung)
- Daten-Atlas (Prozess-Dokumentation)
- Benutzerhandbuch
- Whitepaper/Artikel
- Community-Diskussionen
- **Karriere-Landing-Page** (Überblick, keine Job-Listings)

**Jobs-Subdomain exklusiv:**
- Job-Listings (Stellenanzeigen)
- Gehaltsdaten
- Skills-Radar (detailliert)
- Arbeitgeber-Profile
- Bewerbungstipps

**Shared Content (differenziert):**
- **Trends:**
  - Hauptseite: "Trends in der Marktkommunikation" (fachlich-inhaltlich)
  - Jobs: "Job-Trends und Gehalts-Entwicklungen" (karrierefokussiert)

---

## 3. Technische SEO-Maßnahmen

### 3.1 Subdomain-Konfiguration

**Empfehlung:** Subdomain beibehalten (nicht /jobs auf Hauptdomain)

**Gründe:**
- ✅ Separate Autorität aufbauen (Domain Authority diversifizieren)
- ✅ Klare thematische Trennung
- ✅ Schnellere Entwicklung/Deployment möglich
- ✅ Analytics-Tracking einfacher
- ⚠️ Link Juice wird nicht direkt übertragen (Lösung: strategisches Cross-Linking)

**Alternative:** Subdirectory `/jobs` auf Hauptdomain
- ✅ Direkter Link Juice Transfer
- ✅ Einfachere interne Verlinkung
- ❌ Komplexere Deployment-Pipeline
- ❌ Potenzielle Konflikte mit Next.js Routing

**Entscheidung:** Subdomain beibehalten + intensives Cross-Linking

### 3.2 Canonical Tags & Duplicate Content

**Regel:** Jede Seite hat genau eine kanonische URL

**Szenarien:**

1. **Karriere-Landing-Page auf Hauptseite:**
   ```html
   <link rel="canonical" href="https://stromhaltig.de/karriere" />
   ```

2. **Jobs-Subdomain:**
   ```html
   <link rel="canonical" href="https://jobs.stromhaltig.de/" />
   ```

3. **Keine Duplikate:** Karriere-Seite zeigt nur Teaser/Auszüge, nie vollständige Job-Listings

### 3.3 Structured Data

**Hauptseite /karriere:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Karriere in der Marktkommunikation",
  "description": "Jobmarkt-Insights und Karrierechancen...",
  "url": "https://stromhaltig.de/karriere",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://stromhaltig.de"},
      {"@type": "ListItem", "position": 2, "name": "Karriere", "item": "https://stromhaltig.de/karriere"}
    ]
  },
  "about": {
    "@type": "JobPosting",
    "description": "Über 215 aktuelle Stellenangebote...",
    "hiringOrganization": {"@type": "Organization", "name": "Diverse Energieversorger"}
  }
}
```

**Jobs-Subdomain (einzelne Job-Seiten):**
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "GPKE-Spezialist (m/w/d)",
  "description": "...",
  "datePosted": "2025-10-01",
  "validThrough": "2025-11-01",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Beispiel Energieversorger",
    "sameAs": "https://example.com"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {"@type": "PostalAddress", "addressLocality": "München", "addressCountry": "DE"}
  }
}
```

### 3.4 Sitemaps

**Hauptseite sitemap.xml:**
```xml
<!-- Bestehende URLs -->
<url>
  <loc>https://stromhaltig.de/</loc>
  <priority>1.0</priority>
</url>
<!-- NEU: Karriere-Seite -->
<url>
  <loc>https://stromhaltig.de/karriere</loc>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

**Jobs-Subdomain sitemap.xml:**
```xml
<!-- Separate Sitemap für Jobs -->
<url>
  <loc>https://jobs.stromhaltig.de/</loc>
  <priority>1.0</priority>
</url>
<url>
  <loc>https://jobs.stromhaltig.de/search</loc>
  <priority>0.9</priority>
</url>
<!-- + alle Job-Detailseiten -->
```

**Cross-Referenz in robots.txt:**
```txt
# Hauptseite robots.txt
Sitemap: https://stromhaltig.de/sitemap.xml
Sitemap: https://jobs.stromhaltig.de/sitemap.xml
```

### 3.5 Hreflang (falls mehrsprachig geplant)

Aktuell: Nur Deutsch → keine Hreflang-Tags nötig

Falls englische Jobs-Seite geplant:
```html
<link rel="alternate" hreflang="de" href="https://jobs.stromhaltig.de/" />
<link rel="alternate" hreflang="en" href="https://jobs.stromhaltig.de/en/" />
```

---

## 4. Content-Erweiterungen

### 4.1 Neue FAQ-Artikel (Hauptseite)

**Ziel:** Karriere-Keywords abdecken + zur Jobs-Subdomain verlinken

**Artikel-Ideen:**

1. **"Karrierechancen in der Marktkommunikation: Ein Überblick"**
   - Keywords: Marktkommunikation Karriere, Jobs Energiewirtschaft
   - Inhalt: Berufsbilder, Qualifikationen, Gehälter (allgemein)
   - CTA: "215+ aktuelle Stellenangebote ansehen" → jobs.stromhaltig.de

2. **"Welche Skills braucht man für Marktkommunikation?"**
   - Keywords: Marktkommunikation Fähigkeiten, GPKE lernen
   - Inhalt: Top 10 Skills, Lernpfade
   - CTA: "Diese Skills sind aktuell gefragt" → jobs.stromhaltig.de/dashboard#skills

3. **"Wie bereite ich mich auf ein Vorstellungsgespräch in der Energiewirtschaft vor?"**
   - Keywords: Energiewirtschaft Bewerbung, Interview Marktkommunikation
   - Inhalt: Typische Fragen, Praxistipps
   - CTA: "Mit Willi-Mako optimal vorbereiten – 7 Tage kostenlos testen"

4. **"Regionale Unterschiede im Energiemarkt: Wo sind die meisten Jobs?"**
   - Keywords: Energiewirtschaft Jobs München, Berlin Marktkommunikation
   - Inhalt: Hotspot-Analyse
   - CTA: "Interaktive Karte ansehen" → jobs.stromhaltig.de/map

**SEO-Vorteil:**
- Hauptseite rankt für informational Keywords
- Verlinkt strategisch zur Jobs-Subdomain (Link Juice + User Intent)
- User Journey: Information → Job-Suche → Anmeldung Willi-Mako

### 4.2 Whitepaper/Artikel (Hauptseite)

**Titel:** "Der Jobmarkt für Marktkommunikation 2025: Trends, Chancen, Perspektiven"

**Inhalte:**
- Executive Summary
- Marktanalyse (basierend auf jobs.stromhaltig.de-Daten)
- Top Skills 2025
- Regionale Hotspots
- Gehalts-Trends
- Handlungsempfehlungen für Arbeitssuchende
- "Wie Willi-Mako Ihre Karriere beschleunigt"

**Format:**
- PDF-Download (Lead-Generierung)
- Webversion unter /whitepaper/jobmarkt-marktkommunikation-2025

**SEO-Vorteil:**
- Backlink-Magnet (branchenrelevant)
- E-Mail-Adressen sammeln
- Thought Leadership

### 4.3 Blog-Serie (optional)

**Titel:** "Karriere-Spotlights: Berufsbilder in der Energiewirtschaft"

**Frequenz:** 1x monatlich

**Themen:**
- Bilanzkreismanager: Aufgaben, Skills, Gehalt
- GPKE-Spezialist: Ein Tag im Leben von...
- Energiedatenmanagement: Karriereweg und Chancen

**Integration:**
- Blog auf Hauptseite (/blog oder /wissen/artikel)
- Jeder Artikel verlinkt zu relevanten Jobs auf Subdomain
- Social-Media-Promotion

---

## 5. Link-Building-Strategie

### 5.1 Interne Verlinkung (Hauptseite)

**Regel:** Jede relevante Seite verlinkt zur Karriere-Landing-Page

**Umsetzung:**
- FAQ-Artikel: Kontextuelle Links (z.B. "Erfahren Sie mehr über Karrierechancen in diesem Bereich")
- Sidebar-Widget auf /wissen: "💼 Aktuelle Jobs für dieses Thema"
- Community-Posts: Auto-Linking zu Jobs bei Erwähnung von "Job", "Karriere", "Stellenangebot"

**Tool:** Automated Internal Linking (ähnlich wie FAQ-Linking-Service)

### 5.2 Externe Verlinkung (Jobs-Subdomain)

**Ziel:** Backlinks für jobs.stromhaltig.de gewinnen

**Strategien:**

1. **Partner-Websites:**
   - Energieversorger-Websites: "Powered by Willi-Mako" Badge → jobs.stromhaltig.de
   - HR-Plattformen: Kooperationen für Nischen-Jobmarkt

2. **Branchenverzeichnisse:**
   - Energie-Jobs.de (falls existent)
   - BDEW-Karriere-Portal
   - Energiekarriere.de

3. **Content-Marketing:**
   - Gastbeiträge auf Branchenblogs → Backlink zu Jobs-Subdomain
   - LinkedIn-Artikel mit Link zu Hotspot-Karte

4. **PR & Medien:**
   - Pressemitteilung: "Erste KI-gestützte Job-Plattform für Marktkommunikation"
   - Fachzeitschriften: Artikel über Jobmarkt-Trends (Daten von jobs.stromhaltig.de)

### 5.3 Social Media

**Plattformen:** LinkedIn (primär), Xing, Twitter/X

**Content-Strategie:**
- Wöchentlicher Post: "Top 3 Jobs der Woche" → jobs.stromhaltig.de
- Monatlicher Post: "Trend des Monats" (Skills-Radar Screenshot) → jobs.stromhaltig.de/dashboard
- Community-Engagement: Kommentare auf Karriere-Posts → Link zu Willi-Mako

---

## 6. Analytics & KPIs

### 6.1 Traffic-Flow-Tracking

**Google Analytics (oder Alternative):**

1. **Cross-Domain-Tracking:**
   - Setup: `linker` in gtag.js für jobs.stromhaltig.de ↔ stromhaltig.de
   - Ziel: Session-Kontinuität über Domains hinweg

2. **UTM-Parameter:**
   - Links von Hauptseite → Jobs: `?utm_source=stromhaltig&utm_medium=website&utm_campaign=karriere_integration`
   - Links von Jobs → Hauptseite: `?utm_source=jobs&utm_medium=subdomain&utm_campaign=convert_to_user`

3. **Conversion-Tracking:**
   - Ereignis: "Job-Klick von Karriere-Seite"
   - Ereignis: "Registrierung nach Job-Besuch"
   - Ereignis: "7-Tage-Test-Start (von Jobs kommend)"

### 6.2 SEO-KPIs

**Hauptseite:**
- Organic Traffic für `/karriere`: Ziel +500%/Monat nach 6 Monaten
- Keyword-Rankings: "Marktkommunikation Karriere", "Energiewirtschaft Jobs" (informational)
- Backlinks zu `/karriere`: Ziel 20+ im ersten Jahr

**Jobs-Subdomain:**
- Organic Traffic: Ziel +1000 Besucher/Monat
- Keyword-Rankings: "Marktkommunikation Jobs", "GPKE Spezialist Stellenangebot" (transactional)
- Click-Through-Rate zu Hauptseite: Ziel 15%

**Cross-Domain:**
- User Journey: Jobs → Hauptseite → Registrierung: Ziel Conversion-Rate 5%
- Returning Visitors von Jobs auf Hauptseite: Ziel 30%

### 6.3 Dashboard (Monitoring)

**Tools:**
- Google Search Console (beide Domains)
- Ahrefs/SEMrush (Keyword-Tracking, Backlink-Monitoring)
- Google Analytics (Traffic-Flow, Conversions)
- Custom Dashboard (z.B. Looker Studio)

**Metriken:**
- Wöchentlich: Traffic, Keyword-Rankings
- Monatlich: Backlinks, Conversion-Rates
- Quartalsweise: ROI-Analyse

---

## 7. Implementierungs-Roadmap

### Phase 1: Grundlagen (Monat 1-2)

**Woche 1-2:**
- ✅ Karriere-Landing-Page `/karriere` erstellen
- ✅ Navigation/Footer anpassen
- ✅ Cross-Domain-Tracking einrichten

**Woche 3-4:**
- ✅ Homepage Karriere-Sektion hinzufügen
- ✅ Erste 3 Karriere-FAQ-Artikel veröffentlichen
- ✅ Links von Jobs-Subdomain zur Hauptseite hinzufügen

**Woche 5-8:**
- ✅ Structured Data implementieren (beide Domains)
- ✅ Sitemaps aktualisieren
- ✅ robots.txt optimieren
- ✅ Canonical Tags prüfen

### Phase 2: Content-Erweiterung (Monat 3-4)

**Woche 9-12:**
- ✅ Weitere 5-7 Karriere-FAQ-Artikel
- ✅ Whitepaper "Jobmarkt Marktkommunikation 2025" erstellen
- ✅ Interne Verlinkung optimieren (Automated Linking)

**Woche 13-16:**
- ✅ Blog-Serie starten (falls gewünscht)
- ✅ Social-Media-Content-Plan implementieren
- ✅ Erste PR-Maßnahmen (Pressemitteilung)

### Phase 3: Link-Building & Optimierung (Monat 5-6)

**Woche 17-20:**
- ✅ Gastbeiträge auf Branchenblogs
- ✅ Branchenverzeichnisse eintragen
- ✅ Partner-Kooperationen aufbauen

**Woche 21-24:**
- ✅ A/B-Tests (CTAs, Anchor-Texte)
- ✅ Performance-Analyse
- ✅ Iterative Optimierungen basierend auf Daten

### Phase 4: Skalierung (Monat 7+)

- ✅ Evergreen Content Refresh (FAQ-Updates)
- ✅ Erweiterte Features (z.B. Job-Alerts auf Hauptseite)
- ✅ Internationale Expansion (falls geplant)
- ✅ Paid Advertising (Google Ads für Top-Keywords)

---

## 8. Risiken & Mitigation

### Risiko 1: Duplicate Content

**Problem:** Karriere-Inhalte auf beiden Domains könnten als Duplikat gewertet werden

**Mitigation:**
- ✅ Klare Content-Differenzierung (siehe Säule 3)
- ✅ Canonical Tags korrekt setzen
- ✅ Hauptseite zeigt nur Auszüge/Teaser, nie vollständige Job-Listings

### Risiko 2: Verwässerung der Domain Authority

**Problem:** Link Juice wird zwischen Domains aufgeteilt

**Mitigation:**
- ✅ Strategisches Dofollow-Linking (nicht alle Links nofollow)
- ✅ Hauptseite bleibt primäre Autorität (Jobs-Subdomain supportiv)
- ✅ Externes Link-Building für beide Domains

### Risiko 3: User Confusion

**Problem:** Nutzer verstehen nicht, warum es zwei Domains gibt

**Mitigation:**
- ✅ Klares Branding: "Powered by Willi-Mako" auf Jobs-Subdomain
- ✅ Konsistentes Design (Logo, Farben, Fonts)
- ✅ Breadcrumb-Navigation zeigt Domain-Kontext

### Risiko 4: Conversion-Drop bei Domain-Wechsel

**Problem:** Nutzer springen ab, wenn sie von jobs.stromhaltig.de zu stromhaltig.de wechseln

**Mitigation:**
- ✅ Smooth Transition (ähnliches Design)
- ✅ Klare Value Proposition beim Übergang
- ✅ Retargeting-Kampagnen (falls Budget vorhanden)

---

## 9. Budget & Ressourcen

### 9.1 Entwicklung

**Geschätzte Aufwände:**
- Karriere-Landing-Page: 16-24 Std (inkl. Design, Content, SEO)
- Homepage-Integration: 8 Std
- Navigation/Footer: 4 Std
- Structured Data: 8 Std
- Cross-Domain-Tracking: 4 Std
- **Gesamt Phase 1:** ~40-48 Std

**Phase 2-4:** ~80-120 Std (Content-Erstellung, Optimierungen)

### 9.2 Content-Erstellung

- Karriere-FAQ-Artikel (10 Artikel): 20-30 Std
- Whitepaper: 24-40 Std (inkl. Datenanalyse, Design)
- Blog-Serie (12 Artikel/Jahr): 48-72 Std
- **Gesamt Jahr 1:** ~92-142 Std

### 9.3 Marketing

- Social Media Management: 4 Std/Monat (48 Std/Jahr)
- PR/Outreach: 8 Std/Monat (96 Std/Jahr)
- SEO-Monitoring & Reporting: 4 Std/Monat (48 Std/Jahr)
- **Gesamt Jahr 1:** ~192 Std

### 9.4 Tools

- Google Analytics: Kostenlos
- Google Search Console: Kostenlos
- Ahrefs/SEMrush: ~€100-200/Monat (optional, aber empfohlen)
- Looker Studio: Kostenlos
- **Gesamt Jahr 1:** ~€1.200-2.400

---

## 10. Erfolgsmessung

### 10.1 Kurzfristig (3 Monate)

- ✅ Karriere-Landing-Page live und indexiert
- ✅ 500+ organische Besucher/Monat auf `/karriere`
- ✅ 10+ Karriere-FAQ-Artikel veröffentlicht
- ✅ 5% CTR von Karriere-Seite zu Jobs-Subdomain
- ✅ 2% Conversion-Rate von Jobs-Subdomain zu Hauptseite (Registrierung)

### 10.2 Mittelfristig (6 Monate)

- ✅ 2.000+ organische Besucher/Monat auf `/karriere`
- ✅ Top 10 Rankings für 3-5 Karriere-Keywords
- ✅ 20+ Backlinks zu Karriere-Seite
- ✅ 10% CTR von Karriere-Seite zu Jobs-Subdomain
- ✅ 5% Conversion-Rate von Jobs-Subdomain zu Hauptseite

### 10.3 Langfristig (12 Monate)

- ✅ 5.000+ organische Besucher/Monat auf `/karriere`
- ✅ Top 3 Rankings für 5-10 Karriere-Keywords
- ✅ 50+ Backlinks zu Karriere-Seite
- ✅ 15% CTR von Karriere-Seite zu Jobs-Subdomain
- ✅ 10% Conversion-Rate von Jobs-Subdomain zu Hauptseite
- ✅ ROI: 300%+ (gemessen an zusätzlichen Registrierungen)

---

## 11. Nächste Schritte

### Sofort (diese Woche):
1. ✅ **Stakeholder-Approval:** Plan mit Team/Management besprechen
2. ✅ **Content-Audit:** Bestehende Jobs-Daten analysieren (Skills, Trends, Hotspots)
3. ✅ **Design-Konzept:** Wireframes für Karriere-Landing-Page erstellen

### Woche 1:
4. ✅ **Entwicklung starten:** Karriere-Landing-Page (Next.js)
5. ✅ **Content schreiben:** Karriere-Seite Texte + erste 3 FAQ-Artikel
6. ✅ **Analytics-Setup:** Cross-Domain-Tracking konfigurieren

### Woche 2-4:
7. ✅ **Deployment:** Karriere-Seite + Homepage-Integration live
8. ✅ **SEO-Optimierung:** Meta-Tags, Structured Data, Sitemaps
9. ✅ **Erste PR-Maßnahme:** Pressemitteilung vorbereiten

### Monat 2+:
10. ✅ **Monitoring & Iteration:** Wöchentliche Analytics-Reviews
11. ✅ **Content-Pipeline:** Weitere FAQ/Blog-Artikel nach Plan
12. ✅ **Link-Building:** Partner-Outreach starten

---

## 12. Zusammenfassung

**Kernstrategie:**
- **Hauptseite:** Informational Content (FAQ, Karriere-Insights) → Thought Leadership
- **Jobs-Subdomain:** Transactional Content (Job-Listings, Bewerbungen) → Lead-Generierung
- **Cross-Linking:** Strategisch, kontextuell, wertvoll für Nutzer

**Einzigartiger Ansatz:**
- Nicht nur "Job-Board", sondern **Karriere-Ökosystem** (Wissen + Jobs + Tools)
- Willi-Mako als **Karriere-Beschleuniger** positionieren
- User Journey: Job-Suche → Weiterbildung → Netzwerk → Anwendung nutzen

**Erwarteter ROI:**
- **Traffic:** +300% auf Hauptseite (innerhalb 12 Monate)
- **Conversions:** +500 neue Registrierungen/Jahr aus Jobs-Traffic
- **SEO:** Top 10 Rankings für 10+ Karriere-Keywords

**Wettbewerbsvorteil:**
- Kein anderes Tool in der Energiewirtschaft kombiniert Fachwissen + Jobs so nahtlos
- KI-gestützte Features (Skills-Radar, Trends) sind Alleinstellungsmerkmal
- Community-Aspekt differenziert von reinen Job-Boards

---

## Anhang: Checkliste für Entwickler

### Frontend (Next.js)

**Neue Seiten:**
- [ ] `/karriere` (Landing-Page)
- [ ] Homepage: Karriere-Sektion hinzufügen

**Komponenten:**
- [ ] `<CareerSection />` (Homepage)
- [ ] `<CareerLandingPage />` (mit Skills-Widget, Hotspot-Teaser, CTA)
- [ ] `<JobsWidget />` (wiederverwendbar, zeigt latest Jobs)

**Navigation:**
- [ ] Top-Nav: "Karriere" Dropdown
- [ ] Footer: Karriere-Spalte

**SEO:**
- [ ] Meta-Tags für `/karriere`
- [ ] Schema.org: `WebPage` + `BreadcrumbList`
- [ ] Sitemap-Update (automatisch via Next.js)

**Analytics:**
- [ ] Cross-Domain-Tracking (gtag.js)
- [ ] UTM-Parameter in allen Cross-Domain-Links
- [ ] Event-Tracking: "Job-Klick", "Registrierung nach Job-Besuch"

### Backend (falls API nötig)

**Endpunkte:**
- [ ] `GET /api/jobs/latest` (cached, 6-10 neueste Jobs von Subdomain)
- [ ] `GET /api/jobs/stats` (Skills-Radar Top 3, Hotspot Top 3)

**Datenquellen:**
- [ ] Jobs-Subdomain API (falls vorhanden)
- [ ] ODER: Static JSON Export von Subdomain

### Jobs-Subdomain

**Neue Inhalte:**
- [ ] Homepage: "Powered by Willi-Mako" prominent
- [ ] Homepage: CTA-Sektion "Bereiten Sie sich optimal vor"
- [ ] Dashboard: Banner "Lernen Sie mit Willi-Mako"
- [ ] Footer: Link zu stromhaltig.de/karriere

**Analytics:**
- [ ] Cross-Domain-Tracking
- [ ] Event-Tracking: "CTA-Klick zu Hauptseite"

### Content (Marketing/Redaktion)

**Sofort:**
- [ ] Karriere-Landing-Page Texte (siehe Abschnitt 2.1)
- [ ] Homepage Karriere-Sektion Texte

**Woche 1-2:**
- [ ] FAQ 1: "Karrierechancen in der Marktkommunikation"
- [ ] FAQ 2: "Welche Skills braucht man für Marktkommunikation?"
- [ ] FAQ 3: "Vorstellungsgespräch Energiewirtschaft vorbereiten"

**Monat 2:**
- [ ] Whitepaper: "Jobmarkt Marktkommunikation 2025" (PDF + Web)
- [ ] Pressemitteilung: "Willi-Mako launcht Karriere-Portal"

**Laufend:**
- [ ] Monatlicher Blog-Artikel (Karriere-Spotlights)
- [ ] Wöchentlicher Social-Media-Post (LinkedIn)

---

**Erstellt von:** GitHub Copilot Agent  
**Version:** 1.0  
**Letzte Aktualisierung:** 5. Oktober 2025  
**Status:** ✅ Bereit zur Umsetzung

