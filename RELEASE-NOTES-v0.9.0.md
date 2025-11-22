# Release Notes - API v2 Version 0.9.0

**Veröffentlicht am:** 22. November 2025

## 🎯 Hauptfeature: Marktrollenfilter

Die Marktpartnersuche unterstützt jetzt die Filterung nach Marktrolle!

### Was ist neu?

Sie können jetzt gezielt nach Marktpartnern mit einer bestimmten Rolle suchen:

- **VNB** - Verteilnetzbetreiber
- **LF** - Lieferanten
- **MSB** - Messstellenbetreiber
- **UNB/ÜNB** - Übertragungsnetzbetreiber

### Schnellstart

**API-Beispiel:**
```bash
# Alle Verteilnetzbetreiber finden
curl "https://stromhaltig.de/api/v2/market-partners/search?q=&role=VNB&limit=10"

# Nach Stadtwerken suchen, die Verteilnetzbetreiber sind
curl "https://stromhaltig.de/api/v2/market-partners/search?q=Stadtwerke&role=VNB"
```

**JavaScript-Beispiel:**
```javascript
// Alle Lieferanten in München
const response = await fetch(
  '/api/v2/market-partners/search?q=München&role=LF'
);
const data = await response.json();
console.log(data.data.results);
```

### Wo verfügbar?

Der neue `role` Parameter ist auf allen Market-Partners-Endpunkten verfügbar:

- ✅ `GET /api/v2/market-partners/search` (öffentlich)
- ✅ `GET /api/public/market-partners/search` (öffentlich)
- ✅ `GET /api/v1/codes/search` (authentifiziert)

### UI-Integration

In der Weboberfläche finden Sie den neuen Filter unter:

1. Öffnen Sie die Marktpartnersuche
2. Klicken Sie auf **"Filter"**
3. Wählen Sie eine **"Marktrolle"** aus dem Dropdown

### Vollständig rückwärtskompatibel

✅ Keine Breaking Changes  
✅ Bestehende API-Aufrufe funktionieren unverändert  
✅ Neue Filter sind optional  

### Dokumentation

- 📖 **Feature-Guide:** `docs/market-role-filter.md`
- 🔧 **Testskript:** `test-market-role-filter.sh`
- 📋 **OpenAPI:** `GET /api/v2/openapi`
- 📝 **Changelog:** `CHANGELOG-API-v2.md`

### Anwendungsfälle

**1. Compliance & Reporting:**
Erstellen Sie Listen aller Verteilnetzbetreiber für Compliance-Berichte.

**2. Markforschung:**
Analysieren Sie Marktstrukturen nach Marktteilnehmer-Typen.

**3. Geschäftsentwicklung:**
Identifizieren Sie potenzielle Geschäftspartner nach ihrer Marktrolle.

**4. Datenqualität:**
Validieren Sie Marktpartner-Daten anhand ihrer registrierten Rollen.

### Technische Details

- **Datenquellen:** MongoDB und PostgreSQL
- **Performance:** Optimierte Indizes für schnelle Abfragen
- **Validierung:** Schema-Validierung mit OpenAPI 3.1.0
- **Testing:** Vollständige Testabdeckung mit automatisierten Tests

### Nächste Schritte

Geplante Erweiterungen für zukünftige Versionen:

- 🔮 Multi-Role-Filter (mehrere Rollen gleichzeitig)
- 📊 Aggregations-API für Statistiken nach Marktrolle
- 📥 CSV/Excel-Export für gefilterte Listen
- 🔍 Auto-Complete für Rollensuche

### Support

Fragen oder Feedback? Wir helfen gerne!

- 📧 Kontakt über die Willi-Mako Plattform
- 🐛 Issues: GitHub Repository
- 📚 Dokumentation: `/api/v2/openapi`

---

**Vielen Dank für die Nutzung von Willi-Mako API v2!** 🚀
