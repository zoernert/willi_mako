# CTA-Rendering-Fix für Artikel

## Problem

Auf der Webseite wurden die CTA-Komponenten (`<CTATop />`, `<CTAMiddle />`, `<CTABottom />`) in Artikeln als Rohtext angezeigt, anstatt als React-Komponenten gerendert zu werden.

**Beispiel:** https://stromhaltig.de/wissen/artikel/remadv-zahlungsavis

Der Code wurde sichtbar angezeigt:
```
<CTABottom articleSlug="remadv-zahlungsavis" relatedArticles={[...]} />
```

## Ursache

Die Artikel-Inhalte werden aus MDX-Dateien gelesen, aber der Content wird als **String** behandelt, nicht als echtes MDX. Die CTA-Komponenten im MDX wurden:

1. Als String gelesen (nicht als JSX geparsed)
2. Mit `.replace()` komplett aus dem Content entfernt
3. Nur eine `<CTABottom />` wurde am Ende der Seite hart-kodiert gerendert

## Lösung

Ich habe eine **Parsing-Funktion** implementiert, die:

1. ✅ CTA-Komponenten aus dem Content **extrahiert**
2. ✅ Deren **Props parsed** (articleSlug, processName, screenshotUrl, relatedArticles)
3. ✅ Den Content an CTA-Positionen **aufteilt**
4. ✅ Content-Abschnitte und CTAs **abwechselnd rendert**

### Code-Änderungen

**Datei:** `/src/pages/wissen/artikel/[slug].tsx`

**Neue Funktion:**
```typescript
function parseContentWithCTAs(content: string): { 
  sections: string[]; 
  ctas: CTAMatch[] 
}
```

**Rendering-Logik:**
```tsx
{sections.map((section, index) => (
  <React.Fragment key={index}>
    {section && (
      <Paper sx={{ p: 4, mb: 4 }}>
        <MarkdownRenderer>{section}</MarkdownRenderer>
      </Paper>
    )}
    
    {ctas[index] && (
      <Box sx={{ mb: 4 }}>
        {ctas[index].type === 'Top' && <CTATop {...ctas[index].props} />}
        {ctas[index].type === 'Middle' && <CTAMiddle {...ctas[index].props} />}
        {ctas[index].type === 'Bottom' && <CTABottom {...ctas[index].props} />}
      </Box>
    )}
  </React.Fragment>
))}
```

## Features

✅ **Flexible Platzierung:** CTAs können an beliebigen Stellen im MDX-Content platziert werden  
✅ **Prop-Parsing:** Alle CTA-Props werden korrekt extrahiert (einfache Strings und komplexe Arrays)  
✅ **Import-Cleanup:** Import-Statements werden automatisch entfernt  
✅ **Multi-line Support:** CTAs können über mehrere Zeilen definiert werden  

## Unterstützte Props

- `articleSlug` (string)
- `processName` (string)
- `screenshotUrl` (string)
- `screenshotAlt` (string)
- `relatedArticles` (array of objects)

## Beispiel-Verwendung im MDX

```mdx
---
title: "Mein Artikel"
---

import { CTATop, CTAMiddle, CTABottom } from '../../../components/ArticleCTA';

# Artikel-Titel

Intro-Text hier...

<CTATop articleSlug="mein-artikel" processName="Mein Prozess" />

## Hauptabschnitt

Mehr Content...

<CTAMiddle 
  articleSlug="mein-artikel" 
  processName="Prozessschritt 2"
  screenshotUrl="/screenshots/demo.png"
/>

## Fazit

Abschlusstext...

<CTABottom 
  articleSlug="mein-artikel"
  relatedArticles={[
    {
      slug: "artikel-1",
      title: "Verwandter Artikel 1",
      excerpt: "Beschreibung..."
    }
  ]}
/>
```

## Testing

Test-Script erstellt: `/test-cta-parsing.ts`

```bash
npx tsx test-cta-parsing.ts
```

Output:
```
Found 3 CTAs:
CTA 1: Top
Props: { "articleSlug": "test-article", "processName": "Test Process" }
...
```

## Deployment

1. ✅ Type Check erfolgreich
2. ✅ Build erfolgreich
3. 🚀 Ready to deploy

## Nächste Schritte

1. **Deploy** auf Produktionsserver
2. **Verifizieren** auf https://stromhaltig.de/wissen/artikel/remadv-zahlungsavis
3. **Screenshots erstellen** für CTAMiddle (siehe `/public/screenshots/README.md`)
4. **Weitere Artikel** mit CTAs ausstatten (siehe `/docs/strategy/cta-integration-guide.md`)

## Verwandte Dateien

- `/src/pages/wissen/artikel/[slug].tsx` - Artikel-Seite (geändert)
- `/src/components/ArticleCTA.tsx` - CTA-Komponenten (unverändert)
- `/content/articles/remadv-zahlungsavis/index.mdx` - Beispiel-Artikel (unverändert)
- `/public/screenshots/README.md` - Screenshot-Anleitung (neu)
- `/test-cta-parsing.ts` - Test-Script (neu)

---

**Erstellt:** 12. November 2025  
**Status:** ✅ Fertig, bereit für Deployment
