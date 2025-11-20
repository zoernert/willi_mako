# Context Summary Quality Improvement

**Date**: 2025-11-19  
**Status**: ✅ Deployed to Production  
**Commit**: 6444825

## Problem

Der Context Summary in Workspace-Chats war zu generisch:
- Zeigte nur Anzahl der Dokumente ("Verwende 3 Dokumente aus deinem Workspace")
- Keine Information welche Dokumente verwendet wurden
- Keine Priorisierung (primäre vs. sekundäre Quellen)
- Keine Relevanz-Scores sichtbar

### Beispiel vorher:
```
Verwende 3 Dokumente und 2 Notizen aus deinem Workspace. 
Hohe Relevanz: Deine Dokumente und Notizen enthalten detaillierte 
Informationen zum Thema.
```

## Lösung

### 1. Erweiterte `generateContextSummary()`-Signatur

**Datei**: `src/services/contextManager.ts`

Neue Parameter:
- `documents: Array<{title?: string; score?: number; relevance_score?: number}>`
- `notes: Array<{title?: string; content?: string; score?: number}>`

### 2. Detaillierte Document Summaries

Die Methode generiert jetzt hierarchische Informationen:

```typescript
// Primary document
if (index === 0) {
  docParts.push(`hauptsächlich "${title}" (Relevanz: ${scorePercent}%)`);
}

// Secondary document
else if (index === 1) {
  docParts.push(`ergänzt durch "${title}" (${scorePercent}%)`);
}

// Additional documents
else {
  docParts.push(`"${title}" (${scorePercent}%)`);
}
```

### 3. Beispiel-Outputs

**Mit einem hochrelevanten Dokument:**
```
Verwende hauptsächlich "GPKE Lieferantenwechselprozesse" (Relevanz: 95%) 
aus deinem Workspace. Hohe Relevanz: Deine Dokumente enthalten detaillierte 
Informationen zum Thema.
```

**Mit mehreren Dokumenten:**
```
Verwende hauptsächlich "MaBiS-Kommunikation 2024" (Relevanz: 92%), 
ergänzt durch "BDEW Codelisten" (78%), "FAQ Stammdaten" (65%) 
aus deinem Workspace. Hohe Relevanz: Deine Dokumente enthalten 
detaillierte Informationen zum Thema.
```

**Ohne passende Dokumente:**
```
Keine persönlichen Inhalte gefunden. Niedrige Relevanz: 
Keine relevanten Dokumente im Workspace.
```

## Vorteile

1. **Transparenz**: Benutzer sehen genau welche Dokumente verwendet wurden
2. **Priorisierung**: Klar erkennbar welches Dokument primär und welche sekundär
3. **Relevanz-Feedback**: Score zeigt wie gut das Dokument zum Thema passt
4. **Debugging**: Einfacher nachvollziehbar ob richtige Dokumente gewählt wurden

## Technische Details

### Relevanz-Score-Handling
- Sucht zuerst nach `relevance_score`, falls nicht vorhanden `score`
- Konvertiert zu Prozent: `Math.round(score * 100)`
- Bei fehlendem Score: zeigt nur Titel ohne Prozentangabe

### Note Handling
- Notes werden nur als Anzahl erwähnt (keine Titel)
- Grund: Notes sind oft kurz und ohne aussagekräftige Titel

### Fallback-Modus
Falls keine Document-Objekte übergeben werden:
```typescript
if (documentCount > 0 && documents.length === 0) {
  parts.push(`Verwende ${documentCount} ${documentCount > 1 ? 'Dokumente' : 'Dokument'}`);
}
```

## Deployment

```bash
npm run build:backend
./quick-deploy.sh
```

**Server**: 10.0.0.2  
**Backend PM2 PID**: 166 (willi_mako_backend_4101)  
**Memory**: ~144MB

## Testing

Zum Testen neue Chat-Anfrage in "Mein Workspace" stellen:

1. Upload 2-3 Dokumente zu unterschiedlichen Themen
2. Frage zu einem spezifischen Thema
3. Prüfe Context Summary:
   - Zeigt Dokument-Titel
   - Zeigt Relevanz-Score
   - Priorisiert primäres Dokument

## Weitere Verbesserungsmöglichkeiten

### Kurzfristig
- [ ] Threshold für minimale Relevanz (z.B. nur Docs mit >70% Score)
- [ ] Extracted Facts im Summary ("3 Fakten aus Dokument X")
- [ ] Warnung bei niedrigem Score ("Dokumente nur teilweise relevant")

### Mittelfristig
- [ ] Context-Highlight: Welche Textpassagen wurden genau verwendet
- [ ] Source Citations: Direkt-Links zu verwendeten Dokumenten
- [ ] Quality Score: Gesamtbewertung der Context-Qualität

### Langfristig
- [ ] Interactive Context: Benutzer kann Dokument-Auswahl anpassen
- [ ] Context-Feedback: "War dieses Dokument hilfreich?" → Learning
- [ ] Context-Visualization: Grafische Darstellung der verwendeten Quellen

## Related Files

- `src/services/contextManager.ts` (Lines 385-450)
- `src/services/gemini.ts` (REGEL instructions)
- `app-legacy/src/components/Workspace/ContextIndicator.tsx`

## Related Documentation

- `CONTEXT-DEBUG-TEXT-GERMAN-FIX.md`
- `DOCUMENT-POLLING-OPTIMIZATION.md`
- `BULK-DELETE-DOCUMENTS-GUIDE.md`
