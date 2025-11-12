# Screenshots für Artikel-CTAs

Dieses Verzeichnis enthält Screenshots und Demo-Bilder für CTA-Komponenten in Artikeln.

## Benötigte Screenshots

- `remadv-verarbeitung-demo.png` - Screenshot der REMADV-Validierung in Willi-Mako

## Erstellen von Screenshots

1. Öffne https://stromhaltig.de/app/
2. Stelle eine relevante Frage (z.B. "Wie validiere ich eine REMADV-Nachricht?")
3. Mache einen Screenshot vom Chat-Verlauf
4. Speichere das Bild mit einem beschreibenden Namen hier ab
5. Optimiere die Bildgröße (max. 800x450px für CTAs)

## Alternative: Gemini AI

Screenshots können auch mit Gemini AI generiert werden:

```typescript
import { geminiService } from '@/services/gemini';

const prompt = `Erstelle ein professionelles Diagramm für den REMADV-Prozess...`;
const image = await geminiService.generateImage(prompt);
// Speichern unter public/screenshots/
```
