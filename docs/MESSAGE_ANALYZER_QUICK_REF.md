# Message Analyzer - Quick Reference

## 🚀 Schnellstart

```bash
# Backend starten
npm run dev:backend-only

# Test ausführen
./test-apostrophe-edifact.sh
```

## 📋 Die 6 Phasen (Kurzübersicht)

| Phase | Was passiert | Output |
|-------|--------------|--------|
| **1. Parsing** | EDIFACT-Segmente extrahieren | `segments[]` |
| **2. Typ-Erkennung** | Nachrichtentyp identifizieren | `"MSCONS"` |
| **3. Code-Auflösung** | BDEW/EIC-Codes auflösen | Angereicherte Segmente |
| **4. Wissensbasis** | Relevante Doku holen | Kontext-Objekt |
| **5. Struktur** | Datenfelder extrahieren | `structuredInfo` |
| **6. KI-Analyse** | LLM-basierte Analyse | Summary + Checks |

## 🎯 Was wird extrahiert?

### Für alle Nachrichtentypen:
- ✅ Absender/Empfänger (NAD-Segmente)
- ✅ Marktlokation (LOC)
- ✅ Referenzen (RFF)
- ✅ Zweck (BGM)
- ✅ Zeitstempel (DTM)
- ✅ Beteiligte Parteien

### MSCONS-spezifisch:
- ✅ Messwerte (LIN + QTY + DTM)
- ✅ Zählernummer
- ✅ Verbrauchszeitreihen

### UTILMD-spezifisch:
- ✅ Stammdaten-Charakteristika (CCI)
- ✅ Kontaktdaten (CTA)

### INVOIC/REMADV-spezifisch:
- ✅ Geldbeträge (MOA)
- ✅ Steuern (TAX)

## 🔍 Erwartete Ausgabe

### Für Ihre MSCONS-Nachricht:

**ZUSAMMENFASSUNG:**
> "Dies ist eine MSCONS-Nachricht zur Übermittlung von Verbrauchsdaten. Der Messstellenbetreiber [NAME] übermittelt an [NAME] den Zählerstand für die Marktlokation [MALO]. Es wurde ein Verbrauch von [WERT] kWh zum Zeitpunkt [ZEIT] erfasst."

**PLAUSIBILITÄT:**
- ✅ Strukturelle EDIFACT-Konformität
- ✅ MSCONS-spezifische Anforderungen
- ✅ Datenqualität (Zeitstempel, IDs, Werte)
- ✅ Geschäftslogik (Prozessfluss)
- ✅ Vollständigkeit

## 🐛 Debugging

### Logs anschauen:
```bash
# Backend mit Logs starten
npm run dev:backend-only

# In anderem Terminal
curl -X POST http://localhost:3009/api/v2/message-analyzer/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"..."}'
```

### Erwartete Logs:
```
🔍 Starting EDIFACT analysis...
📋 Phase 1: Syntaktische Validierung und Parsing
✅ Parsed 28 EDIFACT segments
📋 Phase 2: Nachrichtentyp-Erkennung
✅ Message type identified: MSCONS
📋 Phase 3: Code-Auflösung und Segment-Anreicherung
✅ Resolved code 9905766000008 to Stadtwerke München GmbH
✅ Enriched segments with code lookup
📋 Phase 4: Wissensbasis-Kontext abrufen
🔍 Querying knowledge base for: MSCONS
✅ Knowledge base context retrieved
   - Message type info: 1000 chars
   - Process info: 800 chars
   - Segment info: 1200 chars
📋 Phase 5: Strukturerkennung für intelligente Ausgabe
✅ Extracted structured info: sender, receiver, marketLocation, meterNumber, purpose, measurements, timestamps, references, parties
📋 Phase 6: KI-Analyse mit kontextspezifischem Prompt
🔍 Calling Gemini API...
✅ Gemini response length: 1234
```

## ⚙️ Konfiguration

### Wissensbasis-Queries anpassen:

```typescript
// In getKnowledgeBaseContext()
const messageTypeQuery = `${messageType} EDIFACT Nachrichtentyp...`;
const processQuery = `${messageType} Marktkommunikation Prozess...`;
const segmentQuery = `EDIFACT ${uniqueSegments.join(' ')} Segment...`;
```

### Neue Segmente hinzufügen:

```typescript
// In extractStructuredInfo()
if (messageType === 'NEUFORMAT') {
  const customSegments = segments.filter(s => s.tag === 'CUS');
  info.customData = customSegments.map(cus => ({
    // Ihre Extraktion
  }));
}
```

## 📊 Performance

| Phase | Durchschnittliche Dauer |
|-------|-------------------------|
| 1. Parsing | < 10 ms |
| 2. Typ-Erkennung | < 5 ms |
| 3. Code-Auflösung | 50-200 ms (DB-Queries) |
| 4. Wissensbasis | 200-500 ms (Qdrant) |
| 5. Strukturextraktion | < 20 ms |
| 6. KI-Analyse | 2-5 Sekunden (Gemini API) |
| **Gesamt** | **2.5-6 Sekunden** |

## 🔗 Links

- [Vollständige Dokumentation](./MESSAGE_ANALYZER_6_PHASE_ARCHITECTURE.md)
- [API V2 Dokumentation](./MESSAGE_ANALYZER_API_V2.md)
- [Apostrophe Support](./EDIFACT_APOSTROPHE_SUPPORT.md)
- [User Guide](../content/articles/edifact-message-analyzer/index.mdx)

---

**Version:** 2.2.0  
**Stand:** 8. November 2025
