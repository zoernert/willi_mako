# Content-Strategie Implementierungsplan
## Willi-Mako Conversion-Optimierung 2025

**Erstellt:** 6. November 2025  
**Status:** 🟡 In Planung  
**Verantwortlich:** Entwicklungsteam  
**Tracking:** Plausible Analytics + Todo-Liste

---

## 📊 Baseline Metrics (vor Implementierung)

**Zeitraum:** 7 Tage (aktuell)
- **Unique Visitors:** ~200
- **Pageviews:** ~400
- **Bounce Rate:** 70-100%
- **Conversion Rate:** 0%
- **Whitepaper Downloads:** 3
- **Kostenlose Tests:** 2
- **Zahlende Kunden:** 0

**Ziel nach 60 Tagen:**
- Traffic: +100% (400+ UV/Woche)
- Bounce Rate: 50-60% (-20pp)
- Conversion Rate: 2% (8 Trials/Woche)
- Email-Liste: 50+ Leads
- Zahlende Kunden: 1-3

---

## 🎯 Verfügbare Assets & Integration

### ✅ Bereits implementiert
1. **Lead-Generierung:**
   - Whitepaper-Download-Formular (`/src/pages/whitepaper/[slug].tsx`)
   - Email-Service (`/src/services/emailService.ts`)
   - Automatische Lead-Mails an `dev@stromdao.com`
   - Service-Mail an Interessenten mit PDF-Link

2. **Training-Platform:**
   - Live unter `https://training.stromhaltig.de/`
   - Doorway-Page unter `/training`
   - Kurse: Marktkommunikation Kompakt, Bilanzkreismanagement, EDIFACT Deep Dive

3. **Analytics:**
   - Plausible Analytics (domain: stromhaltig.de)
   - Script: `https://stats.corrently.cloud/js/script.js`
   - Bisher keine Custom Goals definiert

4. **AI/Content-Services:**
   - Willi-Mako MCP Service (technische Inhalte)
   - Gemini/Mistral Integration (für Diagramme/Visuals)
   - Email-Automatisierung

### 🔄 Zu nutzen/erweitern
- Training-Platform als Conversion-Brücke
- Whitepaper-Lead-System für weitere Magnets
- MCP Service für technische Content-Erstellung
- Email-Service für Nurturing-Serie

---

## 📈 Tracking & Success Measurement Setup

### Phase 0: Plausible Goals einrichten (Tag 1, 2h)

**✅ Aktive Goals in Plausible (Stand: 7. November 2025):**

```javascript
// Event-based Goals (tracked via plausible())

1. CTA-Klicks (5 Goals):
   ✅ "cta_article_top" (CTA am Artikelanfang)
   ✅ "cta_article_middle" (CTA in Artikelmitte)
   ✅ "cta_article_bottom" (CTA am Artikelende)
   ✅ "cta_app_register" (Registrierungs-CTA)
   ✅ "cta_training_link" (Link zu Training-Platform)

2. Conversions (4 Goals):
   ✅ "whitepaper_download" (Lead-Formular abgeschickt)
   ✅ "app_trial_started" (14-Tage-Test begonnen)
   ✅ "contact_form_submitted" (Kontaktformular)
   ✅ "training_clicked" (Weiterleitung zu training.stromhaltig.de)

3. Content Engagement (3 Goals):
   ✅ "article_read_complete" (Artikel zu >80% gescrollt)
   ✅ "internal_link_clicked" (Verwandte Artikel)
   ✅ "tool_used" (MALO-ID-Checker o.ä.)

4. Funnel Steps (3 Goals):
   ✅ "funnel_awareness" (Fachartikel gelesen)
   ✅ "funnel_consideration" (App-Seite besucht)
   ✅ "funnel_decision" (Registrierung/Download)

5. Exit-Intent & Email (6 Goals):
   ✅ "exit_intent_shown" (Exit-Intent-Popup angezeigt)
   ✅ "exit_intent_converted" (Exit-Intent Lead erfasst)
   ✅ "exit_intent_dismissed" (Popup geschlossen)
   ✅ "email_nurturing_sent" (Nurturing-Email versendet)
   ✅ "email_opened" (Email geöffnet)
   ✅ "email_clicked" (Link in Email geklickt)

6. A/B Testing (1 Goal):
   ✅ "ab_test_assigned" (User einer Test-Variante zugewiesen)

7. Page Goals / URL-based (3 Goals):
   ✅ Visit /app/register (Registration Page erreicht)
   ✅ Visit /whitepaper/* (Whitepaper-Seiten)
   ✅ Visit /training (Training-Seite)

GESAMT: 25 Custom Goals aktiv in Plausible
```

**Implementierung im Code:**

```tsx
// Utility-Funktion für Tracking
// /lib/analytics.ts (neu erstellen)
export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, { props });
  }
};

// Beispiel-Verwendung in Komponenten:
onClick={() => {
  trackEvent('cta_article_top', { 
    article: article.slug,
    position: 'top'
  });
  router.push('/app/register');
}}
```

**Tasks:**
- [x] Plausible Dashboard: 25 Goals angelegt ✅
- [x] `/lib/analytics.ts` erstellt ✅
- [x] TypeScript-Typ für window.plausible erweitert ✅
- [ ] Test-Events feuern und in Plausible verifizieren

**Erfolgsmetrik:** ✅ Alle 25 Goals sind in Plausible aktiv (Stand: 7. Nov 2025)

---

## 🚀 Implementierungsphasen

### Phase 1: Foundation & Quick Wins (Woche 1)

#### 1.1 App-Landing-Page drastisch verbessern (Tag 1-2, 8h)

**Problem:** `/app/` hat nur 5 Google-Impressionen

**Aufgaben:**
- [ ] Neue Landing Page `/src/pages/app-landing.tsx` erstellen oder `/app/index.tsx` optimieren
- [ ] Above-the-Fold mit Template aus `templates_copy_paste.md`
- [ ] Hero-Section: Nutzenversprechen + Screenshot/Video + CTA
- [ ] Social Proof: "50+ Energieversorger nutzen Willi-Mako" (wenn verfügbar)
- [ ] SEO optimieren:
  - Title: "Willi-Mako: KI-Coach für Marktkommunikation | GPKE, UTILMD, EDIFACT automatisiert"
  - Meta-Description: "Spare 70% Zeit bei GPKE-Prozessen. Willi-Mako erklärt EDIFACT-Formate, prüft UTILMD-Nachrichten und automatisiert Marktkommunikation. Jetzt 14 Tage kostenlos testen."
- [ ] Integration mit Training-Platform: "Neu hier? → Starte mit unserem Grundlagen-Training"
- [ ] Tracking-Events einbauen: `cta_app_register`, `training_clicked`

**AI-Unterstützung:**
- Willi-Mako MCP für technische Produktbeschreibungen nutzen
- Gemini für Hero-Image/Diagramm (Prozess-Visualisierung)

**Erfolgsmetrik:** 
- App-Seite erreicht 50+ Impressionen/Woche in Google Search Console
- CTR >5% von Fachartikel zu App-Seite

**Files zu bearbeiten:**
- `/src/pages/app/index.tsx` (oder neue Datei)
- `/lib/analytics.ts` (Tracking)

---

#### 1.2 Conversion-Elemente in Top 10 Artikel (Tag 3-5, 12h)

**Artikel zu bearbeiten (Identifikation via Plausible Top Pages):**
1. REMADV-Artikel
2. Sperrprozess-Artikel
3. UTILMD-Artikel
4. GPKE-Artikel
5. APERAK Z17-Artikel
6. (weitere basierend auf Analytics-Daten)

**Pro Artikel einfügen:**

**A) Am Anfang (nach Intro):**
```tsx
<Box sx={{ 
  bgcolor: 'primary.light', 
  p: 3, 
  borderRadius: 2, 
  my: 3,
  borderLeft: '4px solid',
  borderColor: 'primary.main'
}}>
  <Typography variant="h6" gutterBottom>
    💡 Zeit sparen mit KI
  </Typography>
  <Typography variant="body1" paragraph>
    Dieser [PROZESS] dauert manuell 20-30 Minuten. Mit Willi-Mako erledigst 
    du ihn in 2 Minuten – inklusive automatischer Validierung.
  </Typography>
  <Button 
    variant="contained" 
    color="primary"
    onClick={() => {
      trackEvent('cta_article_top', { article: '[SLUG]' });
      router.push('/app/register?utm_source=artikel&utm_campaign=[SLUG]');
    }}
  >
    Jetzt 14 Tage kostenlos testen
  </Button>
</Box>
```

**B) In der Mitte (nach Hauptabschnitt):**
```tsx
<Paper sx={{ p: 3, my: 4, bgcolor: 'grey.50' }}>
  <Typography variant="h6" gutterBottom>
    📊 Praxis-Beispiel: Willi-Mako in Action
  </Typography>
  <Typography variant="body1" paragraph>
    Siehe, wie Willi-Mako diese [NACHRICHT/PROZESS] automatisch validiert 
    und häufige Fehler erkennt – bevor sie zum Problem werden.
  </Typography>
  
  {/* Screenshot oder Demo-GIF */}
  <Box sx={{ my: 2 }}>
    <Image 
      src="/screenshots/[PROZESS]-demo.png" 
      alt="Willi-Mako [PROZESS] Demo"
      width={800}
      height={450}
    />
  </Box>
  
  <Typography variant="subtitle2" component="div" gutterBottom>
    Was Willi-Mako für dich macht:
  </Typography>
  <ul>
    <li>✅ Automatische Plausibilitätsprüfung</li>
    <li>✅ Fristen-Überwachung</li>
    <li>✅ GPKE/UTILMD-Compliance-Check</li>
    <li>✅ Fehler-Früherkennung</li>
  </ul>
  
  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
    <Button 
      variant="contained"
      onClick={() => {
        trackEvent('cta_article_middle', { article: '[SLUG]' });
        router.push('/app/register');
      }}
    >
      Kostenlos testen
    </Button>
    <Button 
      variant="outlined"
      onClick={() => {
        trackEvent('training_clicked', { article: '[SLUG]' });
        window.open('https://training.stromhaltig.de/', '_blank');
      }}
    >
      Training buchen
    </Button>
  </Box>
</Paper>
```

**C) Am Ende (nach Fazit):**
```tsx
<Box sx={{ bgcolor: 'success.light', p: 4, borderRadius: 2, my: 4 }}>
  <Typography variant="h5" gutterBottom>
    ✅ Das war komplex? Lass Willi-Mako das für dich erledigen.
  </Typography>
  <Typography variant="body1" paragraph>
    Willi-Mako ist dein KI-Coach für Marktkommunikation. Er erklärt Prozesse, 
    validiert Nachrichten und automatisiert Routineaufgaben – damit du dich auf 
    das Wesentliche konzentrieren kannst.
  </Typography>
  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
    14 Tage kostenlos testen. Keine Kreditkarte nötig.
  </Typography>
  <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
    <Button 
      variant="contained" 
      size="large"
      onClick={() => {
        trackEvent('cta_article_bottom', { article: '[SLUG]', action: 'register' });
        router.push('/app/register');
      }}
    >
      Jetzt kostenlos testen
    </Button>
    <Button 
      variant="outlined" 
      size="large"
      onClick={() => {
        trackEvent('cta_article_bottom', { article: '[SLUG]', action: 'whitepaper' });
        router.push('/whitepaper');
      }}
    >
      Whitepaper herunterladen
    </Button>
    <Button 
      variant="outlined" 
      size="large"
      onClick={() => {
        trackEvent('cta_article_bottom', { article: '[SLUG]', action: 'training' });
        window.open('https://training.stromhaltig.de/', '_blank');
      }}
    >
      Training buchen
    </Button>
  </Box>
</Box>

{/* Verwandte Artikel */}
<Box sx={{ my: 4 }}>
  <Typography variant="h6" gutterBottom>
    📚 Weiterlesen
  </Typography>
  <Grid container spacing={2}>
    {relatedArticles.map(article => (
      <Grid item xs={12} md={4} key={article.slug}>
        <Card>
          <CardContent>
            <Typography variant="h6">{article.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {article.excerpt}
            </Typography>
            <Button 
              sx={{ mt: 2 }}
              onClick={() => {
                trackEvent('internal_link_clicked', { 
                  from: '[CURRENT_SLUG]',
                  to: article.slug 
                });
              }}
            >
              Weiterlesen →
            </Button>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
</Box>
```

**Komponenten erstellen:**
- [ ] `/components/ArticleCTA.tsx` (wiederverwendbar)
- [ ] `/components/RelatedArticles.tsx`
- [ ] Screenshots/Demos für 5 wichtigste Prozesse erstellen (mit Gemini)

**Erfolgsmetrik:**
- 5% der Artikel-Leser klicken auf CTA (Plausible Event)
- Bounce Rate sinkt um 10pp

---

#### 1.3 Title-Tag-Optimierung (Tag 5, 2h)

**Top 5 Artikel mit niedrigster CTR identifizieren** (via Google Search Console oder Plausible)

**Optimierungs-Schema:**
```
ALT: "REMADV im Energiemarkt: Strukturierte Zahlungsavis"
NEU: "REMADV einfach erklärt: Zahlungsavis Energiewirtschaft 2025 [+Checkliste]"

Format: [Keyword] + [Emotion/Benefit] + [Jahr] + [Bonus]
```

**Artikel:**
1. REMADV → siehe oben
2. Sperrprozess → "Sperrprozess Strom & Gas: NB-Leitfaden 2025 [+Checkliste]"
3. UTILMD → "UTILMD erklärt: EDIFACT-Stammdaten im Energiemarkt [2025]"
4. GPKE → "GPKE einfach erklärt: Geschäftsprozesse Strommarkt [Praxis-Guide]"
5. APERAK Z17 → "APERAK Z17 Fehler beheben: 5-Schritte-Anleitung [2025]"

**Implementierung:**
- [ ] Title-Tags in Artikel-Frontmatter aktualisieren
- [ ] Meta-Descriptions erweitern (150-160 Zeichen)
- [ ] Canonical URLs prüfen

**Erfolgsmetrik:**
- CTR steigt von 2% auf 8-12% (innerhalb 4 Wochen)

---

### Phase 2: Lead-Generierung & Nurturing (Woche 2)

#### 2.1 Drei neue Lead-Magnets erstellen (Tag 6-10, 16h)

**Lead-Magnet 1: GPKE-Fristen-Checkliste 2025**

**Content-Erstellung mit Willi-Mako MCP:**
```typescript
// Prompt für Willi-Mako MCP
const checklistContent = await mcp_willi_mako_chat({
  message: `Erstelle eine umfassende GPKE-Fristen-Checkliste für 2025. 
  Enthalte: 
  - Alle wichtigen Prozesse (Lieferantenwechsel, EoG, Sperrung, etc.)
  - Fristen mit Kalendertag-Angaben
  - Verantwortlichkeiten (NB, MSB, LF)
  - Häufige Fehlerquellen
  - Praxis-Tipps
  
  Format: Strukturiert für PDF-Export, 8-12 Seiten`,
  sessionId: 'gpke-checklist-generation'
});
```

**Landing Page: `/src/pages/checkliste/gpke-fristen.tsx`**
```tsx
export default function GPKEChecklistePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string}|null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/send-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          magnetType: 'gpke-fristen-checkliste',
          magnetTitle: 'GPKE-Fristen-Checkliste 2025',
          pdfPath: '/downloads/gpke-fristen-checkliste-2025.pdf'
        })
      });
      
      if (response.ok) {
        trackEvent('whitepaper_download', { magnet: 'gpke-fristen' });
        setMessage({ type: 'success', text: 'Check deine E-Mails! PDF kommt sofort.' });
        // Start Nurturing-Serie
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler. Bitte erneut versuchen.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="GPKE-Fristen-Checkliste 2025">
      {/* Hero mit Nutzenversprechen */}
      {/* Email-Formular */}
      {/* Content-Preview */}
    </Layout>
  );
}
```

**Tasks:**
- [x] Content mit Willi-Mako MCP generieren ✅
- [x] Landing Page `/checkliste/gpke-fristen` erstellt ✅
- [x] API-Endpoint `/api/send-lead-magnet` implementiert ✅
- [ ] PDF mit AI-generierten Diagrammen erstellen (Gemini) - TODO
- [ ] In relevanten Artikeln verlinken (GPKE, Lieferantenwechsel, Fristen)

**Lead-Magnet 2: EDIFACT-Spickzettel**

**Inhalt:**
- Alle wichtigen EDIFACT-Nachrichtentypen auf 2 Seiten
- UTILMD, MSCONS, ORDERS, INVOIC, REMADV, APERAK
- Struktur-Übersicht, Anwendungsfälle, Beispiele

**Tasks:**
- [ ] Content mit Willi-Mako MCP generieren
- [ ] Kompaktes 2-Seiten-PDF (Infografik-Stil)
- [ ] Landing Page `/spickzettel/edifact`
- [ ] Verlinken in EDIFACT/UTILMD-Artikeln

**Lead-Magnet 3: APERAK-Fehlercode-Guide**

**Inhalt:**
- Z17, Z19, Z20, Z42 im Detail
- Ursachen, Lösungen, Prävention
- Troubleshooting-Flowcharts (AI-generiert)

**Tasks:**
- [ ] Content mit Willi-Mako MCP
- [ ] Flowcharts mit Gemini erstellen
- [ ] Landing Page `/guide/aperak-fehler`
- [ ] Verlinken in APERAK-Artikeln

**Erfolgsmetrik:**
- 20-40 Leads/Monat über neue Magnets
- Email-Liste wächst auf 50+ in 30 Tagen

---

#### 2.2 Email-Nurturing-Serie aufsetzen (Tag 11-12, 8h)

**5-Email-Serie für Whitepaper/Lead-Magnet-Downloads**

**Email 1: Sofort (Welcome + Download-Link)**
```typescript
// /src/services/emailService.ts erweitern
async sendLeadMagnetWelcome(
  email: string, 
  magnetTitle: string, 
  downloadUrl: string
): Promise<void> {
  const html = `
    <h2>Hier ist deine ${magnetTitle}!</h2>
    <p><a href="${downloadUrl}">📥 Jetzt herunterladen</a></p>
    
    <h3>🎁 Bonus: Die 5 häufigsten GPKE-Fehler</h3>
    <p><a href="https://stromhaltig.de/wissen/artikel/gpke-fehler">Artikel lesen →</a></p>
    
    <hr>
    <p><strong>Was ist deine größte Herausforderung in der Marktkommunikation?</strong></p>
    <p>Antworte einfach auf diese Email – ich lese jede Antwort persönlich.</p>
    
    <p>P.S. Wusstest du, dass Willi-Mako automatisch alle GPKE-Fristen überwacht?<br>
    <a href="https://stromhaltig.de/app/register">→ 14 Tage kostenlos testen</a></p>
  `;
  
  await this.sendEmail({
    to: email,
    subject: `Hier ist deine ${magnetTitle} [+ Bonus]`,
    html,
    replyTo: 'support@stromhaltig.de'
  });
  
  // Tracking
  trackEvent('email_nurturing_sent', { sequence: 1, magnet: magnetTitle });
}
```

**Email 2: Tag 3 (Educational Content)**
- Betreff: "[VORNAME], hier ist der #1 Fehler bei GPKE-Prozessen"
- Content: Häufigster Fehler + Lösung
- CTA: Demo-Video ansehen

**Email 3: Tag 7 (Social Proof)**
- Betreff: "Wie [Kunde] 20h/Woche spart"
- Content: Mini-Case-Study (falls vorhanden) oder hypothetisches Beispiel
- CTA: Kostenloser 15-Min-Call

**Email 4: Tag 14 (Trial CTA)**
- Betreff: "[VORNAME], bereit für den nächsten Schritt?"
- Content: Zusammenfassung der Serie + Nutzenversprechen
- CTA: 14-Tage-Trial starten

**Email 5: Tag 21 (Last Chance)**
- Betreff: "[VORNAME], letzte Chance..."
- Content: Entweder Trial oder Newsletter-only
- CTA: Trial ODER Newsletter-Präferenz

**Implementierung:**
- [ ] Email-Templates erstellen (`/src/email-templates/nurturing/`)
- [ ] Cron-Job für verzögerte Emails (Node-Schedule oder Vercel Cron)
- [ ] Datenbank: `email_nurturing_queue` Tabelle
- [ ] Opt-out-Link in jeder Email
- [ ] Tracking: `email_opened`, `email_clicked`

**Erfolgsmetrik:**
- Open Rate >30%
- Click-Through-Rate >10%
- 5-10% konvertieren zu Trial

---

### Phase 3: Content-Whitespots füllen (Woche 3)

#### 3.1 "Marktkommunikation lernen"-Guide (Tag 13-16, 16h)

**Neue Seite: `/src/pages/lernen/marktkommunikation-grundlagen.tsx`**

**Content-Struktur (aus `templates_copy_paste.md`):**
1. Was ist Marktkommunikation? (Einsteiger-freundlich)
2. Wichtigste Begriffe (GPKE, UTILMD, EDIFACT, etc.)
3. 4-Wochen-Lernplan mit Checkboxen
4. Integration mit Willi-Mako ("Lerne mit KI-Coach")
5. Integration mit Training-Platform (Links zu Kursen)
6. Downloadables (Checklisten, Glossar)

**Content-Generierung:**
```typescript
// Willi-Mako MCP für fachlichen Inhalt
const guideContent = await mcp_willi_mako_chat({
  message: `Erstelle einen anfängerfreundlichen Guide "Marktkommunikation lernen" mit:
  - Einfache Erklärung für Quereinsteiger
  - Wichtigste Begriffe (GPKE, UTILMD, EDIFACT, Marktrollen)
  - 4-Wochen-Lernplan (Woche 1: Grundlagen, Woche 2: GPKE, Woche 3: EDIFACT, Woche 4: Praxis)
  - Praxis-Beispiele
  - FAQ für Einsteiger
  
  Zielgruppe: Junior-Mitarbeiter, Quereinsteiger ohne Vorkenntnisse`,
  sessionId: 'learning-guide-generation'
});
```

**Interaktive Elemente:**
- [ ] Progress-Tracker (Checkbox-Liste für 4-Wochen-Plan)
- [ ] Embedded Quiz (kleine Wissenstests)
- [ ] "Stelle deine Frage an Willi-Mako"-Widget
- [ ] Training-Kurs-Empfehlungen basierend auf Fortschritt

**SEO:**
- Title: "Marktkommunikation lernen: Kompletter Einsteiger-Guide 2025"
- Meta: "Lerne Marktkommunikation in 4 Wochen: GPKE, UTILMD, EDIFACT. Für Quereinsteiger & Junior-Mitarbeiter. Mit Lernplan, Quiz & KI-Coach. ✓ Kostenlos"
- Keywords: "marktkommunikation lernen", "gpke für anfänger", "energiewirtschaft einstieg"

**Tasks:**
- [ ] Content mit Willi-Mako MCP generieren
- [ ] Interactive Components bauen
- [ ] Diagramme/Infografiken mit Gemini
- [ ] Quiz-Funktion (optional: mit Gamification-System verbinden)
- [ ] CTA zu Trial + Training-Kursen

**Erfolgsmetrik:**
- 100-200 neue Visitors/Monat (neue Zielgruppe)
- 10% konvertieren zu Email-Liste
- 5% klicken auf Training-Links

---

#### 3.2 APERAK-Troubleshooting-Serie (Tag 17-19, 12h)

**4 neue Artikel:**
1. "APERAK Z17 Fehler beheben: 5-Schritte-Anleitung [2025]"
2. "APERAK Z19 lösen: Zuordnungsfehler MaLo/MeLo beheben"
3. "APERAK Z20 Fehlercode: Ursachen & Lösungen [Praxisleitfaden]"
4. "APERAK Z42: Dateninkonsistenz erkennen und vermeiden"

**Content-Template pro Artikel:**
```markdown
# [APERAK-Code] Fehler beheben: [Lösung] [Jahr]

## TL;DR
- Was ist [CODE]?
- Häufigste Ursache
- 5-Schritte-Lösung
- Prävention

## Was ist APERAK [CODE]?
[Willi-Mako MCP: Technische Erklärung in einfacher Sprache]

## Wann tritt dieser Fehler auf?
[Reale Szenarien, Beispiele]

## 5-Schritte-Lösung
1. Schritt 1: [...]
2. Schritt 2: [...]
(mit Screenshots/Diagrammen)

## Wie du den Fehler vermeidest
[Präventive Maßnahmen]

## Willi-Mako hilft automatisch
[Wie die App diesen Fehler erkennt/behebt]
[CTA: Kostenlos testen]

## Verwandte Fehler
[Links zu anderen APERAK-Artikeln]
```

**Tasks pro Artikel:**
- [ ] Content mit Willi-Mako MCP generieren
- [ ] Flowchart/Diagramm mit Gemini erstellen
- [ ] Conversion-CTAs einbauen (3 pro Artikel)
- [ ] Interne Verlinkung (APERAK-Serie untereinander)
- [ ] SEO: Title + Meta optimieren

**Erfolgsmetrik:**
- Alle APERAK-Keywords (z17, z19, z20, z42) auf Position 1-5
- 5% der Leser klicken auf CTA

---

### Phase 4: Advanced Conversion & Tools (Woche 4)

#### 4.1 Interaktiver GPKE-Fristenrechner (Tag 20-23, 20h)

**Tool: `/src/pages/tools/gpke-fristenrechner.tsx`**

**Features:**
- Input: Prozesstyp (Lieferantenwechsel, EoG, etc.)
- Input: Startdatum
- Output: Alle relevanten Fristen mit Countdown
- Export als iCal/PDF
- "Automatisiere mit Willi-Mako"-CTA

**Backend:**
```typescript
// /src/pages/api/tools/calculate-gpke-deadlines.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { processType, startDate } = req.body;
  
  // Willi-Mako MCP für Fristen-Logik
  const deadlines = await mcp_willi_mako_chat({
    message: `Berechne alle GPKE-Fristen für ${processType} ab ${startDate}. 
    Gib zurück: Fristname, Kalendertag, Verantwortlicher, Beschreibung.`,
    sessionId: 'fristen-calculation'
  });
  
  // Parse & return structured data
  res.json({ deadlines: parseDeadlines(deadlines) });
}
```

**Frontend:**
```tsx
export default function GPKEFristenrechner() {
  const [processType, setProcessType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    trackEvent('tool_used', { tool: 'gpke-fristenrechner', processType });
    
    const response = await fetch('/api/tools/calculate-gpke-deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processType, startDate })
    });
    
    const data = await response.json();
    setDeadlines(data.deadlines);
    setLoading(false);
  };

  return (
    <Layout title="GPKE-Fristenrechner">
      {/* Tool UI */}
      {/* Results mit Countdown */}
      {/* CTA: "Mit Willi-Mako automatisieren" */}
    </Layout>
  );
}
```

**Tasks:**
- [ ] UI/UX Design
- [ ] Backend-Logik (Willi-Mako MCP Integration)
- [ ] Export-Funktionen (iCal, PDF)
- [ ] Mobile Optimierung
- [ ] SEO: "gpke fristenrechner", "gpke fristen berechnen"
- [ ] Promote in GPKE-Artikeln

**Erfolgsmetrik:**
- 50+ Tool-Nutzungen/Monat
- 15% der Nutzer klicken auf CTA

---

#### 4.2 MALO-ID-Checker prominent featuren (Tag 24, 4h)

**Aktuell:** `/app/code-lookup` existiert bereits, aber unsichtbar

**Tasks:**
- [ ] Dedizierte Landing Page `/tools/malo-id-checker`
- [ ] Widget auf Homepage einbetten
- [ ] Verlinken in allen relevanten Artikeln (MaLo, UTILMD, etc.)
- [ ] SEO optimieren
- [ ] Tracking: `tool_used` Event

**Erfolgsmetrik:**
- 100+ Nutzungen/Monat
- Tool erscheint in Google für "malo id prüfen"

---

#### 4.3 Exit-Intent-Popup (Tag 25, 4h)

**Implementierung:**
```tsx
// /components/ExitIntentPopup.tsx
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, Button, Typography, TextField } from '@mui/material';

export default function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let exitIntentTriggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 50 && !exitIntentTriggered) {
        exitIntentTriggered = true;
        setOpen(true);
        trackEvent('exit_intent_shown');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  const handleSubmit = async () => {
    // Lead-Magnet Download triggern
    trackEvent('exit_intent_converted');
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogContent>
        <Typography variant="h5" gutterBottom>
          ⏸️ Moment noch!
        </Typography>
        <Typography variant="body1" paragraph>
          Bevor du gehst – hol dir unsere <strong>GPKE-Fristen-Checkliste 2025</strong> kostenlos!
        </Typography>
        
        <TextField
          fullWidth
          type="email"
          label="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ my: 2 }}
        />
        
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          onClick={handleSubmit}
        >
          Kostenlos herunterladen
        </Button>
        
        <Button 
          variant="text" 
          fullWidth 
          sx={{ mt: 1 }}
          onClick={() => {
            trackEvent('exit_intent_dismissed');
            setOpen(false);
          }}
        >
          Nein danke, ich komme später wieder
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration:**
```tsx
// /src/pages/_app.tsx
import ExitIntentPopup from '../components/ExitIntentPopup';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ExitIntentPopup />
    </>
  );
}
```

**Tasks:**
- [ ] Komponente erstellen
- [ ] A/B-Test: mit vs. ohne Popup (unterschiedliche User-Cohorts)
- [ ] Cookie setzen (nur 1x alle 30 Tage zeigen)
- [ ] Mobile: anders triggern (Scroll-basiert statt mouseleave)

**Erfolgsmetrik:**
- 10-15% Conversion-Rate bei Exit-Intent
- Zusätzliche 10-20 Leads/Monat

---

### Phase 5: Optimization & Scaling (Woche 5+)

#### 5.1 A/B-Tests einrichten (Tag 26-28, 8h)

**Test-Szenarien:**

**Test 1: CTA-Position in Artikeln**
- Variante A: CTA nur am Ende
- Variante B: CTA oben, Mitte, Ende
- Metrik: Click-Through-Rate

**Test 2: App-Seite Hero**
- Variante A: Screenshot
- Variante B: Demo-Video
- Metrik: Trial-Conversion

**Test 3: Email-Subject-Lines**
- Variante A: "Hier ist deine GPKE-Checkliste"
- Variante B: "[VORNAME], deine GPKE-Checkliste wartet 📥"
- Metrik: Open Rate

**Implementierung:**
```tsx
// /lib/ab-testing.ts
export const getVariant = (testName: string): 'A' | 'B' => {
  if (typeof window === 'undefined') return 'A';
  
  const stored = localStorage.getItem(`ab_${testName}`);
  if (stored) return stored as 'A' | 'B';
  
  const variant = Math.random() > 0.5 ? 'A' : 'B';
  localStorage.setItem(`ab_${testName}`, variant);
  
  trackEvent('ab_test_assigned', { test: testName, variant });
  return variant;
};

// Verwendung:
const ctaVariant = getVariant('article_cta_position');
```

**Tasks:**
- [ ] A/B-Testing-Library einrichten
- [ ] 3 Tests definieren
- [ ] Tracking in Plausible
- [ ] Nach 2 Wochen: Auswertung & Winner implementieren

**Erfolgsmetrik:**
- 20%+ Verbesserung durch Winner-Variante

---

#### 5.2 Homepage-Optimierung (Tag 29-30, 8h)

**Aktuell:** 49 Eintritte, 76% Bounce Rate

**Optimierungen:**
- [ ] Above-the-Fold: Hero mit klarem Value Proposition
- [ ] Video/GIF: 30 Sek Willi-Mako in Action
- [ ] 3 Key Benefits (Icons + Kurzbeschreibung)
- [ ] Social Proof: "50+ Energieversorger", Testimonials (falls vorhanden)
- [ ] CTA: "14 Tage kostenlos testen" (groß, prominent)
- [ ] Featured Tools: MALO-Checker, GPKE-Rechner (embedded)
- [ ] Blog-Preview: Top 3 Artikel
- [ ] Training-Integration: "Neu? → Starte mit Grundlagen-Kurs"

**Template:** Siehe `templates_copy_paste.md` → "Homepage Above-the-Fold Template"

**Tasks:**
- [ ] Redesign Hero-Section
- [ ] Video/Animation erstellen (mit Gemini)
- [ ] Social Proof sammeln (Testimonials anfragen?)
- [ ] Featured Tools einbetten
- [ ] Mobile Optimierung

**Erfolgsmetrik:**
- Bounce Rate <60% (-16pp)
- 5% konvertieren zu Trial oder Lead

---

## 📊 Tracking Dashboard Setup

**Plausible Custom Dashboard erstellen:**

### KPIs täglich monitoren:
1. **Traffic:**
   - Unique Visitors
   - Pageviews
   - Top Pages

2. **Funnel:**
   - Fachartikel → App-Seite (% Klickrate)
   - App-Seite → Registrierung (% Conversion)
   - Registrierung → Aktivierung (% Activation)

3. **Conversions:**
   - Whitepaper Downloads (Goal: `whitepaper_download`)
   - App Trials (Goal: `app_trial_started`)
   - Training Clicks (Goal: `training_clicked`)

4. **Content Engagement:**
   - Artikel gelesen >80% (Goal: `article_read_complete`)
   - Tool-Nutzungen (Goal: `tool_used`)
   - Interne Links (Goal: `internal_link_clicked`)

5. **Email Performance:**
   - Nurturing-Serie: Opens, Clicks (via separate Email-Analytics)

**Wöchentlicher Report:**
```markdown
# Wöchentlicher Strategie-Report KW [XX]

## Traffic
- UV: [XXX] (+/-X% vs. Vorwoche)
- PV: [XXX]

## Conversions
- Whitepaper Downloads: [XX] (Goal: 10+)
- App Trials: [XX] (Goal: 5+)
- Email-Liste: [XX] neue Leads

## Top-Performer
- Meistgelesener Artikel: [...]
- Beste CTA-Position: [...]
- Erfolgreichstes Tool: [...]

## Nächste Woche
- [ ] A/B-Test [X] auswerten
- [ ] Artikel [Y] optimieren
- [ ] ...
```

---

## 🔄 Fortschritts-Tracking im Plan

### Wie Fortschritt dokumentiert wird:

**1. Dieses Dokument:**
- Checkboxen für jede Task
- Status-Updates inline (✅ Erledigt, 🔄 In Arbeit, ⏸️ Blockiert)
- Erfolgsmetriken nach Abschluss ergänzen

**2. Todo-Liste-Tool:**
- GitHub Copilot `manage_todo_list` für aktive Tasks
- Status: `not-started`, `in-progress`, `completed`

**3. Git Commits:**
- Conventional Commits: `feat(strategy): Implement article CTAs for REMADV`
- Branch: `strategy/phase-1` etc.

**4. Wöchentliches Review:**
- Jeden Montag: Fortschritt evaluieren
- Metriken aus Plausible ziehen
- Nächste Woche planen

**5. Changelog:**
```markdown
## Changelog

### 2025-11-06: Plan erstellt
- Initiale Strategie dokumentiert
- Phasen 1-5 definiert
- Tracking Setup spezifiziert

### 2025-11-XX: Phase 1 gestartet
- [ ] App-Seite optimiert
- [ ] CTAs in Top 10 Artikel
- [ ] Title-Tags aktualisiert
```

---

## ⚙️ Technische Implementierungs-Notizen

### Neue Dateien zu erstellen:

**Analytics:**
- `/lib/analytics.ts` (Plausible Event Tracking)
- `/lib/ab-testing.ts` (A/B-Test-Logik)

**Components:**
- `/components/ArticleCTA.tsx` (Artikel-Conversion-Elemente)
- `/components/RelatedArticles.tsx` (Interne Verlinkung)
- `/components/ExitIntentPopup.tsx` (Lead-Capture)
- `/components/tools/GPKEFristenrechner.tsx` (Interaktives Tool)
- `/components/tools/MALOChecker.tsx` (Wrapper für existierendes Tool)

**Pages:**
- `/src/pages/lernen/marktkommunikation-grundlagen.tsx` (Learning Guide)
- `/src/pages/checkliste/gpke-fristen.tsx` (Lead-Magnet Landing)
- `/src/pages/spickzettel/edifact.tsx` (Lead-Magnet Landing)
- `/src/pages/guide/aperak-fehler.tsx` (Lead-Magnet Landing)
- `/src/pages/tools/gpke-fristenrechner.tsx` (Interactive Tool)
- `/src/pages/tools/malo-id-checker.tsx` (Promoted Tool)
- `/src/pages/wissen/artikel/aperak-z17.tsx` (+ z19, z20, z42)

**API Routes:**
- `/src/pages/api/send-lead-magnet.ts` (Lead-Magnet-Versand)
- `/src/pages/api/tools/calculate-gpke-deadlines.ts` (Fristenrechner-Backend)
- `/src/pages/api/nurturing/schedule-emails.ts` (Email-Serie)

**Email Templates:**
- `/src/email-templates/nurturing/email-1-welcome.html`
- `/src/email-templates/nurturing/email-2-educational.html`
- `/src/email-templates/nurturing/email-3-social-proof.html`
- `/src/email-templates/nurturing/email-4-trial-cta.html`
- `/src/email-templates/nurturing/email-5-last-chance.html`

**Database:**
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

-- Lead Magnets Downloaded (Tracking)
CREATE TABLE lead_magnet_downloads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  magnet_type VARCHAR(100) NOT NULL,
  downloaded_at TIMESTAMP DEFAULT NOW(),
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100)
);
```

**Cron Jobs (Vercel Cron oder Node-Schedule):**
```typescript
// /src/cron/send-nurturing-emails.ts
import cron from 'node-cron';
import { emailService } from '../services/emailService';

// Jeden Tag um 10:00 Uhr
cron.schedule('0 10 * * *', async () => {
  const dueEmails = await getDueNurturingEmails();
  
  for (const email of dueEmails) {
    await emailService.sendNurturingEmail(email);
    await markEmailAsSent(email.id);
    trackEvent('email_nurturing_sent', { 
      sequence: email.sequence_step,
      magnet: email.magnet_type 
    });
  }
});
```

---

## 🎯 Success Criteria (60-Tage-Ziele)

### Muss erreicht werden (Must-Have):
- ✅ Traffic: +50% (300+ UV/Woche)
- ✅ Bounce Rate: <65% (-10pp)
- ✅ Email-Liste: 30+ Leads
- ✅ App Trials: 10+ (über 60 Tage)
- ✅ Plausible Goals: 15+ aktiv und trackend

### Sollte erreicht werden (Should-Have):
- 🎯 Traffic: +100% (400+ UV/Woche)
- 🎯 Bounce Rate: <60% (-15pp)
- 🎯 Conversion Rate: 1.5%
- 🎯 Email-Liste: 50+ Leads
- 🎯 Trials: 15+
- 🎯 Training-Platform: 20+ Klicks

### Stretch Goals (Nice-to-Have):
- 🚀 Traffic: +150%
- 🚀 Conversion Rate: 2%
- 🚀 Email-Liste: 80+ Leads
- 🚀 Zahlende Kunden: 1-3
- 🚀 APERAK-Keywords alle auf Position 1-3

---

## 🚨 Risiken & Mitigationen

### Risiko 1: Nicht genug Traffic für A/B-Tests
**Mitigation:** Fokus auf Quick Wins (Title-Tags, CTAs) statt komplexe Tests. Winner-Varianten aus Industry Best Practices wählen.

### Risiko 2: Email-Bounce-Rate hoch
**Mitigation:** Double-Opt-In für Nurturing-Serie (nicht für initiale Lead-Mail). Email-Validierung im Frontend.

### Risiko 3: Willi-Mako MCP Service überlastet
**Mitigation:** Content vorher generieren und cachen. Fallback auf manuelle Content-Erstellung.

### Risiko 4: Zeit-Overrun
**Mitigation:** Priorisierung strikt einhalten. Phase 1-2 sind kritisch, Phase 3-5 nice-to-have. MVP-Ansatz.

### Risiko 5: Keine zahlenden Kunden trotz Leads
**Mitigation:** Fokus auf Lead-Qualität, nicht Quantität. Follow-up-Calls für qualified Leads. Pricing/Value-Prop überprüfen.

---

## 📞 Nächste Schritte

### Sofort (heute):
1. ✅ Plan reviewen und Feedback einholen
2. [ ] Plausible Goals definieren und anlegen (2h)
3. [ ] `/lib/analytics.ts` erstellen (1h)
4. [ ] Phase 1.1 starten: App-Seite Audit

### Diese Woche (Woche 1):
- [ ] Phase 1 komplett abschließen
- [ ] Ersten Lead-Magnet vorbereiten
- [ ] Tracking verifizieren

### Nächste Woche (Woche 2):
- [ ] Phase 2: Lead-Generierung
- [ ] Email-Serie aufsetzen
- [ ] Erste Metriken evaluieren

---

## 📚 Ressourcen & Links

**Dokumentation:**
- Strategy Docs: `/docs/strategy/`
- Templates: `templates_copy_paste.md`
- Whitepaper Content: `/docs/whitepaper-content-authoring.md`

**Externe Plattformen:**
- Training: https://training.stromhaltig.de/
- Plausible Dashboard: https://stats.corrently.cloud/
- Email-Service: `/src/services/emailService.ts`

**AI-Services:**
- Willi-Mako MCP: `mcp_mcp-willi-mak_willi-mako-chat`
- Gemini (Visuals): `/src/services/gemini.ts`

**Tracking:**
- Plausible Events: Window.plausible()
- Custom Goals: Siehe "Tracking Setup" oben

---

## ✅ Completion Checklist

### Phase 1: Foundation (Woche 1)
- [ ] 1.1 App-Seite optimiert (8h)
- [ ] 1.2 CTAs in Top 10 Artikel (12h)
- [ ] 1.3 Title-Tags optimiert (2h)
- [ ] Tracking verifiziert
- [ ] Metriken baseline erfasst

### Phase 2: Lead-Gen (Woche 2)
- [ ] 2.1 Drei Lead-Magnets erstellt (16h)
- [ ] 2.2 Email-Nurturing-Serie live (8h)
- [ ] Erste Leads generiert (10+)

### Phase 3: Whitespots (Woche 3)
- [ ] 3.1 Learning-Guide publiziert (16h)
- [ ] 3.2 APERAK-Serie live (12h)
- [ ] SEO-Rankings verbessern

### Phase 4: Tools (Woche 4)
- [ ] 4.1 GPKE-Rechner live (20h)
- [ ] 4.2 MALO-Checker promoted (4h)
- [ ] 4.3 Exit-Intent-Popup live (4h)

### Phase 5: Optimization (Woche 5+)
- [ ] 5.1 A/B-Tests laufen (8h)
- [ ] 5.2 Homepage optimiert (8h)
- [ ] 60-Tage-Review durchgeführt

---

**Status:** 🟡 Bereit zur Umsetzung  
**Nächster Review:** Nach Phase 1 (in 7 Tagen)  
**Verantwortlich:** Entwicklungsteam + Content  
**Fragen?** → Inline-Kommentare oder Issue erstellen

---

*Letztes Update: 6. November 2025*
