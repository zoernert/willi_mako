# Chat-Konfiguration - Schnellstart

## ✅ Installation erfolgreich abgeschlossen!

Das Admin Chat-Konfiguration System ist jetzt einsatzbereit und erfolgreich kompiliert.

## 🚀 Erste Schritte

### 1. Datenbank-Migration ausführen

```bash
# Im Projekt-Root-Verzeichnis
./deploy-chat-config.sh
```

### 2. Server starten

```bash
# Backend starten
npm run dev

# Frontend starten (neues Terminal)
cd client
npm start
```

### 3. Admin-Interface aufrufen

1. Im Browser zu `http://localhost:3000/admin` navigieren
2. Mit Admin-Account einloggen
3. Tab "Chat-Config" auswählen

## 🔧 Erste Konfiguration erstellen

1. **"Neue Konfiguration" klicken**
2. **Name vergeben**: z.B. "Optimierte Energiewirtschaft"
3. **System-Prompt anpassen**: Speziell für deine Use Cases
4. **Verarbeitungsschritte konfigurieren**:
   - Anfrage-Verständnis: ✅ Aktiviert
   - Kontext-Suche: ✅ Aktiviert (Score-Schwelle: 0.6)
   - Kontext-Optimierung: ✅ Aktiviert
   - Antwort-Generierung: ✅ Aktiviert
   - Antwort-Validierung: ⚠️ Optional

## 🧪 Test durchführen

1. **Test-Anfrage eingeben**: "Wie funktioniert die Bilanzkreisabrechnung?"
2. **"Test starten" klicken**
3. **Ergebnisse analysieren**:
   - Antwort-Qualität bewerten
   - Verarbeitungszeit prüfen
   - Kontext-Relevanz validieren

## ✨ Konfiguration aktivieren

1. **Getestete Konfiguration auswählen**
2. **"Aktivieren" klicken**
3. **✅ System verwendet jetzt die neue Konfiguration**

## 📊 Performance überwachen

- **Durchschnittliche Antwortzeit**: Sollte unter 3000ms bleiben
- **Erfolgsrate**: Ziel: >95%
- **Test-Historie**: Regelmäßig überprüfen

## 🔍 Troubleshooting

### Problem: Migration schlägt fehl
```bash
# Datenbank-Verbindung prüfen
psql -h localhost -U postgres -d willi_mako -c "\dt"
```

### Problem: Konfiguration wird nicht geladen
```javascript
// Browser-Konsole öffnen und prüfen:
fetch('/api/admin/chat-config').then(r => r.json()).then(console.log)
```

### Problem: Tests schlagen fehl
- Qdrant-Service läuft: `curl http://localhost:6333/health`
- Gemini-API-Key gesetzt: `echo $GEMINI_API_KEY`

## 🎯 Nächste Schritte

1. **Mehrere Konfigurationen testen**: Erstelle A/B-Test Szenarien
2. **Performance optimieren**: Tune Score-Schwellenwerte
3. **Domänen-spezifische Prompts**: Entwickle energiewirtschaftliche Prompts
4. **Automatische Tests**: Erstelle wiederkehrende Test-Suites

---

**Status**: ✅ System bereit für Produktion  
**Build**: ✅ Erfolgreich kompiliert  
**Integration**: ✅ Chat-Route integriert

*Erstellt: 27. Januar 2025*
