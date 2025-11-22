# Marktrollenfilter für Marktpartnersuche

## Überblick

Die Marktpartnersuche wurde um einen optionalen Filter nach Marktrolle erweitert. Dies ermöglicht es, gezielt nach Marktpartnern mit einer bestimmten Rolle zu suchen, z.B. alle Verteilnetzbetreiber (VNB), Lieferanten (LF) oder Messstellenbetreiber (MSB).

## Verfügbare Marktrollen

Die folgenden Marktrollenwerte werden unterstützt:

- **VNB** - Verteilnetzbetreiber
- **LF** - Lieferant
- **MSB** - Messstellenbetreiber
- **UNB** / **ÜNB** - Übertragungsnetzbetreiber

Sowohl die Abkürzungen als auch die vollständigen deutschen Bezeichnungen können verwendet werden (z.B. "VNB" oder "VERTEILNETZBETREIBER").

## API-Endpunkte

### API v2 (öffentlich, keine Authentifizierung)

**Endpunkt:** `GET /api/v2/market-partners/search`

**Query-Parameter:**
- `q` (erforderlich): Suchbegriff (Code, Firmenname, Stadt, etc.)
- `limit` (optional): Maximale Anzahl der Ergebnisse (1-20, Standard: 10)
- `role` (optional): Filter nach Marktrolle (z.B. "VNB", "LF", "MSB")

**Beispiele:**

```bash
# Alle Verteilnetzbetreiber
curl "https://stromhaltig.de/api/v2/market-partners/search?q=&role=VNB&limit=10"

# Stadtwerke, die Verteilnetzbetreiber sind
curl "https://stromhaltig.de/api/v2/market-partners/search?q=Stadtwerke&role=VNB"

# Alle Lieferanten
curl "https://stromhaltig.de/api/v2/market-partners/search?q=&role=LF&limit=10"

# Messstellenbetreiber mit "EMH" im Namen
curl "https://stromhaltig.de/api/v2/market-partners/search?q=EMH&role=MSB"
```

### Public API (öffentlich, keine Authentifizierung)

**Endpunkt:** `GET /api/public/market-partners/search`

Gleiche Parameter wie API v2.

**Beispiel:**

```bash
curl "https://stromhaltig.de/api/public/market-partners/search?q=Netz&role=VNB&limit=5"
```

### API v1 (authentifiziert)

**Endpunkt:** `GET /api/v1/codes/search`

Erfordert Authentifizierung. Der Rollenfilter wird über den `role` Query-Parameter übergeben.

**Beispiel:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://stromhaltig.de/api/v1/codes/search?q=Energie&role=VNB"
```

## Frontend-Integration

### Next.js Public Site

Die CodeLookup-Komponente (`src/components/CodeLookup.tsx`) wurde um einen Dropdown-Filter für Marktrollen erweitert.

**Verwendung:**

1. Öffne die Marktpartnersuche
2. Klicke auf "Filter" um die erweiterten Suchoptionen anzuzeigen
3. Wähle eine Marktrolle aus dem Dropdown "Marktrolle"
4. Die Suchergebnisse werden automatisch gefiltert

### Legacy React App

Die MarketPartnerSelector-Komponente in der Legacy-App unterstützt den neuen Filter automatisch, da sie die gleichen API-Endpunkte verwendet.

## Implementierungsdetails

### Datenquellen

Die Implementierung unterstützt beide Datenbanken:

1. **MongoDB** (`discovery_results` Collection):
   - Filtert nach `partner.BdewCodeFunction` und `contacts.BdewCodeFunction`
   - Unterstützt das neue Kontaktschema mit mehreren Rollen pro Marktpartner

2. **PostgreSQL** (`bdewcodes` Tabelle):
   - Filtert nach `code_type` Spalte
   - Legacy-Unterstützung für ältere Datenstrukturen

### Code-Änderungen

Die folgenden Dateien wurden geändert:

1. **Interfaces:**
   - `src/modules/codelookup/interfaces/codelookup.interface.ts`
   - Neues Feld `marketRole?: string` im `SearchFilters` Interface

2. **Repositories:**
   - `src/modules/codelookup/repositories/mongo-codelookup.repository.ts`
   - `src/modules/codelookup/repositories/postgres-codelookup.repository.ts`
   - Erweiterung der `buildSearchQuery()` bzw. `searchBDEWCodes()` Methoden

3. **API-Routen:**
   - `src/presentation/http/routes/api/v2/market-partners.routes.ts`
   - `src/routes/public-market-partners.ts`
   - `src/routes/codes.ts`
   - Unterstützung für `role` Query-Parameter

4. **OpenAPI-Dokumentation:**
   - `src/presentation/http/routes/api/v2/openapi.ts`
   - Dokumentation des neuen Parameters mit Enum und Beispielen

5. **Frontend:**
   - `src/components/CodeLookup.tsx`
   - Neues Dropdown-Feld für Marktrollenfilter

## Testskript

Ein Testskript ist verfügbar unter `test-market-role-filter.sh`.

**Ausführung:**

```bash
# Lokaler Test
./test-market-role-filter.sh

# Test gegen Produktionsumgebung
BASE_URL=https://stromhaltig.de ./test-market-role-filter.sh
```

## OpenAPI-Dokumentation

Die vollständige OpenAPI-Dokumentation ist verfügbar unter:

```
GET /api/v2/openapi
```

Der neue `role` Parameter ist vollständig dokumentiert mit:
- Beschreibung
- Enum-Werten
- Beispielen

## Anwendungsfälle

### 1. Liste aller Verteilnetzbetreiber

```javascript
const response = await fetch('/api/v2/market-partners/search?q=&role=VNB&limit=100');
const data = await response.json();
const vnbs = data.data.results;
```

### 2. Suche nach einem bestimmten Lieferanten

```javascript
const response = await fetch('/api/v2/market-partners/search?q=Stadtwerke&role=LF');
const data = await response.json();
```

### 3. Kombination mit anderen Filtern

Die Rollenfilterung kann mit anderen Filtern kombiniert werden (über API v1):

```javascript
const params = new URLSearchParams({
  q: 'München',
  role: 'VNB',
  city: 'München',
  postCode: '80331'
});
const response = await fetch(`/api/v1/codes/search?${params}`);
```

## Backward Compatibility

Die Erweiterung ist vollständig rückwärtskompatibel:
- Bestehende API-Aufrufe ohne `role` Parameter funktionieren unverändert
- Alle bisherigen Filter werden weiterhin unterstützt
- Keine Breaking Changes in den Schnittstellen

## Nächste Schritte

Mögliche zukünftige Erweiterungen:
- Unterstützung für mehrere Rollen gleichzeitig (Multi-Select)
- Auto-Complete für Marktrollenwerte basierend auf verfügbaren Daten
- Aggregations-API für Statistiken nach Marktrolle
- Export-Funktion für gefilterte Marktpartnerlisten

## Support

Bei Fragen oder Problemen siehe:
- OpenAPI-Dokumentation: `/api/v2/openapi`
- Testskript: `test-market-role-filter.sh`
- Code-Repository: `src/modules/codelookup/`
