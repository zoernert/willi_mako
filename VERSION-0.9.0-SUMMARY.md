# Version 0.9.0 Update - Übersicht

## Was wurde geändert?

### 1. OpenAPI-Spezifikation aktualisiert

**Datei:** `src/presentation/http/routes/api/v2/openapi.ts`

- ✅ Version von `0.8.0` auf `0.9.0` erhöht
- ✅ Beschreibung erweitert um Marktrollenfilter-Feature
- ✅ Neuer `role` Parameter vollständig dokumentiert mit:
  - Enum-Werten (VNB, LF, MSB, UNB, ÜNB, etc.)
  - Beispielen für jede Marktrolle
  - Deutscher Beschreibung

### 2. Neue Dokumentation erstellt

**Dateien:**
- `CHANGELOG-API-v2.md` - Vollständiges Changelog mit allen Versionen
- `RELEASE-NOTES-v0.9.0.md` - Release Notes für v0.9.0
- `docs/market-role-filter.md` - Technische Feature-Dokumentation
- `test-market-role-filter.sh` - Automatisierte Tests

### 3. Implementierte Features (bereits in vorherigen Schritten)

**Backend:**
- ✅ SearchFilters Interface erweitert
- ✅ MongoDB Repository mit Rollenfilter
- ✅ PostgreSQL Repository mit Rollenfilter
- ✅ API v2 Endpunkt erweitert
- ✅ Public API erweitert
- ✅ API v1 erweitert

**Frontend:**
- ✅ CodeLookup Komponente mit Marktrollenfilter-UI

## Version 0.9.0 Highlights

### Hauptfeature: Marktrollenfilter

Die API ermöglicht jetzt die gezielte Suche nach Marktpartnern basierend auf ihrer Marktrolle:

```bash
# Beispiel: Alle Verteilnetzbetreiber
GET /api/v2/market-partners/search?q=&role=VNB

# Beispiel: Stadtwerke, die Lieferanten sind
GET /api/v2/market-partners/search?q=Stadtwerke&role=LF
```

### Unterstützte Marktrollen

| Code | Bezeichnung | Verwendung |
|------|-------------|------------|
| VNB | Verteilnetzbetreiber | Netzbetreiber auf Verteilnetzebene |
| LF | Lieferant | Energielieferanten |
| MSB | Messstellenbetreiber | Betreiber von Messstellen |
| UNB/ÜNB | Übertragungsnetzbetreiber | Netzbetreiber auf Übertragungsebene |

### API-Verfügbarkeit

Der Filter ist verfügbar auf:
- `/api/v2/market-partners/search` (öffentlich, keine Auth)
- `/api/public/market-partners/search` (öffentlich, keine Auth)
- `/api/v1/codes/search` (authentifiziert)

### Rückwärtskompatibilität

✅ **Vollständig rückwärtskompatibel**
- Keine Breaking Changes
- Bestehende API-Calls funktionieren unverändert
- Neuer Parameter ist optional

## Deployment-Schritte

1. **Backend deployen** (enthält alle Repository- und Service-Änderungen)
2. **Frontend deployen** (enthält UI-Erweiterungen)
3. **Tests ausführen:**
   ```bash
   ./test-market-role-filter.sh
   ```
4. **OpenAPI-Dokumentation prüfen:**
   ```bash
   curl https://stromhaltig.de/api/v2/openapi | jq '.info.version'
   # Sollte "0.9.0" zurückgeben
   ```

## Verifikation

Nach dem Deployment verifizieren:

1. ✅ OpenAPI zeigt Version 0.9.0
2. ✅ `/api/v2/market-partners/search?q=&role=VNB` liefert nur VNBs
3. ✅ UI zeigt Marktrollenfilter-Dropdown
4. ✅ Bestehende Suchanfragen ohne `role` funktionieren weiterhin

## Support-Ressourcen

- **OpenAPI-Docs:** `GET /api/v2/openapi`
- **Feature-Guide:** `docs/market-role-filter.md`
- **Tests:** `test-market-role-filter.sh`
- **Changelog:** `CHANGELOG-API-v2.md`
- **Release Notes:** `RELEASE-NOTES-v0.9.0.md`

---

**Version 0.9.0 ist bereit für Production!** ✅
