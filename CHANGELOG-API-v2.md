# Changelog - Willi-Mako API v2

## Version 0.9.0 (2025-11-22)

### Neue Features

#### Marktrollenfilter für Marktpartnersuche

Die Marktpartnersuche wurde um einen optionalen Filter nach Marktrolle erweitert. Dies ermöglicht gezielte Suchen nach bestimmten Marktteilnehmern wie Verteilnetzbetreibern, Lieferanten oder Messstellenbetreibern.

**Neue API-Parameter:**
- `role` (optional): Filter nach Marktrolle (Query-Parameter)
  - Unterstützte Werte: `VNB`, `LF`, `MSB`, `UNB`, `ÜNB`, oder vollständige deutsche Bezeichnungen
  - Verfügbar auf allen Market-Partners-Endpunkten:
    - `GET /api/v2/market-partners/search`
    - `GET /api/public/market-partners/search`
    - `GET /api/v1/codes/search`

**Beispiele:**
```bash
# Alle Verteilnetzbetreiber
GET /api/v2/market-partners/search?q=&role=VNB&limit=10

# Stadtwerke, die Verteilnetzbetreiber sind
GET /api/v2/market-partners/search?q=Stadtwerke&role=VNB

# Alle Lieferanten
GET /api/v2/market-partners/search?q=&role=LF

# Messstellenbetreiber mit "EMH" im Namen
GET /api/v2/market-partners/search?q=EMH&role=MSB
```

**Backend-Implementierung:**
- MongoDB-Unterstützung: Filtert nach `partner.BdewCodeFunction` und `contacts.BdewCodeFunction`
- PostgreSQL-Unterstützung: Filtert nach `code_type` Spalte
- Vollständig rückwärtskompatibel

**Frontend-Erweiterung:**
- Neues Dropdown-Feld für Marktrollenfilter in der CodeLookup-Komponente
- Automatische Integration in bestehende Filter-UI
- Unterstützt alle gängigen Marktrollen mit deutschen Bezeichnungen

**Dokumentation:**
- Vollständige OpenAPI-Spezifikation mit Enum-Werten und Beispielen
- Neue Dokumentation unter `docs/market-role-filter.md`
- Testskript verfügbar: `test-market-role-filter.sh`

### Geänderte Dateien

**Backend:**
- `src/modules/codelookup/interfaces/codelookup.interface.ts` - Neues `marketRole` Feld
- `src/modules/codelookup/repositories/mongo-codelookup.repository.ts` - MongoDB-Filter
- `src/modules/codelookup/repositories/postgres-codelookup.repository.ts` - PostgreSQL-Filter
- `src/presentation/http/routes/api/v2/market-partners.routes.ts` - API v2 Endpunkt
- `src/routes/public-market-partners.ts` - Öffentlicher Endpunkt
- `src/routes/codes.ts` - API v1 Endpunkt
- `src/presentation/http/routes/api/v2/openapi.ts` - OpenAPI-Dokumentation

**Frontend:**
- `src/components/CodeLookup.tsx` - UI-Erweiterung für Marktrollenfilter

**Dokumentation:**
- `docs/market-role-filter.md` - Vollständige Feature-Dokumentation
- `test-market-role-filter.sh` - Automatisierte Tests

### Breaking Changes

Keine. Die Erweiterung ist vollständig rückwärtskompatibel.

---

## Version 0.8.0

Erweiterte Positionierung: Von Marktkommunikation zu ganzheitlicher Energiewirtschafts-Expertise.

## Version 0.7.0

Vorherige Version mit Basis-Marktpartnersuche.

---

## Migrationshinweise

### Von 0.8.0 auf 0.9.0

Keine Migration erforderlich. Der neue `role` Parameter ist optional und ändert das bestehende API-Verhalten nicht.

**Empfohlene Nutzung:**

Wenn Sie Listen von Marktpartnern nach Rolle filtern möchten, fügen Sie einfach den `role` Query-Parameter hinzu:

```javascript
// Vorher (0.8.0)
const response = await fetch('/api/v2/market-partners/search?q=München');

// Nachher (0.9.0) - mit Rollenfilter
const response = await fetch('/api/v2/market-partners/search?q=München&role=VNB');
```

### Unterstützte Marktrollen

| Abkürzung | Deutsche Bezeichnung | Beschreibung |
|-----------|---------------------|--------------|
| VNB | VERTEILNETZBETREIBER | Verteilnetzbetreiber |
| LF | LIEFERANT | Energielieferant |
| MSB | MESSSTELLENBETREIBER | Messstellenbetreiber |
| UNB/ÜNB | ÜBERTRAGUNGSNETZBETREIBER | Übertragungsnetzbetreiber |

---

## Support & Feedback

- OpenAPI-Dokumentation: `GET /api/v2/openapi`
- Feature-Dokumentation: `docs/market-role-filter.md`
- Testskript: `test-market-role-filter.sh`
- GitHub Issues: [willi_mako Repository](https://github.com/zoernert/willi_mako)
