# BDEW/EIC Code-Lookup System - MongoDB Migration

## Übersicht

Das BDEW/EIC Code-Lookup-System wurde erfolgreich von PostgreSQL auf MongoDB migriert, um reichhaltigere Daten aus der `market_partners` Collection zu nutzen. Diese Migration bietet erweiterte Suchfunktionen, Software-System-Filtering und detaillierte Unternehmensinformationen.

## Neue Features

### 🔍 Erweiterte Suche
- **Volltext-Suche** über alle Felder (Code, Unternehmensname, Stadt, PLZ, Kontakt)
- **Filter nach Software-Systemen** mit Vertrauensniveau (High, Medium, Low)
- **Geografische Filter** (Stadt, PLZ)
- **Code-Funktions-Filter** (Lieferant, Netzbetreiber, etc.)

### 📊 Neue Datenstruktur
```typescript
interface CodeSearchResult {
  code: string;
  companyName: string;
  codeType: string;
  source: 'bdew' | 'eic';
  companyUID?: string;
  postCode?: string;
  city?: string;
  street?: string;
  country?: string;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  softwareSystems?: SoftwareSystem[];
  editedOn?: string;
}
```

### 🛠️ Software-System-Daten
Jeder Eintrag kann mehrere Software-Systeme enthalten:
```typescript
interface SoftwareSystem {
  name: string;                           // z.B. "SAP IS-U", "MS Office"
  confidence: 'High' | 'Medium' | 'Low'; // Vertrauensniveau
  evidence_text: string;                   // Beleg-Text
}
```

## API-Endpunkte

### Suche
```
GET /api/v1/codes/search?q={query}&softwareSystems={system}&city={city}&confidence={level}
```

**Parameter:**
- `q` (required): Suchbegriff
- `softwareSystems`: Software-System-Filter (mehrfach möglich)
- `postCode`: PLZ-Filter
- `city`: Stadt-Filter  
- `codeFunction`: Code-Funktions-Filter
- `confidence`: Vertrauensniveau-Filter (High, Medium, Low)

### BDEW-spezifische Suche
```
GET /api/v1/codes/bdew/search?q={query}&{filters}
```

### EIC-spezifische Suche
```
GET /api/v1/codes/eic/search?q={query}&{filters}
```

### Code-Details
```
GET /api/v1/codes/details/{code}
```
Gibt detaillierte Informationen inklusive aller Findings und Software-Systeme zurück.

### Filter-Optionen
```
GET /api/v1/codes/software-systems  # Verfügbare Software-Systeme
GET /api/v1/codes/cities            # Verfügbare Städte
GET /api/v1/codes/functions         # Verfügbare Code-Funktionen
```

## Datenquellen

Die MongoDB-Collection `market_partners` enthält:

### Unternehmensdaten
- BDEW-Code und Typ
- Firmenname und Adresse
- Kontaktdaten
- Unternehmens-ID

### Findings (Software-Systeme)
- Automatisch ermittelte Software-Systeme
- Vertrauensniveau der Erkennung
- Quell-URLs der Datenerhebung
- Zeitstempel der Datenerhebung

## Frontend-Komponente

Die neue React-Komponente `CodeLookup.tsx` bietet:

### ✨ Benutzerfreundliche Features
- **Live-Suche** mit Debouncing
- **Erweiterte Filter** (ausklappbar)
- **Card-basierte Ergebnisdarstellung**
- **Detail-Dialog** für vollständige Informationen
- **Responsive Design** für alle Geräte

### 🎨 UI-Komponenten
- Autocomplete für Software-Systeme und Städte
- Multi-Select für Vertrauensniveau
- Chip-basierte Darstellung der Filter
- Expandierbare Karten für Details
- Vollständiger Detail-Dialog

## Fallback-Mechanismus

Das System implementiert einen automatischen Fallback:
1. **Primär**: MongoDB-Repository (neue Features)
2. **Fallback**: PostgreSQL-Repository (legacy Kompatibilität)

```typescript
const initializeService = async () => {
  try {
    await MongoDBConnection.getInstance().connect();
    const mongoRepository = new MongoCodeLookupRepository();
    codeLookupService = new CodeLookupService(mongoRepository);
  } catch (error) {
    // Fallback zu PostgreSQL
    const postgresRepository = new PostgresCodeLookupRepository(pool);
    codeLookupService = new CodeLookupService(postgresRepository);
  }
};
```

## Testen

### Backend-Test
```bash
npm run test:mongo-lookup
```
oder
```bash
npx ts-node test-mongo-code-lookup.ts
```

### Frontend-Test
Navigieren Sie zu `/codes` in der Anwendung.

## Beispiel-Queries

### Grundsuche
```
/api/v1/codes/search?q=Stadt
```

### Gefilterte Suche
```
/api/v1/codes/search?q=Energie&softwareSystems=SAP IS-U&confidence=High&city=Hamburg
```

### Software-System-Filter
```
/api/v1/codes/search?q=&softwareSystems=MS Office&softwareSystems=SAP IS-U
```

## Performance-Optimierungen

### MongoDB-Indizes
Empfohlene Indizes für optimale Performance:
```javascript
db.market_partners.createIndex({ "partner.﻿BdewCode": 1 })
db.market_partners.createIndex({ "partner.CompanyName": "text" })
db.market_partners.createIndex({ "partner.City": 1 })
db.market_partners.createIndex({ "findings.software_systems.name": 1 })
```

### Caching
- Autocomplete-Optionen werden beim Laden gecacht
- Debounced Suche reduziert API-Calls
- Paginierung für große Ergebnismengen

## Migration Notes

### Datenstruktur-Unterschiede
- **MongoDB**: Reichhaltige, verschachtelte Struktur mit Software-System-Daten
- **PostgreSQL**: Flache, normalisierte Struktur nur mit Basis-Code-Daten

### Kompatibilität
- Alle bestehenden API-Endpunkte bleiben funktional
- Neue Parameter sind optional (backward compatible)
- Gemini AI-Integration nutzt automatisch neue Daten

## Überwachung

### Logging
```typescript
console.log('Code lookup service initialized with MongoDB');
console.error('Failed to initialize MongoDB, falling back to PostgreSQL');
```

### Health Checks
Das System loggt Verbindungsstatus und Performance-Metriken.

## Nächste Schritte

1. **Performance-Monitoring** implementieren
2. **Caching-Layer** für häufige Abfragen
3. **Elasticsearch-Integration** für erweiterte Volltextsuche
4. **Export-Funktionen** für gefilterte Ergebnisse
5. **Analytics** für Nutzungsstatistiken
