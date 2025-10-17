# Change Request: Asynchrone Skriptgenerierung für Tool-Jobs

## Zusammenfassung
- `/api/v2/tools/generate-script` liefert ab sofort **einen Job (202 Accepted)** statt eines direkten Skript-Responses.
- Neue Queue im Backend inklusive Fortschritts- und Fehlermeldungen für Skript-Jobs.
- Clients müssen den Job-Status über `/api/v2/tools/jobs` bzw. `/api/v2/tools/jobs/{jobId}` pollen.
- OpenAPI-Dokumentation und Typdefinitionen wurden angepasst (neue Schemas für `GenerateScriptJob`).

## Hintergrund
In der bisherigen Implementierung generierte das Backend deterministische Skripte synchron. Bei längerer Laufzeit führte dies zu Proxy-Timeouts (30 s) und 422-Fehlern. Option B aus der Evaluierung wurde nun umgesetzt: Die Skriptgenerierung läuft als asynchroner Job, der über eine In-Memory-Queue verarbeitet wird. Damit lassen sich lange LLM- oder Test-Läufe robuster handhaben, ohne dass Client-Requests abbrechen.

## Änderungen im Backend
### Neue/angepasste Endpunkte
| Pfad | Methode | Status | Beschreibung |
| --- | --- | --- | --- |
| `/api/v2/tools/generate-script` | POST | 202 | Enqueued einen `generate-script` Job. Response-Body: `GenerateToolScriptJobResponse` mit `sessionId` & `job`. |
| `/api/v2/tools/jobs` | GET | 200 | Liefert alle Jobs einer Session (Query `sessionId`). |
| `/api/v2/tools/jobs/{jobId}` | GET | 200 | Unverändert, Response enthält jetzt `ToolJob`-Union (RunNodeScript & GenerateScript). |

### Job-Objekt (`type === 'generate-script'`)
```json
{
  "id": "...",
  "type": "generate-script",
  "sessionId": "...",
  "status": "queued|running|succeeded|failed|cancelled",
  "createdAt": "2025-03-18T09:11:12.345Z",
  "updatedAt": "2025-03-18T09:11:45.678Z",
  "progress": {
    "stage": "prompting|repairing|validating|testing|completed",
    "message": "LLM wird aufgerufen",
    "attempt": 1
  },
  "attempts": 1,
  "warnings": [
    "Mindestens ein automatischer Test ist fehlgeschlagen."
  ],
  "result": { /* GenerateToolScriptResponse */ },
  "error": null
}
```

### Fortschrittsphasen
1. `queued`
2. `collecting-context`
3. `prompting`
4. `repairing` (nur bei Wiederholungsversuchen)
5. `validating`
6. `testing` (falls Tests definiert)
7. `completed`

## Auswirkungen auf Client-Implementierung
1. **POST `/tools/generate-script`**: 202-Antwort entgegennehmen, `job.id` speichern.
2. **Polling**: Alle 2–3 Sekunden `GET /tools/jobs/{jobId}` (oder `GET /tools/jobs?sessionId=` für Listenansicht) aufrufen.
3. **Abbruchbedingungen**:
   - `status === 'succeeded'`: Skript & Tests sind fertig -> Ergebnis anzeigen.
   - `status === 'failed'`: Fehlermeldung aus `job.error` anzeigen.
4. **Progress UI**: Optional `progress.stage` + `message` anzeigen.
5. **Warnungen beachten**: `job.warnings` kann zusätzliche Hinweise enthalten (z. B. nicht-deterministische Passagen, fehlgeschlagene Tests).

## Migrationshinweise
- API-Clients, die bislang direkt das Skript erwarteten, müssen auf das Polling-Modell umsteigen.
- Der alte synchronen Rückgabepfad (`generateDeterministicScript`) bleibt intern für Tests bestehen, ist aber nicht mehr über die API erreichbar.
- OpenAPI (`/api/v2/openapi.json`) wurde aktualisiert; bitte Client-SDKs neu generieren.
- Keine Datenbank-Migration notwendig (In-Memory-Queue).

## Offene Punkte / TODOs für das Frontend-Team
- [ ] UI-Update für neue Statusanzeige und Polling.
- [ ] Fehlermeldungen und Warnungen aus Job-Objekt ausgeben.
- [ ] Timeouts/Retry-Strategie für Polling definieren (Empfehlung: max. 2 Minuten oder 40 Polls).

## QA & Monitoring
- Manuelle Tests: Happy Path, Validierungsfehler (z. B. fehlendes `return`), Test-Runner mit fehlschlagender Assertion.
- Logs: Queue-Worker protokolliert unerwartete Fehler via `console.error`.
- Fehlerhafte Jobs behalten `error`-Details (inkl. `code`) zur Auswertung durch Support.

---
**Kontakt:** Team Backend Tooling – bitte Feedback an #team-tooling im Slack oder als Kommentar im CR-Board hinterlassen.
