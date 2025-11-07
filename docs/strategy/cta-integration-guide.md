# CTA-Integration in Artikel - Implementierungsbeispiel

## Übersicht

Dieses Dokument zeigt, wie du die `ArticleCTA`-Komponenten in bestehende Artikel integrierst, um die Conversion-Rate zu erhöhen.

## ✅ Fertig: CTA-Komponenten erstellt

Die wiederverwendbaren CTA-Komponenten sind unter `/components/ArticleCTA.tsx` verfügbar:

- **CTATop**: Am Anfang des Artikels (nach Intro)
- **CTAMiddle**: In der Mitte (nach Hauptabschnitt)
- **CTABottom**: Am Ende (mit verwandten Artikeln)
- **CTASidebar**: Für Sidebar-Platzierungen

Alle Komponenten haben **automatisches Tracking** integriert via Plausible Analytics.

---

## 🎯 Top 5 Artikel für CTA-Integration (Phase 1.2)

Basierend auf der Content-Strategie, diese Artikel priorisieren:

1. **REMADV-Artikel** - Zahlungsavis im Energiemarkt
2. **Sperrprozess-Artikel** - Sperr- und Entsperrprozess aus NB-Sicht
3. **UTILMD-Artikel** - EDIFACT-Standard für Stammdaten
4. **GPKE-Artikel** - Geschäftsprozesse im Strommarkt
5. **APERAK Z17-Artikel** - Zuständigkeitsfehler beheben

---

## 📝 Integration-Beispiel: REMADV-Artikel

### Schritt 1: Artikel identifizieren

Die Artikel-Seiten sind dynamisch und werden aus Markdown/MDX generiert:
- Pfad: `/src/pages/wissen/artikel/[slug].tsx`
- Content: Wahrscheinlich in `/content/articles/` oder ähnlich

### Schritt 2: CTA-Komponenten importieren

In `/src/pages/wissen/artikel/[slug].tsx`:

```tsx
import { CTATop, CTAMiddle, CTABottom } from '../../../components/ArticleCTA';
import { useEffect } from 'react';
import { setupScrollTracking } from '../../../lib/analytics';
```

### Schritt 3: CTAs in Artikel einbinden

**Option A: Direkt in der React-Komponente (wenn Artikel-Layout kontrollierbar)**

```tsx
const ArticleDetailPage: React.FC<ArticleDetailProps> = ({ article, whitepaperTitle }) => {
	const router = useRouter();
	
	// Scroll-Tracking hinzufügen
	useEffect(() => {
		const cleanup = setupScrollTracking(article.slug, 80);
		return cleanup;
	}, [article.slug]);

	return (
		<Layout title={article.seoTitle || article.title}>
			<Container maxWidth="lg">
				{/* Existing Head & Meta */}
				
				<Box sx={{ py: 4 }}>
					{/* Intro-Bereich */}
					<Typography variant="h4" component="h1">{article.title}</Typography>
					<Typography variant="body1">{article.shortDescription}</Typography>
					
					{/* CTA TOP - Nach Intro */}
					<CTATop 
						articleSlug={article.slug}
						processName="REMADV-Prozess"
					/>
					
					{/* Hauptinhalt (erste Hälfte) */}
					<Paper sx={{ p: 4, mb: 4 }}>
						<MarkdownRenderer>{article.content.split('<!-- MIDDLE_CTA -->')[0]}</MarkdownRenderer>
					</Paper>
					
					{/* CTA MIDDLE - Nach Hauptabschnitt */}
					<CTAMiddle 
						articleSlug={article.slug}
						processName="REMADV-Nachrichten"
						screenshotUrl="/screenshots/remadv-demo.png"
						screenshotAlt="Willi-Mako REMADV-Validierung Demo"
					/>
					
					{/* Hauptinhalt (zweite Hälfte) */}
					<Paper sx={{ p: 4, mb: 4 }}>
						<MarkdownRenderer>{article.content.split('<!-- MIDDLE_CTA -->')[1]}</MarkdownRenderer>
					</Paper>
					
					{/* CTA BOTTOM - Am Ende */}
					<CTABottom 
						articleSlug={article.slug}
						relatedArticles={[
							{
								slug: 'utilmd-standard',
								title: 'UTILMD: Der EDIFACT-Standard für Stammdaten',
								excerpt: 'Wie UTILMD-Nachrichten strukturiert sind und wie du sie validierst.'
							},
							{
								slug: 'aperak-fehler-z17',
								title: 'APERAK Z17 Fehler beheben',
								excerpt: 'Schritt-für-Schritt-Anleitung zur Lösung von Zuständigkeitsfehlern.'
							},
							{
								slug: 'gpke-prozesse',
								title: 'GPKE einfach erklärt',
								excerpt: 'Geschäftsprozesse im Strommarkt verstehen und umsetzen.'
							}
						]}
					/>
					
					{/* Existing Whitepaper-Link */}
				</Box>
			</Container>
		</Layout>
	);
};
```

**Option B: In Markdown-Content mit Custom Components (empfohlen für flexibleres Content-Management)**

Falls du MDX verwendest oder Custom-Components in Markdown einfügen kannst:

```markdown
# REMADV im Energiemarkt: Strukturierte Zahlungsavis

REMADV (REMittance ADVice) ist ein EDIFACT-Nachrichtentyp für strukturierte Zahlungsavis...

<CTATop articleSlug="remadv-energiemarkt" processName="REMADV-Prozess" />

## Aufbau einer REMADV-Nachricht

Eine REMADV-Nachricht besteht aus folgenden Segmenten:
- UNH: Message Header
- BGM: Beginning of Message
- DTM: Date/Time/Period
...

<CTAMiddle 
  articleSlug="remadv-energiemarkt" 
  processName="REMADV-Nachrichten"
  screenshotUrl="/screenshots/remadv-demo.png"
/>

## Häufige Fehler bei REMADV

Die häufigsten Probleme bei REMADV-Nachrichten sind...

<CTABottom 
  articleSlug="remadv-energiemarkt"
  relatedArticles={[...]}
/>
```

### Schritt 4: Verwandte Artikel definieren

Erstelle eine Helper-Funktion für verwandte Artikel:

```typescript
// /lib/content/relatedArticles.ts
export const getRelatedArticles = (articleSlug: string) => {
  const relations: Record<string, Array<{slug: string; title: string; excerpt: string}>> = {
    'remadv-energiemarkt': [
      {
        slug: 'utilmd-standard',
        title: 'UTILMD: Der EDIFACT-Standard für Stammdaten',
        excerpt: 'Wie UTILMD-Nachrichten strukturiert sind.'
      },
      {
        slug: 'invoic-rechnungen',
        title: 'INVOIC: Elektronische Rechnungen im Energiemarkt',
        excerpt: 'Rechnungsdaten standardisiert austauschen.'
      },
      {
        slug: 'aperak-fehler',
        title: 'APERAK-Fehler verstehen und beheben',
        excerpt: 'Was die verschiedenen APERAK-Codes bedeuten.'
      }
    ],
    'sperrprozess-strom': [
      {
        slug: 'gpke-prozesse',
        title: 'GPKE einfach erklärt',
        excerpt: 'Alle Geschäftsprozesse im Überblick.'
      },
      {
        slug: 'eog-ersatzversorgung',
        title: 'Ersatzversorgung & Grundversorgung',
        excerpt: 'Unterschiede und Prozesse.'
      },
      {
        slug: 'utilmd-sperrauftrag',
        title: 'UTILMD-Nachricht für Sperraufträge',
        excerpt: 'Wie du Sperraufträge korrekt übermittelst.'
      }
    ],
    // ... weitere Artikel
  };
  
  return relations[articleSlug] || [];
};
```

---

## 🎨 Screenshot-Erstellung für CTAMiddle

Für die `screenshotUrl`-Parameter brauchst du Screenshots/Demos von Willi-Mako in Action.

### Mit Gemini AI generieren:

```typescript
import { geminiService } from '@/services/gemini';

// Beispiel: Diagramm für REMADV-Prozess
const generateREMADVDiagram = async () => {
  const prompt = `Erstelle ein professionelles Flussdiagramm für den REMADV-Prozess im Energiemarkt:
  
  1. Lieferant sendet Rechnung (INVOIC)
  2. Kunde zahlt
  3. Lieferant sendet REMADV mit Zahlungsdetails
  4. Netzbetreiber verarbeitet REMADV
  5. Automatische Abgleich mit offenen Posten
  
  Stil: Modern, clean, Farben: #147a50 (grün) für erfolgreiche Schritte
  Format: PNG, 800x450px`;
  
  const image = await geminiService.generateImage(prompt);
  // Speichern unter /public/screenshots/remadv-demo.png
};
```

### Oder: Echte Screenshots von Willi-Mako

1. Öffne https://stromhaltig.de/app/
2. Stelle exemplarische Frage: "Wie validiere ich eine REMADV-Nachricht?"
3. Screenshot vom Chat-Verlauf
4. Speichere unter `/public/screenshots/[artikel-slug]-demo.png`

---

## 📈 Tracking verifizieren

Nach Integration prüfen:

### 1. Events feuern?

```typescript
// In Browser Console nach CTA-Klick:
// Sollte ausgeben: "[Plausible Debug] cta_article_top {...}"
```

### 2. Plausible Dashboard checken

- https://stats.corrently.cloud/
- Gehe zu "Goals" → "Real-time"
- Klicke auf einen CTA
- Event sollte sofort erscheinen

### 3. Funnel tracken

Nach 1-2 Tagen Datensammlung:
- Pageviews auf Artikel
- CTA-Klicks (% der Pageviews)
- App-Registrierung-Seite-Besuche
- Tatsächliche Registrierungen

**Beispiel-Funnel:**
```
100 Pageviews auf REMADV-Artikel
 → 5 Klicks auf CTA Top (5% CTR)
 → 3 Klicks auf CTA Middle (3% CTR)
 → 2 Klicks auf CTA Bottom (2% CTR)
 → Gesamt: 10 Klicks auf App-Register (10% CTR)
 → 1 Registrierung (10% Conversion von Klicks)
```

---

## 🔄 Rollout-Plan (Phase 1.2)

### Woche 1:

**Tag 1-2: REMADV-Artikel**
- [ ] Artikel-Datei lokalisieren
- [ ] CTAs einbauen (Top, Middle, Bottom)
- [ ] 3 verwandte Artikel definieren
- [ ] Screenshot/Demo erstellen
- [ ] Lokal testen
- [ ] Commit & Deploy
- [ ] Tracking verifizieren

**Tag 3: Sperrprozess-Artikel**
- [ ] Gleicher Prozess wie REMADV
- [ ] Fokus: "Sperrprozess automatisieren mit Willi-Mako"

**Tag 4: UTILMD-Artikel**
- [ ] CTAs einbauen
- [ ] Demo: UTILMD-Validierung

**Tag 5: GPKE-Artikel**
- [ ] CTAs einbauen
- [ ] Link zu GPKE-Fristen-Checkliste (Lead-Magnet, kommt in Phase 2)

### Woche 2:

**Tag 6: APERAK Z17-Artikel**
- [ ] CTAs einbauen
- [ ] Demo: APERAK-Troubleshooting

**Tag 7: Review & Optimierung**
- [ ] Tracking-Daten analysieren
- [ ] Best-performing CTA-Position identifizieren
- [ ] Texte anpassen falls nötig

---

## ✅ Completion Checklist pro Artikel

- [ ] CTA Top eingebaut (nach Intro)
- [ ] CTA Middle eingebaut (nach Hauptabschnitt)
- [ ] CTA Bottom eingebaut (am Ende)
- [ ] 3 verwandte Artikel definiert
- [ ] Screenshot/Demo erstellt und hochgeladen
- [ ] Scroll-Tracking aktiviert (`setupScrollTracking()`)
- [ ] Lokal getestet (alle CTAs klickbar?)
- [ ] Tracking in Plausible verifiziert (Events feuern?)
- [ ] Deployed
- [ ] In `/docs/strategy/weekly-reports/KW-XX.md` dokumentiert

---

## 🚨 Troubleshooting

### CTAs werden nicht angezeigt

**Problem:** Komponenten-Import funktioniert nicht  
**Lösung:** Check Pfad - für Artikel-Seiten: `../../../components/ArticleCTA`

**Problem:** TypeScript-Fehler  
**Lösung:** `npm run type-check` → Fehler anschauen, meist fehlende Props

### Tracking funktioniert nicht

**Problem:** Events kommen nicht in Plausible an  
**Lösung 1:** Check Browser Console → Plausible Script geladen?  
**Lösung 2:** Ad-Blocker deaktivieren  
**Lösung 3:** Goal in Plausible Dashboard angelegt?

### Screenshots zeigen nicht

**Problem:** 404 auf Bild-URL  
**Lösung:** Bilder müssen in `/public/screenshots/` liegen, nicht `/src/`

---

## 📚 Nächste Schritte nach Phase 1.2

Nach Abschluss der CTA-Integration:

1. **Phase 1.3:** Title-Tags optimieren (SEO)
2. **Phase 2.1:** Lead-Magnets erstellen (GPKE-Checkliste)
3. **A/B-Tests:** Welche CTA-Position performt am besten?
4. **Content-Expansion:** Weitere Artikel mit CTAs ausstatten

---

**Status:** 🟡 In Arbeit  
**Next:** REMADV-Artikel als erstes umsetzen  
**Tracking:** Erfolg in wöchentlichen Reports dokumentieren

*Erstellt: 6. November 2025*
