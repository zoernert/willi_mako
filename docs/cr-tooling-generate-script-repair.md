# Change Request – Wiederaufnahme fehlgeschlagener Skript-Jobs

## Zielsetzung
- **Problem:** Bei der Skriptgenerierung treten vereinzelt Fehler auf (z.\u202fB. `missing_code`), die aktuell einen manuellen Neuauftrag erfordern.
- **Ziel:** Der Client soll dieselbe Session weiterverwenden und die API um eine Reparatur bitten können, ohne dass Nutzer:innen die ursprünglichen Eingaben erneut zusammenstellen müssen.
- **Erfolgskriterium:** `generate-script` liefert nach einer automatischen Reparatur zuverlässig lauffähige Beispielskripte für Standardaufgaben (MSCONS \u2192 CSV, etc.).

## Implementierte Backend-Anpassungen
- Neuer Endpunkt `POST /api/v2/tools/generate-script/repair` (Authentifizierung & Rate Limit identisch zu `/generate-script`).
- Jobs enthalten nun `continuedFromJobId`, sodass Client & UI Reparaturketten nachvollziehen können.
- Reparaturversuche übernehmen automatisch alle normalisierten Eingaben (Schema, Attachments, Referenzen, Testfälle) und ergänzen optionale neue Hinweise.
- Automatische Hinweise für bekannte Fehlercodes (z.\u202fB. `missing_code`, `invalid_llm_payload`) werden zur Prompt-Instruktion hinzugefügt.
- Reparaturkette ist auf fünf aufeinanderfolgende Versuche begrenzt, um Endlosschleifen zu vermeiden (`429 repair_limit_reached`).

## API-Vertrag
### Request `POST /api/v2/tools/generate-script/repair`
```json
{
  "sessionId": "2f2e7f60-3bc3-4a82-9daa-6c73c57d9d2a",
  "jobId": "4a9f0a38-0f5f-4e7d-9b44-2e05377f6f86",
  "repairInstructions": "Antwort enthielt keinen Code. Bitte liefere das vollständige Modul.",
  "additionalContext": "Beim Import sind OBIS-Codes 1-1:1.29.0 verpflichtend.",
  "attachments": [
    {
      "filename": "MSCONS.edi",
      "content": "UNH+...",
      "mimeType": "application/edifact",
      "description": "Originalnachricht"
    }
  ]
}
```
- `sessionId` & `jobId` sind Pflicht (UUID).
- `repairInstructions` max. 600 Zeichen, `additionalContext` max. 2000 Zeichen.
- `attachments`, `referenceDocuments`, `testCases` entsprechen den bestehenden Schemas und werden mit bisherigen Werten gemerged (Duplikate via Hash entfernt).

### Response `202 Accepted`
```json
{
  "success": true,
  "data": {
    "sessionId": "2f2e7f60-3bc3-4a82-9daa-6c73c57d9d2a",
    "job": {
      "id": "b284c217-3088-4e2a-bcc6-8d37f6fb9552",
      "type": "generate-script",
      "status": "queued",
      "continuedFromJobId": "4a9f0a38-0f5f-4e7d-9b44-2e05377f6f86",
      "progress": {
        "stage": "queued",
        "message": "Reparaturversuch wird neu gestartet"
      },
      "warnings": [
        "Fortsetzung von Job 4a9f0a38-0f5f-4e7d-9b44-2e05377f6f86 (missing_code)"
      ]
    }
  }
}
```

## Hinweise für Client-Teams
- Bei Fehlermeldungen (`job.status === 'failed'`) mit Codes wie `missing_code`, `invalid_llm_payload`, `script_generation_failed` sollte der Client automatisch `/generate-script/repair` aufrufen.
- Bereits bekannte Attachments/Testfälle müssen **nicht** erneut hochgeladen werden, können aber ergänzt werden. Die API dedupliziert anhand Dateiname + Inhalt-Hash.
- Zusätzliche Hinweise gehören in `repairInstructions`; längere Erklärungen in `additionalContext`.
- Nach `429 repair_limit_reached` ist ein manueller Eingriff nötig (z.\u202fB. neue Eingaben oder Support).
- UI/CLI sollten `continuedFromJobId` anzeigen, um Reparaturketten im Verlauf zu dokumentieren.

## Offene Aufgaben
- Type-Check/Build erneut ausführen, sobald die npm-Umgebung verfügbar ist.
- CLI anpassen, damit fehlgeschlagene Jobs automatisch den Reparatur-Endpunkt triggern.
