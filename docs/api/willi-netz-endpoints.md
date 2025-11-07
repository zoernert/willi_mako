# Willi-Netz Collection API Endpoints

## Übersicht

Mit Version 0.6.0 der API V2 wurden neue Endpunkte hinzugefügt, die es ermöglichen, dediziert auf die neue `willi-netz` QDrant Collection zuzugreifen sowie beide Collections (`willi_mako` und `willi-netz`) kombiniert zu durchsuchen.

## Was ist willi-netz?

Die **willi-netz** Collection ist eine spezialisierte Wissensdatenbank für das **kaufmännische Netzmanagement** und **Asset Management** bei deutschen Verteilnetzbetreibern (VNB). Sie enthält ausschließlich **öffentlich zugängliche, kostenfreie Dokumente** aus amtlichen und branchenrelevanten Quellen.

### 📚 Inhaltsbereiche

#### 1. **Energierechtliche Grundlagen**
- **Gesetzestexte**: EnWG, StromNEV, StromNZV, GasNEV, GasNZV, ARegV, MsbG, MessEG/MessEV
- **Quelle**: gesetze-im-internet.de (Bundesministerium der Justiz)
- **Aktualität**: Immer die aktuelle Fassung mit Novellierungen (z.B. EnWG-Novelle Feb. 2025)

#### 2. **Regulierung durch die Bundesnetzagentur (BNetzA)**
- **Festlegungen**: Beschlusskammern BK4-BK9, Große Beschlusskammer Energie (GBK)
- **Monitoringberichte**: Jährliche Marktanalyse mit Netzentgelten, Versorgungssicherheit, Preisentwicklung
- **NEST-Projekt**: Neue Regulierungssystematik ab 2028/2029
- **Anreizregulierung**: Erlösobergrenzen, Effizienz-Benchmarking (DEA/SFA), Qualitätskennzahlen (SAIDI/SAIFI)

#### 3. **Technische Anschlussbedingungen (TAB)**
- **Netzbetreiber-TAB**: Westnetz, Netze BW, Bayernwerk, MITNETZ STROM, DB Energie u.a.
- **Spannungsebenen**: Niederspannung (NS), Mittelspannung (MS), Hochspannung (HS)
- **VDE-Basis**: VDE-AR-N 4100 (NS), 4110 (MS), 4120 (HS), 4130 (Generator-Anlagen)
- **Themen**: Netzanschluss, Erdungssysteme, E-Mobilität, Speicher, §14a EnWG (steuerbare Verbrauchseinrichtungen)

#### 4. **BDEW-Leitfäden und Branchenstandards**
- **Marktkommunikation**: GPKE, GeLi Gas, WiM, MaBiS, MPES – Umsetzungsfragenkataloge
- **Netzanschlüsse**: Leitfaden 2.0 zur Beschleunigung (§14a EnWG, Solar-Paket)
- **Stromkennzeichnung**: Pflichten nach §42 EnWG
- **TAB-Musterwortlaut**: Bundesmusterwortlaut TAB 2023 NS

#### 5. **VDE-FNN Technische Hinweise** (kostenfrei verfügbar)
- **Speicher**: Anschluss und Betrieb von Speichern am Niederspannungsnetz
- **Mehrfachanschlüsse**: Errichtung von mehreren Netzanschlüssen

#### 6. **Asset Management**
- **Standards**: ISO 55000-Serie
- **Lifecycle-Management**: Investitionssteuerung, Anlagenwirtschaft
- **Qualitätsmanagement**: SAIDI/SAIFI-Optimierung, Versorgungsqualität

### 🔍 Typische Anwendungsfälle für willi-netz

#### ✅ **Kaufmännisches Netzmanagement**
- Erlösobergrenzen-Berechnung und Regulierungsperioden verstehen
- BNetzA-Festlegungen recherchieren und umsetzen
- Netzentgelte kalkulieren und rechtssicher veröffentlichen
- Monitoringberichte für Benchmarking nutzen

#### ✅ **Technisches Asset Management**
- TAB-Anforderungen für Netzanschlussprojekte prüfen
- VDE-Normen-konforme Planungen umsetzen
- §14a EnWG steuerbare Verbrauchseinrichtungen implementieren
- SAIDI/SAIFI-Kennzahlen optimieren

#### ✅ **Regulierungs-Compliance**
- Gesetzliche Grundlagen (EnWG, ARegV) nachschlagen
- BNetzA-Beschlusskammerentscheidungen interpretieren
- NEST-Projekt-Anforderungen vorbereiten
- Marktkommunikations-Prozesse (GPKE, WiM) umsetzen

#### ✅ **Projektmanagement & Planung**
- Smart Meter Rollout (MsbG) planen
- E-Mobilität und Speicher-Integration
- Netzausbau-Investitionen regulatorisch bewerten
- Digitalisierungsprojekte (NEST, §14a EnWG)

### 🆚 Abgrenzung zwischen den Collections

| Collection | Fokus | Typische Anfragen |
|------------|-------|-------------------|
| **willi-mako** | EDIFACT, Marktkommunikation (GPKE, WiM, GeLi Gas) | UTILMD, MSCONS, ORDERS, Prüfkataloge, Lieferantenwechsel |
| **willi-netz** | Regulierung, TAB, Asset Management, BNetzA | Erlösobergrenzen, §14a EnWG, SAIDI, TAB-Anforderungen, Netzentgelte |

> **💡 Tipp**: Anfragen zu Lieferantenwechsel-Prozessen oder EDIFACT-Formaten sind bei **willi-mako** besser aufgehoben. Bei Netzentgelten, Anschluss-Technik und Regulierung nutze **willi-netz**. Für übergreifende Recherchen verwende die **combined** Endpunkte.

### 📊 Technische Details der willi-netz Collection

- **Collection Name**: `willi-netz`
- **Vektordimension**: 768 (Google Gemini text-embedding-004)
- **Distanzmetrik**: Cosine Similarity
- **Anzahl Punkte**: ~20.800 (Stand Nov. 2025)
- **Dokumente**: ~8 PDFs (kontinuierlich wachsend)
- **Optimierung**: AI-Summary, ELI5, Q&A-Paare, Anforderungen, Regulatorischer Kontext

#### Verfügbare Metadaten für Filterung
- `document_category`: Gesetze, TAB, BNetzA, BDEW, VDE-FNN, Asset_Management
- `document_type`: Law, Guideline, Technical_Standard, Report, Festlegung
- `organization`: BNetzA, BDEW, Westnetz, Netze BW, VDE-FNN, etc.
- `voltage_level`: NS, MS, HS, HöS (für TAB-Dokumente)
- `netz_metadata`: TAB-Namen, Gesetze, BNetzA-Geschäftszeichen, Spannungsebenen

## Neue Endpunkte

### 1. Willi-Netz Collection (dediziert)

#### `/api/v2/willi-netz/semantic-search`
**POST** - Semantische Suche ausschließlich über die willi-netz Collection

**Request Body:**
```json
{
  "sessionId": "uuid",
  "query": "Suchbegriff oder Frage",
  "options": {
    "limit": 20,
    "alpha": 0.75,
    "outlineScoping": true,
    "excludeVisual": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "collection": "willi-netz",
    "query": "...",
    "totalResults": 15,
    "durationMs": 234,
    "options": { ... },
    "results": [...]
  }
}
```

#### `/api/v2/willi-netz/chat`
**POST** - Chat-Interaktion basierend auf der willi-netz Collection

**Request Body:**
```json
{
  "sessionId": "uuid",
  "message": "Ihre Frage",
  "contextSettings": {},
  "timelineId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collection": "willi-netz",
    ...
  }
}
```

### 2. Kombinierte Collection-Suche

#### `/api/v2/combined/semantic-search`
**POST** - Semantische Suche über beide Collections (willi_mako + willi-netz)

Die Ergebnisse aus beiden Collections werden zusammengeführt, nach Score sortiert und mit Angabe der Quell-Collection (`sourceCollection` im payload) zurückgegeben.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "query": "Suchbegriff oder Frage",
  "options": {
    "limit": 20,
    "alpha": 0.75,
    "outlineScoping": true,
    "excludeVisual": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "collections": ["willi_mako", "willi-netz"],
    "query": "...",
    "totalResults": 20,
    "durationMs": 345,
    "options": { ... },
    "results": [
      {
        "id": "...",
        "score": 0.95,
        "payload": {
          "sourceCollection": "willi_mako",
          ...
        },
        ...
      }
    ]
  }
}
```

#### `/api/v2/combined/chat`
**POST** - Chat über beide Collections

**Request Body:**
```json
{
  "sessionId": "uuid",
  "message": "Ihre Frage",
  "contextSettings": {},
  "timelineId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": ["willi_mako", "willi-netz"],
    ...
  }
}
```

## Implementierungsdetails

### Backend-Änderungen

1. **QdrantService (`src/services/qdrant.ts`)**
   - Neue Methode `semanticSearchGuidedByCollection()` mit Collection-Parameter
   - Refactoring der `semanticSearchGuided()` Methode zur Nutzung der neuen Methode
   - Collection-Unterstützung in `outlineScopePages()`

2. **RetrievalService (`src/services/api-v2/retrieval.service.ts`)**
   - `semanticSearchWilliNetz()` - Suche dediziert in willi-netz
   - `semanticSearchCombined()` - Parallele Suche in beiden Collections mit Score-basierter Zusammenführung
   - `semanticSearchByCollection()` - Private Hilfsmethode für collection-spezifische Suchen
   - `mapResults()` - Extrahierte Mapping-Logik mit sourceCollection-Unterstützung

3. **Neue Route-Dateien**
   - `src/presentation/http/routes/api/v2/willi-netz.routes.ts`
   - `src/presentation/http/routes/api/v2/combined.routes.ts`

4. **OpenAPI-Dokumentation (`src/presentation/http/routes/api/v2/openapi.ts`)**
   - Version erhöht auf 0.6.0
   - Vollständige Dokumentation aller neuen Endpunkte
   - Schema-Definitionen für Requests und Responses

5. **Router-Integration (`src/presentation/http/routes/api/v2/index.ts`)**
   - Registration der neuen Routes unter `/willi-netz` und `/combined`

## Authentifizierung

Alle Endpunkte erfordern JWT-Bearer-Token-Authentifizierung und eine gültige Session.

## Rate Limiting

Die Standard-API-v2-Rate-Limits gelten für alle neuen Endpunkte.

## Verwendungsbeispiel

```javascript
// 1. Token holen
const authResponse = await fetch('/api/v2/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '...', password: '...' })
});
const { accessToken } = (await authResponse.json()).data;

// 2. Session erstellen
const sessionResponse = await fetch('/api/v2/sessions', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ preferences: {} })
});
const { sessionId } = (await sessionResponse.json()).data;

// 3. Kombinierte Suche durchführen
const searchResponse = await fetch('/api/v2/combined/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'Lieferantenwechselprozess',
    options: { limit: 10 }
  })
});
const results = await searchResponse.json();

// Ergebnisse enthalten sourceCollection-Information
results.data.results.forEach(result => {
  console.log(`${result.payload.sourceCollection}: ${result.highlight}`);
});
```

## 🔍 Beispielanfragen nach Inhaltsbereichen

### Regulierung & BNetzA
```javascript
// Willi-Netz: Erlösobergrenze berechnen
await fetch('/api/v2/willi-netz/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'Wie berechnet sich die Erlösobergrenze nach ARegV?',
    options: { limit: 10 }
  })
});

// Willi-Netz: NEST-Projekt
await fetch('/api/v2/willi-netz/chat', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    message: 'Was ändert sich durch das NEST-Projekt ab 2028?'
  })
});
```

### Technische Anschlussbedingungen (TAB)
```javascript
// Willi-Netz: §14a EnWG steuerbare Verbrauchseinrichtungen
await fetch('/api/v2/willi-netz/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'Was sind die TAB-Anforderungen für §14a EnWG Wallboxen bei Westnetz?',
    options: { limit: 15 }
  })
});

// Willi-Netz: Speicher im Niederspannungsnetz
await fetch('/api/v2/willi-netz/chat', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    message: 'Welche VDE-FNN Hinweise gelten für Batteriespeicher im Niederspannungsnetz?'
  })
});
```

### Asset Management & Versorgungsqualität
```javascript
// Willi-Netz: SAIDI-Kennzahlen
await fetch('/api/v2/willi-netz/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'Wie wird SAIDI gemessen und welche Zielwerte gelten?',
    options: { limit: 10 }
  })
});
```

### Übergreifende Recherchen (Combined)
```javascript
// Combined: Lieferantenwechsel + Netzentgelte
// Nutzt willi-mako für Prozesse und willi-netz für Regulierung
await fetch('/api/v2/combined/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'Lieferantenwechselprozess GPKE und Auswirkungen auf Netzentgelte',
    options: { limit: 20 }
  })
});

// Combined: Smart Meter + Marktkommunikation
await fetch('/api/v2/combined/chat', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    message: 'Wie funktioniert Smart Meter Rollout nach MsbG und welche MSCONS-Nachrichten werden verwendet?'
  })
});

// Ergebnisse mit sourceCollection auswerten
const response = await fetch('/api/v2/combined/semantic-search', { /* ... */ });
const data = await response.json();
data.data.results.forEach(result => {
  const collection = result.payload.sourceCollection; // 'willi_mako' oder 'willi-netz'
  console.log(`[${collection}] ${result.highlight}`);
  
  if (collection === 'willi-netz') {
    // Beispiel: Metadaten aus willi-netz nutzen
    const category = result.payload.document_category; // z.B. 'TAB', 'BNetzA', 'Gesetze'
    const org = result.payload.organization; // z.B. 'Westnetz', 'BNetzA'
    console.log(`  → ${category} von ${org}`);
  } else {
    // willi-mako Metadaten (EDIFACT, etc.)
    console.log(`  → EDIFACT/MaKo Content`);
  }
});
```

### Nur Marktkommunikation (willi-mako)
```javascript
// Bestehende Endpunkte bleiben unverändert
await fetch('/api/v2/retrieval/semantic-search', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    query: 'UTILMD APERAK Prüfkatalog 11042',
    options: { limit: 10 }
  })
});
```

## ⚡ Performance-Hinweise

- **Parallele Suche**: `/combined/semantic-search` durchsucht beide Collections parallel → minimal längere Antwortzeit, aber vollständige Abdeckung
- **Dedizierte Suche**: Wenn der Fokus klar ist (nur Regulierung ODER nur EDIFACT), sind `/willi-netz/*` bzw. `/retrieval/*` schneller
- **Limit-Empfehlung**: 
  - Dedizierte Suche: 10-20 Ergebnisse
  - Combined: 20-30 Ergebnisse (je 10-15 pro Collection)

## 🔄 Aktualisierungszyklen der willi-netz Collection

- **Täglich**: 02:00 Uhr (neue Dokumente)
- **Wöchentlich**: Sonntag 03:00 Uhr (Vollscan)
- **Monatlich**: 1. des Monats 04:00 Uhr (Re-Indexierung)
```

## Migration Notes

Bestehende Clients, die `/api/v2/retrieval/semantic-search` oder `/api/v2/chat` nutzen, bleiben unverändert funktionsfähig. Diese Endpunkte suchen weiterhin ausschließlich in der `willi_mako` Collection.

Clients, die Zugriff auf willi-netz-Daten benötigen, sollten entweder:
- `/api/v2/willi-netz/*` für dedizierte willi-netz-Suchen verwenden
- `/api/v2/combined/*` für übergreifende Suchen nutzen
