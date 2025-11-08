# EDIFACT Message Analyzer - Intelligente 6-Phasen-Analyse

## Überblick

Der Message Analyzer wurde komplett überarbeitet und nutzt nun einen **mehrstufigen, intelligenten Analyse-Prozess**, der für alle EDIFACT-Formate der Energiewirtschaft funktioniert.

## Die 6 Phasen der Analyse

### Phase 1: Syntaktische Validierung und Parsing

**Zweck:** Grundlegende EDIFACT-Struktur prüfen und Segmente extrahieren

**Was passiert:**
- ✅ Erkennung des Trennzeichen-Formats (Newline vs. Apostroph `'`)
- ✅ Segment-Extraktion
- ✅ Release-Character Handling (`?+`, `?:`, `?'`)
- ✅ Grundvalidierung (Mindestens 1 Segment erforderlich)

**Ausgabe:** Array von EdiSegment-Objekten

```typescript
segments = [
  { tag: 'UNH', elements: [...], original: '...' },
  { tag: 'BGM', elements: [...], original: '...' },
  ...
]
```

---

### Phase 2: Nachrichtentyp-Erkennung

**Zweck:** Identifikation des EDIFACT-Nachrichtentyps

**Methode:**
1. **Primär:** Analyse des UNH-Segments (Message Header)
   ```
   UNH+004027997159+MSCONS:D:04B:UN:2.4c
   → Nachrichtentyp: MSCONS
   ```

2. **Fallback:** Strukturanalyse bei fehlendem/defektem UNH
   - LIN + QTY → **MSCONS** (Consumption data)
   - IDE oder CTA → **UTILMD** (Master data)
   - MOA → **INVOIC/REMADV** (Invoicing)

**Unterstützte Typen:**
- MSCONS (Verbrauchsdaten)
- UTILMD (Stammdaten)
- ORDERS (Bestellungen)
- INVOIC (Rechnungen)
- REMADV (Zahlungsavis)
- APERAK (Quittierung)
- Alle anderen EDIFACT-Typen

**Ausgabe:** `messageType: "MSCONS"`

---

### Phase 3: Code-Auflösung und Segment-Anreicherung

**Zweck:** BDEW/EIC-Codes auflösen und Segmente mit Metadaten anreichern

**Was wird aufgelöst:**
- ✅ BDEW-Codes (13-stellige Marktpartner-IDs)
- ✅ EIC-Codes (Energy Identification Codes)
- ✅ NAD-Segment-Qualifizierer (MS, MR, DP, etc.)
- ✅ Marktpartner-Rollen aus der Datenbank

**Beispiel:**
```typescript
// Vorher:
NAD+MS+9905766000008::293

// Nachher:
NAD+MS+9905766000008::293
  resolved_meta: {
    code: "9905766000008",
    companyName: "Stadtwerke München GmbH",
    roles: ["Messstellenbetreiber", "Netzbetreiber"],
    contactSheetUrl: "..."
  }
```

**Ausgabe:** Angereicherte Segmente mit `resolvedCodes` und `resolved_meta`

---

### Phase 4: Wissensbasis-Kontext abrufen

**Zweck:** Relevante Dokumentation aus der Wissensbasis holen

**Parallele Queries:**

1. **Nachrichtentyp-Info:**
   ```
   Query: "MSCONS EDIFACT Nachrichtentyp Energiewirtschaft Bedeutung Verwendung Zweck"
   → Ergebnis: "MSCONS ist die Verbrauchsdatennachricht..."
   ```

2. **Prozess-Info:**
   ```
   Query: "MSCONS Marktkommunikation Prozess GPKE WiM GeLi Gas Geschäftsprozess"
   → Ergebnis: "MSCONS wird im GPKE-Prozess zur Übermittlung von..."
   ```

3. **Segment-Info:**
   ```
   Query: "EDIFACT UNH BGM NAD LOC LIN QTY DTM Segment Bedeutung MSCONS"
   → Ergebnis: "LIN-Segment enthält Zählerstände..."
   ```

**Verwendete Technologie:**
- Qdrant Vector Database (semantische Suche)
- Similarity Threshold: 0.60-0.65
- Max. 2-3 Ergebnisse pro Query

**Ausgabe:**
```typescript
{
  messageTypeInfo: "MSCONS ist...",
  processInfo: "GPKE-Prozess...",
  segmentInfo: "NAD: Marktpartner, LOC: Marktlokation..."
}
```

---

### Phase 5: Strukturerkennung für intelligente Ausgabe

**Zweck:** Extrahiere alle relevanten Datenfelder universell für alle Nachrichtentypen

**Universelle Extraktion:**

#### Marktpartner (NAD-Segmente)
```typescript
NAD+MS+9905766000008::293 → sender: "Stadtwerke München GmbH"
NAD+MR+9903756000004::293 → receiver: "Stromnetz Hamburg GmbH"
NAD+DP → deliveryPoint: "..."
```

#### Marktlokation (LOC-Segment)
```typescript
LOC+172+DE0071373163400000E000A0014996748
→ marketLocation: "DE0071373163400000E000A0014996748"
```

#### Referenzen (RFF-Segmente)
```typescript
RFF+MG:1LGZ0056829358 → meterNumber: "1LGZ0056829358"
RFF+Z13:13017 → reference: { qualifier: "Z13", value: "13017" }
```

#### Zweck (BGM-Segment)
```typescript
BGM+7 → purpose: "Stammdatenmitteilung"
BGM+E01 → purpose: "Messwertübermittlung"
BGM+220 → purpose: "Bestellung"
```

#### Zeitstempel (DTM-Segmente)
```typescript
DTM+137:202509051213+00:303 → timestamp: "2025-09-05 12:13 +00:00"
DTM+7:202505312200+00:303 → timestamp: "2025-05-31 22:00 +00:00"
```

#### Messwerte (LIN + QTY + DTM) - **MSCONS-spezifisch**
```typescript
LIN+1
QTY+67:2729.000:KWH
DTM+7:202505312200+00:303
→ measurements: [{
  value: "2729.000",
  unit: "KWH",
  timestamp: "202505312200",
  timestampQualifier: "7"
}]
```

#### Geldbeträge (MOA-Segmente) - **INVOIC/REMADV-spezifisch**
```typescript
MOA+125:1234.56:EUR
→ monetaryAmounts: [{
  qualifier: "125",
  amount: "1234.56",
  currency: "EUR"
}]
```

**Ausgabe:** `structuredInfo` Objekt mit allen extrahierten Daten

---

### Phase 6: KI-Analyse mit kontextspezifischem Prompt

**Zweck:** Intelligente Analyse durch LLM mit optimiertem Prompt

**Prompt-Aufbau:**

```
Du bist Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft.

**NACHRICHTENTYP:** MSCONS
**SEGMENTANZAHL:** 28 Segmente
**SEGMENTTYPEN:** UNA, UNB, UNH, BGM, DTM, RFF, NAD, ...

**EXTRAHIERTE STRUKTURDATEN:**
- Absender: Stadtwerke München GmbH
- Empfänger: Stromnetz Hamburg GmbH
- Marktlokation (MaLo): DE0071373163400000E000A0014996748
- Zählernummer: 1LGZ0056829358
- Zweck: Original
- Messwerte: 1 Zeitreihen (z.B. 2729.000 )
- Zeitstempel: 3
- Referenzen: 2
- Beteiligte Parteien: 3

**WISSENSBASIS - NACHRICHTENTYP:**
[Relevante Dokumentation aus Qdrant...]

**WISSENSBASIS - GESCHÄFTSPROZESS:**
[GPKE/WiM/GeLi Gas Prozessinfo...]

**WISSENSBASIS - SEGMENTE:**
[Segment-Definitionen...]

**VOLLSTÄNDIGE NACHRICHT:**
[Alle Segmente...]

**AUFGABE:**
Analysiere die Nachricht präzise und strukturiert für einen Fachnutzer.

**ANTWORTE IM FOLGENDEN FORMAT (DEUTSCH):**

ZUSAMMENFASSUNG: [2-3 Sätze: Zweck, Parteien, Hauptinhalte]

PLAUSIBILITÄT:
PRÜFUNG: [Strukturelle EDIFACT-Konformität]
PRÜFUNG: [MSCONS-Spezifische Anforderungen]
PRÜFUNG: [Datenqualität]
PRÜFUNG: [Geschäftslogik]
PRÜFUNG: [Vollständigkeit]
```

**LLM-Aufruf:**
- Model: Gemini (über llmProvider)
- Temperatur: Standard
- Max Tokens: Automatisch

**Response-Parsing:**
- Extrahiere `ZUSAMMENFASSUNG:`
- Extrahiere alle `PRÜFUNG:` Zeilen
- Fallback bei Fehlern: Nutze `structuredInfo` für intelligente Zusammenfassung

---

## Beispiel-Durchlauf

### Input:
```edifact
UNA:+.? 'UNB+UNOC:3+9905766000008:500+9903756000004:500+250905:1217+004028004889++VL'UNH+004027997159+MSCONS:D:04B:UN:2.4c'BGM+7+004027997159+9'DTM+137:202509051213?+00:303'RFF+Z13:13017'NAD+MS+9905766000008::293'NAD+MR+9903756000004::293'UNS+D'NAD+DP'LOC+172+DE0071373163400000E000A0014996748'RFF+MG:1LGZ0056829358'LIN+1'PIA+5+1-1?:1.8.0:SRW'QTY+67:2729.000'DTM+7:202505312200?+00:303'STS+Z32++Z92'STS+Z40++Z74'UNT+17+004027997159'...
```

### Phase-by-Phase Ablauf:

**Phase 1:** ✅ 28 Segmente geparst (Apostroph-Format erkannt)

**Phase 2:** ✅ Nachrichtentyp: MSCONS

**Phase 3:** ✅ Codes aufgelöst:
- 9905766000008 → Stadtwerke München GmbH
- 9903756000004 → Stromnetz Hamburg GmbH

**Phase 4:** ✅ Wissenskontext abgerufen:
- MSCONS-Definition
- GPKE-Prozess-Info
- Segment-Dokumentation

**Phase 5:** ✅ Strukturierte Daten extrahiert:
- Absender: Stadtwerke München GmbH
- Empfänger: Stromnetz Hamburg GmbH
- MaLo: DE0071373163400000E000A0014996748
- Zähler: 1LGZ0056829358
- Messwert: 2729.000 kWh am 31.05.2025 22:00

**Phase 6:** ✅ KI-Analyse:

```
ZUSAMMENFASSUNG:
Dies ist eine MSCONS-Nachricht zur Übermittlung von Verbrauchsdaten. Der Messstellenbetreiber Stadtwerke München GmbH übermittelt an Stromnetz Hamburg GmbH den Zählerstand für die Marktlokation DE0071373163400000E000A0014996748 (Zählernummer 1LGZ0056829358). Es wurde ein Verbrauch von 2729 kWh zum Zeitpunkt 31.05.2025 22:00 Uhr erfasst.

PLAUSIBILITÄT:
PRÜFUNG: Strukturelle EDIFACT-Konformität - Alle Pflichtsegmente (UNH, BGM, NAD, LOC, LIN, QTY, DTM, UNT) vorhanden
PRÜFUNG: MSCONS-spezifische Anforderungen - Marktlokation, Zählernummer und Messwerte korrekt strukturiert
PRÜFUNG: Datenqualität - Zeitstempel plausibel (31.05.2025), Marktlokations-ID entspricht Format, Verbrauchswert positiv
PRÜFUNG: Geschäftslogik - Messstellenbetreiber sendet an Messstellennutzer entspricht typischem Prozessfluss
PRÜFUNG: Vollständigkeit - Status-Segmente (STS) vorhanden, Ablesegrund könnte aus Z32/Z40 abgeleitet werden
```

---

## Vorteile der neuen Architektur

### ✅ Universell einsetzbar
- Funktioniert für **alle** EDIFACT-Formate der Energiewirtschaft
- Kein hartcodiertes Wissen pro Nachrichtentyp
- Automatische Anpassung an neue Formate

### ✅ Intelligent und kontextbewusst
- Wissensbasis-Integration für präzise Erklärungen
- Strukturierte Datenextraktion für bessere Analyse
- Code-Auflösung für verständliche Partnernen

### ✅ Robust und wartbar
- Klare Phasentrennung
- Fehlerbehandlung auf jeder Ebene
- Logging für Debugging

### ✅ Performant
- Parallele Queries (Phase 4)
- Begrenzung der Ergebnisse
- Caching-ready (Wissensbasis)

---

## API-Nutzung

### POST /api/v2/message-analyzer/analyze

**Request:**
```json
{
  "message": "UNA:+.? 'UNB+...'"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Dies ist eine MSCONS-Nachricht zur Übermittlung von...",
    "plausibilityChecks": [
      "Strukturelle EDIFACT-Konformität - Alle Pflichtsegmente vorhanden",
      "MSCONS-spezifische Anforderungen - ...",
      ...
    ],
    "structuredData": {
      "segments": [...]
    },
    "format": "EDIFACT"
  }
}
```

---

## Konfiguration & Tuning

### Wissensbasis-Queries (Phase 4)

```typescript
// Anpassbar in getKnowledgeBaseContext()
const messageTypeQuery = `${messageType} EDIFACT Nachrichtentyp...`;
const processQuery = `${messageType} Marktkommunikation Prozess...`;
const segmentQuery = `EDIFACT ${uniqueSegments.join(' ')} Segment...`;

// Similarity Threshold
messageTypeResults = await qdrant.search(query, limit=2, threshold=0.65);
processResults = await qdrant.search(query, limit=2, threshold=0.60);
segmentResults = await qdrant.search(query, limit=3, threshold=0.60);
```

### Strukturextraktion (Phase 5)

Erweitern Sie `extractStructuredInfo()` für neue Segmenttypen:

```typescript
// Beispiel: TAX-Segment für INVOIC
if (messageType === 'INVOIC') {
  const taxSegments = segments.filter(s => s.tag === 'TAX');
  info.taxes = taxSegments.map(tax => ({
    type: tax.elements[0],
    rate: tax.elements[1],
    amount: tax.elements[2]
  }));
}
```

---

## Debugging

### Logging aktiviert auf allen Ebenen:

```
🔍 Starting EDIFACT analysis...
📋 Phase 1: Syntaktische Validierung und Parsing
✅ Parsed 28 EDIFACT segments
📋 Phase 2: Nachrichtentyp-Erkennung
✅ Message type identified: MSCONS
📋 Phase 3: Code-Auflösung und Segment-Anreicherung
✅ Enriched segments with code lookup
📋 Phase 4: Wissensbasis-Kontext abrufen
✅ Retrieved knowledge context for MSCONS
📋 Phase 5: Strukturerkennung für intelligente Ausgabe
✅ Extracted structured info: sender, receiver, marketLocation, ...
📋 Phase 6: KI-Analyse mit kontextspezifischem Prompt
✅ Gemini response length: 1234
```

---

## Testing

```bash
# Automatisierter Test
./test-apostrophe-edifact.sh

# Manueller Test (MSCONS)
curl -X POST http://localhost:3009/api/v2/message-analyzer/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @mscons-example.json

# Manueller Test (UTILMD)
curl -X POST http://localhost:3009/api/v2/message-analyzer/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @utilmd-example.json
```

---

## Changelog

### Version 2.2.0 - 2025-11-08

**Added:**
- ✅ 6-Phasen intelligente Analyse-Architektur
- ✅ Universelle Nachrichtentyp-Erkennung
- ✅ Wissensbasis-Integration (Phase 4)
- ✅ Strukturierte Datenextraktion (Phase 5)
- ✅ Kontextspezifischer KI-Prompt (Phase 6)
- ✅ Support für alle Energiewirtschafts-EDIFACT-Typen

**Improved:**
- ✅ Code-Auflösung mit Metadaten
- ✅ Fehlerbehandlung auf allen Ebenen
- ✅ Logging und Debugging
- ✅ Prompt-Qualität und Strukturierung

**Technical:**
- Modified: `MessageAnalyzerService.analyzeEdifact()` - Komplett neu strukturiert
- Added: `identifyMessageType()` - Phase 2
- Added: `getKnowledgeBaseContext()` - Phase 4
- Added: `extractStructuredInfo()` - Phase 5
- Added: `buildIntelligentAnalysisPrompt()` - Phase 6
- Added: `createIntelligentFallbackAnalysis()` - Intelligenter Fallback

---

*Autor: Willi-Mako Development Team*  
*Datum: 8. November 2025*  
*Version: 2.2.0*
