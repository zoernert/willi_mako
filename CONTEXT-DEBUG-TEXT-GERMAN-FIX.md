# Context Debug Text – German Localization Fix

**Date**: 2025-01-13  
**Status**: ✅ Complete  
**Priority**: Medium

## Problem

Der Debug-Text, der angezeigt wird, wenn persönliche Dokumente aus dem Workspace verwendet werden, erschien in englischer Sprache, obwohl die Anwendung vollständig auf Deutsch ist:

```
Using 3 personal documents from your workspace. Context priority: medium, The user is asking about establishing a BKZ regime...
```

Der User berichtete, dass dieser Text:
1. **Sprache**: In Englisch statt Deutsch erschien
2. **Inhalt**: Nicht hilfreich war, da er interne KI-Reasoning zeigte statt nützlicher Information
3. **Fokus**: Zeigen sollte, *welche* Dokumente verwendet wurden und *welche* Informationen extrahiert wurden

## Root Cause Analysis

Der Text hatte zwei Quellen:

### 1. LLM-generierte Erklärungen (Hauptproblem)
Der Gemini LLM hat selbstständig erklärt, dass er persönliche Dokumente verwendet:
- **Quelle**: System-Prompt in `src/services/gemini.ts` enthielt keine explizite Anweisung, dies zu unterlassen
- **Kontext**: Bei `contextMode='workspace-only'` und `standard` fügt `generateResponseWithUserContext()` Header wie "=== PERSÖNLICHE DOKUMENTE ===" hinzu
- **Verhalten**: LLM interpretierte dies als Signal, dem User zu erklären, dass er Dokumente verwendet

### 2. Context Reason Texte (Sekundärproblem)
Die `reason`-Eigenschaft in `ContextDecision` enthielt englische Debug-Texte:
- **Quelle**: `contextManager.ts` Zeile 210 und AI-Analyse-Prompt
- **Anzeige**: Im Frontend als "Context Decision: ..." in `ContextIndicator.tsx`

## Solution Implementation

### 1. System-Prompt Update (`src/services/gemini.ts`)

**Workspace-Only Mode** (Zeile 493):
```typescript
REGEL: Erkläre NICHT in deiner Antwort, dass du Dokumente verwendest oder wie viele. 
Antworte direkt auf die Frage mit den Informationen aus den Dokumenten. 
Der Nutzer wird separat informiert, welche Dokumente verwendet wurden.
```

**Standard Mode** (Zeile 517):
```typescript
REGEL: Erkläre NICHT in deiner Antwort, ob oder welche persönlichen Dokumente du verwendest. 
Antworte direkt auf die Frage. Der Nutzer wird separat informiert, wenn persönliche 
Dokumente verwendet wurden.
```

**Begründung**: 
- Klare Anweisung an LLM, keine Meta-Erklärungen über Dokumentenverwendung zu geben
- Separation of Concerns: LLM fokussiert auf Inhalt, UI zeigt Kontext-Info

### 2. Context Manager German Translation (`src/services/contextManager.ts`)

**Neue Helper-Methode** (Zeile 39):
```typescript
private translatePriority(priority: string): string {
  const translations: Record<string, string> = {
    'high': 'Hoch',
    'medium': 'Mittel',
    'low': 'Niedrig',
    'disabled': 'Deaktiviert'
  };
  return translations[priority] || priority;
}
```

**Context Reason Übersetzungen** (Zeile 210):
```typescript
reason: contextSettings ? 
  `Kontext-Priorität: ${this.translatePriority(contextSettings.workspacePriority)}, ${aiAnalysis.reason || 'Benutzereinstellungen angewendet'}` :
  (aiAnalysis.reason || 
   (hasPersonalKeywords ? 'Anfrage enthält persönliche Schlagwörter' : 
    recentPersonalMentions ? 'Konversation erwähnt persönliche Inhalte' : 
    'Anfrage erscheint allgemein, verwende nur öffentlichen Kontext'))
```

**AI-Analyse-Prompt auf Deutsch** (Zeile 257):
```typescript
Analysiere diese Benutzeranfrage, um festzustellen, ob sie von persönlichem Kontext 
(Dokumente und Notizen des Benutzers) profitieren würde:

Anfrage: "${query}"
...

{
  "relevant": boolean,
  "documentsRelevant": boolean,
  "notesRelevant": boolean,
  "reason": "Erklärung in 1-2 Sätzen, warum persönlicher Kontext relevant oder nicht relevant ist"
}
```

**Weitere Übersetzungen**:
- Line 163: `'Workspace-Kontext vom Benutzer deaktiviert'`
- Line 227: `'Fehler bei der Kontextanalyse'`
- Line 289: `'KI-Analyse abgeschlossen'`
- Line 293: `'Fehler beim Parsen der KI-Analyse'`
- Line 300: `'Fehler bei der KI-Analyse'`

### 3. Frontend Label Update (`app-legacy/src/components/Workspace/ContextIndicator.tsx`)

**Zeile 211**:
```tsx
<strong>Kontext-Entscheidung:</strong> {contextInfo.contextReason}
```

Vorher: "Context Decision:"

## Technical Details

### Files Modified
1. **src/services/gemini.ts**
   - Lines 493-506: Workspace-only mode system prompt + REGEL
   - Lines 517-533: Standard mode system prompt + REGEL
   
2. **src/services/contextManager.ts**
   - Lines 39-49: New `translatePriority()` helper method
   - Line 163: Disabled workspace context reason
   - Lines 210-218: Context decision reason with translation
   - Line 227: Error handling reason
   - Lines 257-274: AI analysis prompt in German
   - Lines 289-300: AI analysis response handling in German
   
3. **app-legacy/src/components/Workspace/ContextIndicator.tsx**
   - Line 211: Label "Kontext-Entscheidung"

### Data Flow

```
User Query → ContextManager.shouldUseUserContext()
    ↓
AI Analysis (German prompt) → reason: "KI-begründete Erklärung"
    ↓
Context Decision → reason: "Kontext-Priorität: Mittel, [AI reason]"
    ↓
Chat Response Generation (Gemini)
    ↓ (OHNE Meta-Erklärung über Dokumentenverwendung)
User sieht: Direkte Antwort + Context Indicator mit deutscher Begründung
```

### Expected User Experience

**Vorher**:
```
[LLM Response]
Using 3 personal documents from your workspace. Context priority: medium, 
The user is asking about establishing a BKZ regime and wants to know how to...

[Answer content]
```

**Nachher**:
```
[LLM Response]
[Answer content - direkt und ohne Meta-Erklärung]

[Context Indicator im UI]
📄 3 Dokumente, 1 Notiz
Kontext-Entscheidung: Kontext-Priorität: Mittel, Anfrage erwähnt persönliche 
Dokumente und könnte durch Workspace-Inhalte beantwortet werden
```

## Benefits

1. **Konsistente Lokalisierung**: Alle user-facing Texte nun auf Deutsch
2. **Fokussierte Antworten**: LLM konzentriert sich auf Inhalt statt Meta-Erklärungen
3. **Klare Information**: User sieht strukturiert im UI, welche Dokumente verwendet wurden
4. **Bessere UX**: Trennung zwischen Antwort-Inhalt (LLM) und Kontext-Info (UI)
5. **Debug-Fähigkeit**: Context Reason weiterhin verfügbar für Entwickler/Support

## Testing Checklist

- [x] Type-Check erfolgreich (keine Compile-Fehler)
- [ ] Dev-Server starten und Chat-Anfrage mit Workspace-Dokumenten testen
- [ ] Prüfen: LLM-Antwort enthält keine "Using X documents..." Erklärungen
- [ ] Prüfen: Context Indicator zeigt deutsche Begründung
- [ ] Edge Cases testen:
  - [ ] Keine Dokumente verfügbar
  - [ ] Workspace-Kontext deaktiviert
  - [ ] Fehler bei AI-Analyse

## Deployment Notes

**Deployment Command**:
```bash
# From repository root
git add src/services/gemini.ts \
        src/services/contextManager.ts \
        app-legacy/src/components/Workspace/ContextIndicator.tsx \
        CONTEXT-DEBUG-TEXT-GERMAN-FIX.md

git commit -m "fix: German localization for context debug text

- Add explicit instruction to LLM to not explain document usage
- Translate all context reason texts to German
- Update frontend label 'Context Decision' → 'Kontext-Entscheidung'
- Add translatePriority() helper for workspace priority levels
- Improve user experience by separating answer content from context info"

git push origin main

# On production server (10.0.0.2)
ssh root@10.0.0.2
cd /root/willi-mako
git pull
npm run build
pm2 restart willi-mako
```

**Rollback Plan**:
- Backup commit hash: [to be added after deployment]
- Revert command: `git revert <commit-hash> && npm run build && pm2 restart willi-mako`

## Related Documentation

- **API Unification Migration**: API-UNIFICATION-MIGRATION-REPORT.md
- **Gemini 3.0 Upgrade**: GEMINI-3.0-UPGRADE.md
- **Custom Error Pages**: CUSTOM-ERROR-PAGES.md
- **Context Manager**: src/services/contextManager.ts (inline comments)
- **Gemini Service**: src/services/gemini.ts (buildSystemPrompt method)

## Future Improvements

1. **Strukturierte Dokumenten-Liste**: Zeige Titel der verwendeten Dokumente statt nur Anzahl
2. **Extrahierte Informationen**: Zeige kurze Snippets der relevanten Passagen
3. **Kontext-Visualisierung**: Farbcodierung nach Relevanz-Score
4. **User Feedback**: Möglichkeit, irrelevante Dokumente zu markieren
5. **Kontext-History**: Welche Dokumente wurden im Chat-Verlauf bereits verwendet?

## Success Metrics

- ✅ Type-Check: Erfolgreich
- ⏳ Keine englischen Debug-Texte in User-Responses
- ⏳ Deutsche Kontext-Begründungen im UI
- ⏳ LLM fokussiert auf Antwort-Inhalt
- ⏳ User Feedback positiv

---

**Author**: GitHub Copilot  
**Reviewer**: [To be assigned]  
**Date**: 2025-01-13  
**Version**: 1.0
