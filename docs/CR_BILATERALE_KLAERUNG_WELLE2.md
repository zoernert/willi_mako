# Change Request (Welle 2): Bilaterale Klärung – Attachments, SLAs serverseitig, KPIs/Reports

Stand: 2025-09-04 • Bezug: docs/CR_BILATERALE_KLAERUNG_WELLE1.md, docs/PLAN_KLAERFALL.md

## 1. Ziel und Scope
- Ziel: W1 stabilisieren und produktionsreif skalieren: Attachments-UX, serverseitige SLA/Statusfelder, robuste KPIs/Reports.
- Scope (Welle 2):
  - Attachment-Management UI (Upload/Mehrfach, Vorschau, Zuordnung zu Emails/Notizen).
  - Serverseitige Felder: waitingOn, nextActionAt, slaDueAt, lastEditedBy; Migrations-/API-Anpassungen.
  - KPI & Reporting: Aging-Buckets serverseitig, „Due today/Overdue“ Aggregation, Exporte (CSV/JSON).
  - Assignment/Watcher (leichtgewichtig): Verantwortlicher + optionale Watcher; Notifications stub.
  - Stabilisierung: Lint/act()-Warnungen aufräumen, Testhärte erhöhen.
- Out of scope: IMAP/Webhook-Inbound (ggf. W3), Automations/Workflows.

## 2. Architektur-/Datenmodelländerungen
- DB: Migrationen für neue Spalten auf `bilateral_clarifications` und `clarification_activities`.
  - `waiting_on` ENUM('PARTNER','US') NOT NULL DEFAULT 'US'
  - `next_action_at` TIMESTAMP WITH TIME ZONE NULL
  - `sla_due_at` TIMESTAMP WITH TIME ZONE NULL
  - `last_edited_by` UUID NULL (FK users)
- APIs anpassen/erweitern:
  - GET/POST/PATCH geben/akzeptieren neue Felder; Server übernimmt Derivation on-write.
  - GET `/kpis/bilateral-clarifications` liefert Buckets (aging, overdue) und counts.
  - POST `/attachments` mit metadata (linked_to: emailId|clarificationId, contentType, size, filename).

## 3. Komponenten/UX
- Attachment-Panel im Detailmodal: Drag&Drop, Upload-Queue, Preview (image/pdf), Link zu Email/Notiz, Badge-Anzeige in Timeline.
- Board/List Chips lesen serverseitige `waitingOn/nextActionAt/slaDueAt` ohne Client-Derivation.
- Export-Button: CSV/JSON mit Feldern (ID, Partner, Status, waitingOn, nextActionAt, slaDueAt, age, owner).
- Assignment/Watcher: einfache Auswahl/Chips; Watcher erhalten Benachrichtigungsstub (UI Hinweis).

## 4. Implementierungsschritte (Tasks)
1) DB-Migrationen schreiben, Rollback testen.
2) Server-Modelle/Repos/Services anpassen; Write-Paths setzen Derivation; Read-Paths liefern Felder.
3) API-Contracts versionieren und Dokumentation aktualisieren.
4) Client: Umschalten auf serverseitige Felder; Entfernen/downgrade der Client-Derivation (Feature-Toggle für Fallback).
5) Attachment-UI implementieren; Upload-API anbinden; Timeline-Integration.
6) KPI-Endpunkt anbinden; Dashboard auf serverseitige Buckets umstellen.
7) Assignment/Watcher minimal; UI + API.
8) Tests: Unit (Server + Client), Integration (Upload/Derivation/Board/KPIs), Seed-Daten für e2e-light.
9) Cleanup: Lint/act()-Warnungen; Refactor gemeinsame UI-Helfer.

## 5. Akzeptanzkriterien
- Server persistiert `waitingOn/nextActionAt/slaDueAt/lastEditedBy` konsistent; Client zeigt dieselben ohne lokale Derivation.
- Attachment-Upload funktioniert (Mehrfach), Dateien erscheinen mit Badges in Timeline und sind Email/Notiz zugeordnet.
- KPI-Dashboard nutzt serverseitige Aggregationen; CSV/JSON-Export verfügbar und korrekt.
- Board/List verhalten sich identisch zu W1, aber ohne clientseitige Ableitungslogik.
- Assignment/Watcher setzbar; Oberfläche zeigt Verantwortliche/Watcher-Chips.

## 6. Risiken & Mitigation
- Datenmigration: Safe rollout mit Feature-Flags und Shadow-write (parallel Felder befüllen), Backfill-Job.
- Größe/Quantität von Attachments: Limits, Virus-Scan-Hook (Stub), S3 presigned URLs.
- API-Vertrag: Versionierung `v2`, Kompatibilität via Fallback in Client (Toggle).

## 7. Timeline/Schätzung
- 2–3 Wochen (2 Devs) inkl. Backend-Migration, UI, Tests, Docs.

## 8. Rollout
- Feature-Flags: `serverFields.enabled`, `attachments.enabled`, `kpiServer.enabled`.
- Staged: Pilot → breiter Rollout; Monitoring und Feedback-Schleife.

## 9. Umsetzungsstand (2025-09-04)
- Backend: Fertig. Tabellen erweitert (`waiting_on`, `next_action_at`, `sla_due_at`, `last_inbound_at`, `last_outbound_at`), Endpunkte für E-Mails, Attachments, `GET /statistics` (auth-geschützt), `GET /export`, Routenreihenfolge fixiert.
- Client: Flags verdrahtet und jetzt standardmäßig aktiv (`serverFields`, `kpiServer`, `attachments`). Listen/Board nutzen Serverfelder; KPI-Karten nutzen Server-Summary, mit Fallback auf `/statistics` und weiterem Fallback auf Client-Derivation.
- Tests: Legacy-Unit-Tests grün; spezifische Client-Tests für Flag-Pfade ausstehend.

Offen/Nächste Schritte
- Client-Tests ergänzen (Serverfelder vs. Derivation, KPIs mit 401-Fallback, Attachments-UI).
- E-Mail-Versand härten (derzeit Stub/Recording) und Validierungen erweitern.
- Staging-Smoketest mit aktivierten Flags; Monitoring und Auth-Policy für `/statistics` finalisieren.
