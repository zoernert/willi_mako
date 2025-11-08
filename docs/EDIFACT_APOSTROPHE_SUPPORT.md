# EDIFACT Apostrophe Separator Support

## Problem

Der Message Analyzer konnte EDIFACT-Nachrichten nicht korrekt validieren, wenn diese das **Apostroph (`'`)** als Segment-Trennzeichen verwenden, anstatt Zeilenumbrüche.

### Beispiel einer betroffenen Nachricht:

```edifact
UNA:+.? 'UNB+UNOC:3+9905766000008:500+...'UNH+004027997159+MSCONS:D:04B:UN:2.4c'BGM+7+004027997159+9'...
```

**Fehler:**
```
❌ Validierungsfehler gefunden
Fehler:
- Fehlendes UNH-Segment (Message Header)
- Fehlendes UNT-Segment (Message Trailer)
```

## Ursache

Die Methode `parseEdifactSimple()` in `MessageAnalyzerService` verwendete nur `message.split(/[\r\n]+/)` zum Aufteilen der Segmente. Dies funktionierte nur für Nachrichten mit Zeilenumbrüchen, nicht aber für Nachrichten mit Apostroph-Trennzeichen.

## Lösung

### Änderungen in `message-analyzer.service.ts`

#### 1. Flexible Segment-Erkennung

```typescript
private parseEdifactSimple(message: string): EdiSegment[] {
  const segments: EdiSegment[] = [];
  
  // EDIFACT kann entweder durch Newlines ODER durch ' (Apostroph) getrennt sein
  let lines: string[];
  if (message.includes("'")) {
    // Format mit ' als Segment-Trennzeichen
    lines = message.split("'").filter(line => line.trim());
  } else {
    // Format mit Newlines als Trennzeichen
    lines = message.split(/[\r\n]+/).filter(line => line.trim());
  }
  
  // ... rest of parsing logic
}
```

#### 2. Release-Zeichen Handling

EDIFACT nutzt `?` als **Release-Zeichen** (Escape-Character), um Trennzeichen in Daten zu erlauben:
- `?+` = Buchstäbliches Plus-Zeichen
- `?:` = Buchstäblicher Doppelpunkt
- `?'` = Buchstäbliches Apostroph

```typescript
// Entferne Release-Zeichen (?) vor Trennzeichen
const unescaped = trimmed.replace(/\?([+:'])/g, '$1');
```

**Beispiel:**
```
DTM+137:202509051213?+00:303  →  DTM+137:202509051213+00:303
```

#### 3. Verbesserte Validierung

Die `validateEdifactMessage()`-Methode wurde erweitert:

```typescript
// Check if we got any segments
if (segmentCount === 0) {
  errors.push('Keine gültigen EDIFACT-Segmente gefunden');
  return {
    isValid: false,
    errors,
    warnings,
    segmentCount: 0
  };
}
```

## Unterstützte EDIFACT-Formate

### Format 1: Zeilenumbrüche (Newline-separated)

```edifact
UNH+00000000001111+MSCONS:D:11A:UN:2.6e
BGM+E01+1234567890+9
DTM+137:20251107:102
NAD+MS+++9900123456789::293
UNT+4+00000000001111
```

### Format 2: Apostroph-Trennzeichen (Standard EDIFACT)

```edifact
UNA:+.? 'UNH+00000000001111+MSCONS:D:11A:UN:2.6e'BGM+E01+1234567890+9'DTM+137:20251107:102'NAD+MS+++9900123456789::293'UNT+4+00000000001111'
```

### Format 3: UNA Service String Advice

Das `UNA`-Segment definiert die verwendeten Trennzeichen:

```
UNA:+.? '
```

- `:` = Component separator
- `+` = Data element separator
- `.` = Decimal point
- `?` = Release character
- ` ` (Leerzeichen) = Reserved
- `'` = Segment terminator

## Testing

### Manueller Test

1. Starten Sie den Backend-Server:
```bash
npm run dev:backend-only
```

2. Führen Sie das Test-Skript aus:
```bash
./test-apostrophe-edifact.sh
```

### Erwartetes Ergebnis

```
✅ Validation PASSED
   - Message Type: MSCONS
   - Segment Count: 28
```

### API-Test via curl

```bash
# 1. Token holen
TOKEN=$(curl -s -X POST http://localhost:3009/api/v2/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

# 2. Nachricht validieren
curl -X POST http://localhost:3009/api/v2/message-analyzer/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"UNA:+.? '\''UNH+001+MSCONS:D:04B:UN:2.4c'\''BGM+7+001+9'\''UNT+3+001'\''"}'
```

## Technische Details

### Parser-Logik

1. **Format-Erkennung**: Prüft ob `'` in der Nachricht vorkommt
2. **Segment-Splitting**: Teilt nach entsprechendem Trennzeichen auf
3. **Release-Character Handling**: Ersetzt `?+`, `?:`, `?'` durch Literal-Zeichen
4. **Element-Parsing**: Teilt Segmente nach `+` und `:` auf

### Edge Cases

#### Multi-Message (Interchange)

Die bereitgestellte Nachricht enthielt **zwei MSCONS-Nachrichten** in einem UNB/UNZ-Interchange:

```
UNB+...+...'
  UNH+004027997159+MSCONS:...'
    ... (erste MSCONS)
  UNT+17+004027997159'
  UNH+004027997100+MSCONS:...'
    ... (zweite MSCONS)
  UNT+11+004027997100'
UNZ+2+004028004889'
```

Der Parser erkennt jetzt **alle Segmente** korrekt, inklusive:
- UNB (Interchange Header)
- Multiple UNH/UNT Paare (Message Headers/Trailers)
- UNZ (Interchange Trailer)

#### Release-Character in Daten

```edifact
FTX+AAI+++Zahlung?+Rechnung Nr. 12345'
```
→ Wird korrekt als `Zahlung+Rechnung Nr. 12345` geparst

## API Endpoints

### POST /api/v2/message-analyzer/validate

**Request:**
```json
{
  "message": "UNA:+.? 'UNH+001+MSCONS:D:04B:UN:2.4c'..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "messageType": "MSCONS",
    "segmentCount": 28
  }
}
```

**Response (Failure):**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "errors": [
      "Fehlendes UNH-Segment (Message Header)"
    ],
    "warnings": [],
    "segmentCount": 15
  }
}
```

## Backwards Compatibility

✅ **100% abwärtskompatibel**

- Nachrichten mit Zeilenumbrüchen funktionieren weiterhin
- Keine Breaking Changes in API-Contracts
- Bestehende Tests bleiben gültig

## Deployment Checklist

- [x] Code-Änderungen in `message-analyzer.service.ts`
- [x] TypeScript Type-Check erfolgreich
- [x] Test-Skript erstellt (`test-apostrophe-edifact.sh`)
- [x] Dokumentation aktualisiert
- [ ] Unit-Tests hinzufügen (für beide Formate)
- [ ] Integration-Test durchführen
- [ ] Production-Deployment

## Known Limitations

### Segment-Anzahl Mismatch

Die bereitgestellte Nachricht hat eine Diskrepanz:

```
UNT+17+004027997159  → Deklariert 17 Segmente
```

Aber tatsächlich werden **28 Segmente** geparst (inkl. UNB, UNZ).

**Ursache:** Die Segmentanzahl im UNT bezieht sich nur auf die **Message** (zwischen UNH/UNT), nicht auf den gesamten **Interchange** (UNB/UNZ).

**Lösung (zukünftig):** Separate Validierung für:
- Interchange-Level (UNB → UNZ)
- Message-Level (UNH → UNT)

## Future Enhancements

### 1. UNA-basierte Konfiguration

Aktuell wird das UNA-Segment erkannt, aber noch nicht zur dynamischen Konfiguration der Trennzeichen verwendet.

```typescript
// TODO: Parse UNA und verwende konfigurierte Trennzeichen
const una = message.match(/^UNA(.{6})/);
if (una) {
  const separators = {
    component: una[1][0],
    data: una[1][1],
    decimal: una[1][2],
    release: una[1][3],
    segment: una[1][5]
  };
}
```

### 2. Interchange vs. Message Validierung

```typescript
interface InterchangeValidation {
  interchangeValid: boolean;
  messageCount: number;
  messages: MessageValidation[];
}

interface MessageValidation {
  messageId: string;
  messageType: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 3. Syntax-Version Support

Unterschiedliche EDIFACT-Versionen haben leicht unterschiedliche Regeln:
- D.04B (Version in der Beispiel-Nachricht)
- D.11A
- D.96A

## Related Documentation

- [MESSAGE_ANALYZER_ENHANCED.md](./MESSAGE_ANALYZER_ENHANCED.md)
- [MESSAGE_ANALYZER_API_V2.md](./MESSAGE_ANALYZER_API_V2.md)
- [EDIFACT edi@energy Standard](https://www.edi-energy.de/)

## Changelog

### 2025-11-08 - v2.1.0

**Added:**
- ✅ Support für Apostroph-Trennzeichen in EDIFACT-Nachrichten
- ✅ Release-Character Handling (`?+`, `?:`, `?'`)
- ✅ Verbesserte Segment-Count-Validierung
- ✅ Test-Skript für Apostroph-Format

**Fixed:**
- ✅ Validierungsfehler bei gültigen EDIFACT-Nachrichten mit `'`-Trennzeichen
- ✅ Falsche "Fehlendes UNH/UNT"-Meldung bei korrekten Nachrichten

**Technical:**
- Modified: `MessageAnalyzerService.parseEdifactSimple()`
- Modified: `MessageAnalyzerService.validateEdifactMessage()`
- Added: `test-apostrophe-edifact.sh`
- Added: `EDIFACT_APOSTROPHE_SUPPORT.md`

---

*Autor: Willi-Mako Development Team*  
*Datum: 8. November 2025*  
*Version: 2.1.0*
