# FAQ Context-Feld: Automatisches Markdown-Stripping

## Änderung (2025-10-07)

### Problem
- FAQ-Einträge hatten identischen Inhalt in `context` und `answer`
- `context` enthielt Markdown-Syntax, die für Suche suboptimal ist
- Benutzer sahen Markdown-Code statt formatiertem Text im Context-Bereich

### Lösung

#### 1. Optionales `context` Feld im API
Das `context` Feld kann nun optional in POST-Requests übergeben werden:

```json
{
  "question": "Was ist...",
  "answer": "## Markdown\n\n**Bold** text...",
  "context": "Optional: Plain text version"
}
```

#### 2. Automatisches Markdown-Stripping
Wenn `context` NICHT übergeben wird, wird er automatisch aus `answer` generiert durch Entfernen von:

- ✅ Headers (`#`, `##`, etc.)
- ✅ Bold (`**text**`)
- ✅ Italic (`*text*`)
- ✅ Links (`[text](url)` → nur `text`)
- ✅ Inline Code (`` `code` ``)
- ✅ Code Blocks (``` ... ```)
- ✅ Listen-Marker (`-`, `*`, `+`, `1.`)

**Code-Location**: `src/routes/faq.ts`, Zeilen 356-365

```typescript
// Automatic markdown stripping
contextText = answer
  .replace(/#{1,6}\s+/g, '')
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/\*(.+?)\*/g, '$1')
  .replace(/\[(.+?)\]\(.+?\)/g, '$1')
  .replace(/`(.+?)`/g, '$1')
  .replace(/```[\s\S]*?```/g, '')
  .replace(/^\s*[-*+]\s+/gm, '')
  .replace(/^\s*\d+\.\s+/gm, '');
```

### Verwendung

#### Variante A: Ohne context (automatisch)
```bash
curl -X POST http://localhost:3009/api/faqs \
  -H "Authorization: Bearer str0mda0" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Was ist die EEG-Umlage?",
    "answer": "## EEG-Umlage\n\nDie **EEG-Umlage** finanziert..."
  }'
```

→ `context` wird automatisch generiert (ohne Markdown)

#### Variante B: Mit explizitem context
```bash
curl -X POST http://localhost:3009/api/faqs \
  -H "Authorization: Bearer str0mda0" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Was ist die EEG-Umlage?",
    "answer": "## EEG-Umlage\n\nDie **EEG-Umlage** finanziert...",
    "context": "EEG-Umlage Erneuerbare Energien Finanzierung Strompreis"
  }'
```

→ Übergebener `context` wird verwendet (volle Kontrolle)

### Vorteile

1. **Bessere Suchergebnisse**
   - Volltextsuche findet relevante Begriffe ohne Markdown-Störungen
   - Semantic Search fokussiert auf Inhalt statt Formatierung

2. **Flexibilität**
   - API bleibt einfach (context optional)
   - Entwickler können optimierten context liefern wenn gewünscht
   - Automatischer Fallback funktioniert gut für Standard-Fälle

3. **Konsistenz**
   - `context` = Plain Text (Suche)
   - `answer` = Markdown (Anzeige)
   - Klare Trennung der Zwecke

4. **Backward Compatible**
   - Bestehende API-Calls funktionieren weiter
   - Neues optionales Feld ändert nichts für bestehende Clients

### Datenbankschema

| Feld | Format | Zweck |
|------|--------|-------|
| `context` | Plain Text | Volltextsuche, Semantic Search, Qdrant-Indexierung |
| `answer` | Markdown | Frontend-Anzeige mit Markdown-Rendering |

### Testing

```javascript
// Test 1: Ohne context
const res1 = await fetch('/api/faqs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer str0mda0',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'Test',
    answer: '## Header\n\n**Bold** und [Link](https://example.com)'
  })
});

// Erwartet: context = "Header Bold und Link"

// Test 2: Mit context
const res2 = await fetch('/api/faqs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer str0mda0',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'Test',
    answer: '## Header\n\n**Bold**',
    context: 'Mein eigener Context Text'
  })
});

// Erwartet: context = "Mein eigener Context Text"
```

### Migration

**Keine Migration nötig!** Bestehende FAQs:
- Haben bereits einen `context` (war = answer)
- Funktionieren weiterhin
- Bei Updates kann context optimiert werden

### Dokumentation

Aktualisiert:
- ✅ `docs/api/faq-create-endpoint.md` - API-Dokumentation
- ✅ `docs/api/FAQ-CREATE-QUICKREF.md` - Quick Reference
- ✅ `docs/technical/faq-qdrant-indexing.md` - Technische Details

---

**Implementiert**: 2025-10-07  
**Status**: ✅ Production Ready  
**Breaking Changes**: Keine
