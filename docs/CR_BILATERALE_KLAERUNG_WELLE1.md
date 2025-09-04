# Change Request (Welle 1): Bilaterale Klärung – Übersicht, E-Mail-Basis, Board-Workflow

Stand: 2025-09-04 • Bezug: docs/PLAN_KLAERFALL.md

## 1. Ziel und Scope
- Ziel: Praxistaugliche Bearbeitung von ~100 offenen Klärfällen durch bessere Übersicht, Antwort-Tracking und schnellen Versand – ohne Backend-Großumbau.
- Scope (Welle 1):
  - Board-Ansicht als Default (Kanban) mit Spalten inkl. Backlog.
  - „Meine Klärfälle“ nach letztem Bearbeiter.
  - E-Mail Composer mit „Senden als“ (Team-/User‑Identität) und Validierung.
  - Inbound-Start über Copy & Paste (Textfeld) und EML‑Upload.
  - Warten/Antwort‑Derivation im Frontend (waitingOn, staleSinceDays).
  - Gespeicherte Sichten/Filter.
- Out of scope (später): Webhook/IMAP-Inbound, SLA/Eskalations-Backend, Assignment/Watcher, gemeinsame /activities‑API.

## 2. Business‑Vorgaben (beschlossene Defaults)
- Meine Klärfälle = Fälle, an denen ich zuletzt gearbeitet habe.
- Standardwartezeit (Next Action): 3 Tage.
- Board‑Spalten (Initial):
  1) Klärfall in Vorbereitung (Backlog)
  2) Benötigt unsere Antwort
  3) Wartet auf Partner
  4) Interne Klärung
  5) Überfällig / Eskalation
- Senden als: Team‑Identität; Nutzer ohne Team: <username>@stromhaltig.de (normalisiert).
- Partner‑initiierte Erstkontakte: waitingOn=US, SLA 3 Tage.

### 2.1 Terminologie & Leitfaden‑Anker (aus Whitepaper)
- System of Engagement (SoE) vs. System of Record (ERP): Klärfälle leben im SoE; ERP bleibt Wahrheitsquelle/Ausführung.
- 4‑Phasen‑Modell: Triage → Analyse → Kommunikation/Dokumentation → Abschluss/Prävention (Root‑Cause).
- KPIs (Leitfaden): Case Aging, First Contact Resolution, Re‑opening Rate, Backlog, Top‑Root‑Causes.
- SLAs: Reaktions-/Lösungszeit mit Ampel/Eskalation als Zielbild.
- „Single Pane of Glass“: alle relevanten Infos/Aktionen im Klärfall‑Cockpit.

## 3. Bestehende Implementierung (Nutzung/Kompatibilität)
- Service: `app-legacy/src/services/bilateralClarificationService.ts`
  - Vorhanden: `sendClarificationEmail`, `getEmailHistory`, `validateMarketPartnerEmail`, `updateStatus`, `getClarifications`, Team‑Sharing, Notes/Attachments, References, `createFromChatContext`/`createFromMessageAnalyzerContext`.
  - Nutzung in Welle 1:
    - Versand über `sendClarificationEmail` + `updateStatus` → setzt waitingOn=PARTNER (Frontend‑Derivation, bis Backend‑Felder existieren).
    - Antwort‑Derivation: `getEmailHistory` (falls verfügbar) ODER aus importierten E‑Mails; daraus `lastInboundAt`/`lastOutboundAt` ableiten.
- Doppelter Service (`bilateralClarificationService_new.ts`) bleibt ungenutzt; keine Änderungen geplant.
- API laut `docs/bilateral-clarifications-api.md`: `POST /:id/emails` existiert → für Copy‑&‑Paste/EML‑Import nutzen.

### 3.1 Prozess‑Mapping (4‑Phasen)
- Triage (W1): Fall anlegen, Case‑Type/Priorität setzen, Board‑Einordnung.
- Analyse (W1): Timeline/Notizen/Referenzen; E‑Mail‑Thread‑Badges zur Orientierung.
- Kommunikation/Doku (W1): In/Out Mail, Chips, auditierbare Chronik im Ticket.
- Abschluss/Prävention (W2): Root‑Cause‑Feld und KPI‑Zählung beim Schließen.

## 4. Fachliche Änderungen (Welle 1)
### 4.1 Board‑Ansicht (Default Route: /app/bilateral-clarifications)
- Neue Default-Ansicht: Kanban mit Spalten (s. Vorgaben) + Zähler pro Spalte.
- Karteninhalte: Titel, Marktpartner, Priorität, Verantwortlich/letzter Bearbeiter, Wartet auf, Wartet seit, SLA fällig. (List‑Ansicht: identische Spalten ergänzt)
- Sortierung in Spalten: nextActionAt (aufsteigend), dann Priorität.
- Neue Fälle: landen initial in „Klärfall in Vorbereitung“ bis zur ersten Aktivität.

### 4.2 „Meine Klärfälle“
- Filter „letzter Bearbeiter == aktueller Nutzer“ (Frontend/Backend, je nach Verfügbarkeit). Bis Serverfeld existiert, auf Client ableiten aus letzter Aktion (Note/Email/Status von mir).

### 4.3 E‑Mail Composer
- From/Identität:
  - Team‑Identität (Standard für Team‑Mitglieder): `team-<slug>@stromhaltig.de`.
  - Fallback für Nutzer ohne Team: `<username>@stromhaltig.de` (Normalisierung: lowercase, Umlaute ae/oe/ue/ss, Sonderzeichen→`-`, `[a-z0-9.-]`).
- Empfänger-Validierung: `validateMarketPartnerEmail`.
- Nach Versand: Frontend setzt `waitingOn=PARTNER`, `nextActionAt = now + 3 Tage`, Status optional via `updateStatus`.

### 4.4 Inbound (Copy & Paste / EML‑Upload)
- Copy & Paste: Einfaches Textfeld (optional Headerblöcke erlaubt). Parser extrahiert Subject/From/Date (Best Effort); Body wird als INCOMING E‑Mail gespeichert.
- EML‑Upload: akzeptiert `.eml`; Attachment‑Upload separat (optional in Welle 1 eingeschränkt).
- Speicherung: `POST /api/bilateral-clarifications/:id/emails` (direction=INCOMING, contentType=text/plain oder message/rfc822, minimal required fields). UI zeigt Eintrag in Timeline und triggert waitingOn=US.

### 4.5 Frontend‑Derivation (ohne Backend‑Felder)
- `lastOutboundAt`, `lastInboundAt`: aus Emails (Composer‑Versand + importierte INCOMING) bestimmen.
- `waitingOn`: if lastOutboundAt > lastInboundAt → PARTNER, sonst US.
- `staleSinceDays`: Tage seit `max(lastInboundAt,lastOutboundAt)` abhängig von `waitingOn`.

### 4.6 Gespeicherte Sichten/Filter

## Fortschritt (Welle 1)
- Gesamtfortschritt: ca. 100% abgeschlossen
- Einzelstatus:
  - Board (Default, Sortierung, Chips): 100%
  - Derivation waitingOn/staleSince/nextActionAt/slaDueAt/lastEditedBy (inkl. SENT/PENDING‑Inference): 100%
  - E‑Mail Composer „Senden als“ + Validierung + „Senden & warten“-Flow: 100%
  - Inbound Import (Copy & Paste, EML): 100%
  - Timeline‑Badges (IN/OUT, Wichtig, Thread‑Hint): 100%
  - Gespeicherte Sichten (LocalStorage): 100% (Basis + Presets)
  - Listenansicht: Spalten „Wartet auf / Wartet seit / SLA fällig“: 100%
  - Letzter Bearbeiter: 100% (zeigt „ich“ oder Anzeigename via Resolver)
  - KPIs Dashboard: Überfällig, Heute fällig, Aging‑Buckets, Überfällig‑Buckets: 100%
  - Tests (Unit/Light Integration): vorhanden (Derivationen) – grün
  - Kurz‑Doku/Help: Quick‑Guide ergänzt

### 4.7 KI‑Assist minimal (Hook)
### 4.8 Organisation & Rollen (Leitfaden)
- Hybridmodell: Zentrales Triage‑Team (Erstaufnahme, Priorisierung, SLAs) + benannte Fachexperten je Typ.
- Prozesshoheit: Triage überwacht Fristen/Eskalation; Fachexperten lösen; zentraler Abschluss/Doku.
- Wellenbezug: W1 beschreibt Modell; Zuweisung/Watcher/SLAs serverseitig ab W2.

### 4.9 KPIs & Monitoring (Minimal in W1)
- W1: Anzeige Aging (Tage), „wartet auf“, fällig/überfällig; einfache Kennzahlen im Dashboard.
- W2+: Aging‑Buckets, FCRR, Re‑opening, Top‑Root‑Causes; Reports/Exports.

- Composer‑Button „Coach empfehlen“: ruft vorerst Platzhalter-Service (ohne Backendänderung) und schlägt Template basierend auf `extractContextData` vor.

## 5. UI/Komponentenänderungen
- Neue/erweiterte Komponenten (Legacy):
 5) Timeline badges/labels (IN/OUT, Thread‑Hint). — erledigt
 6) Gespeicherte Sichten (LocalStorage). — erledigt (Basis)
  - `EmailImportDialog` (neu): Copy‑&‑Paste + EML‑Upload.
  - `EmailComposerDialog` (erweitern): Send‑as Auswahl, Validierung, Status‑Option „Senden & warten“.
  - `Timeline` (erweitert): Direction‑Badges, Thread‑Hint umgesetzt.
  - Abschlussdialog (vorbereitet, optional): „Root‑Cause“ Feld (W2 aktivierbar).

## 6. API Nutzung/Erweiterung (Welle 1)
- Nutzung vorhandener Endpunkte:
  - GET `/api/bilateral-clarifications` (Liste)
  - GET `/api/bilateral-clarifications/:id` (Detail)
  - POST `/api/bilateral-clarifications/:id/send-email`
  - GET `/api/bilateral-clarifications/validate-email`
  - POST `/api/bilateral-clarifications/:id/emails` (Inbound manuell)
  - POST `/api/bilateral-clarifications/:id/attachments` (optional für EML‑Attachments später)
  - PATCH `/api/bilateral-clarifications/:id/status` (optional)
- Optionale Ergänzung (wenn Server benötigt):
  - POST `/:id/emails/import` (falls Raw/EML als eigener Endpoint bevorzugt) – sonst nicht nötig.

## 7a. Compliance & Audit (aus Leitfaden)
- UI zeigt vollständige Chronik (Mails, Notizen, Status) pro Fall (W1). Server‑Audit/PII‑Schutz wird in W2 verstärkt.

## 7. Datenmodell (nur Frontend‑Felder in Welle 1)
- Client‑seitig erweitern (nicht persistent):
  - `waitingOn: 'PARTNER' | 'US'`
  - `staleSinceDays: number`
  - `nextActionAt: ISOString` (berechnet)
  - `slaDueAt: ISOString` (nur Anzeige; anfänglich = nextActionAt)
  - `lastEditedBy: userId` (deriviert aus letzter Aktivität lokal)

## 8. Rechte/Rollen
- Senden als Team: nur Team‑Mitglieder der jeweiligen Team‑Identität.
- Nutzer ohne Team: Versand mit `<username>@stromhaltig.de`, Import erlaubt.
- Audit: alle Versand-/Import‑Aktionen mit User‑Attribution.

## 9. Nicht‑funktionale Anforderungen
- Performance: Board lädt paginiert (pro Spalte lazy nach Bedarf), initial 20 Karten.
- Sicherheit: Nur authentifizierte Nutzer; EML‑Uploads begrenzen (z. B. 10MB), Sanitization von Textinhalten.
- E‑Mail‑Compliance: Nutzung stromhaltig.de via SES (SPF/DKIM/DMARC ok). Kein Webhook in Welle 1.

## 10. Migration/Kompatibilität
- Keine Datenmigration nötig.
- Bestehende Funktionen „aus Chat/Marktpartner‑Suche Klärfall erstellen“ bleiben erhalten (weiterhin `createFromChatContext` etc.). Neue Fälle starten im Backlog.

## 11. Implementierungsschritte (Tasks)
1) Board‑Ansicht implementieren (Route‑Default umschalten; Filter/Sortierung; Backlog‑Platzierung).  
2) Derivation waitingOn/staleSince/nextActionAt client‑seitig (Selector/Hook).  
3) EmailComposer erweitern (Send‑as Auswahl, Validierung, Status‑Option, 3‑Tage‑NextAction).  
4) EmailImportDialog (Copy‑&‑Paste + EML) und POST `/:id/emails` anbinden.  
5) Timeline badges/labels (IN/OUT, Thread‑Hint). — erledigt
6) Gespeicherte Sichten (LocalStorage). — erledigt (Basis)
7) KPI‑Mini‑Dashboard verfeinern (Aging‑Buckets, Overdue‑Counts). — teilweise (Aging‑Buckets + Heute‑fällig + Überfällig‑Buckets client‑seitig)
8) Abschlussdialog vorbereiten: optionales „Root‑Cause“ Feld (Feature‑Toggle; W2). — offen
9) Enablement: 2‑seitiger Quick‑Guide (Board, Import, Composer, Sichten). — erledigt (Kurzfassung im Benutzerhandbuch)
7) Tests (Unit + Light Integration), QA mit 20–50 Dummy‑Fällen.  
8) Docs/Help aktualisieren (User Guide Kurzkapitel „Board & Import“).

## 12. Akzeptanzkriterien (Welle 1)
- Board ist Default; neue Fälle erscheinen im Backlog.
- Jede Karte zeigt „Wartet auf“ und „SLA fällig/überfällig“ Chips; „Wartet seit“ (Age) wird angezeigt; Sortierung nach nextActionAt umgesetzt.
- Composer: Versand mit Team‑Identität (oder `<username>@stromhaltig.de` ohne Team) funktioniert; Empfänger wird validiert.
- Nach Versand: Fall wechselt in „Wartet auf Partner“, nextActionAt=+3 Tage.
- Copy‑&‑Paste und EML‑Import legen INCOMING E‑Mail an und setzen waitingOn=US.
- Timeline zeigt IN/OUT, Wichtig‑Flag, Antwort/Thread‑Hinweise bei E‑Mails.
- Auditierbarkeit (W1): Chronologische Anzeige der Aktivitäten im UI mit Zeitstempeln.
- KPIs (minimal): Dashboard‑Kacheln (Überfällige, Team‑Shared, Resolved‑This‑Month); Karten/Chips mit Aging/SLA.
- „Meine Klärfälle“ filtert Fälle, an denen ich zuletzt aktiv war.

## 13. Risiken & Mitigation
- Unsaubere Zuordnung importierter Mails → Nutzer bestätigt Klärfall im Dialog; später Webhook/IMAP + Plus‑Addressing.
- Fehlende Backend‑Felder → Derivation im Frontend; Welle 2 fügt serverseitige Felder hinzu.
- SES Zustellgrenzen → moderates Testvolumen, Retry/Fehlermeldungen im UI.
- Kulturwandel (Leitfaden): frühe Kommunikation, Schulungen/Key‑User, Quick‑Wins (Board/Import), klare Rollen im Hybridmodell.

## 14. Rollout/Feature‑Toggles
- Toggles: `boardView.enabled`, `emailImport.enabled`, `sendAsIdentity.enabled` (pro Tenant).  
- Staged: interner Test (Team), dann Pilot‑Kunden.

## 15. Testplan (Auszug)
- Unit: waitingOn/staleSince Derivation; Username‑Normalisierung; Board‑Sortierung.  
- Integration: Composer Versand → Statuswechsel; Import → Timeline/Derivation.  
- UX: Gespeicherte Sichten persistieren; Board‑Filter korrekt.

## 16. Abhängigkeiten
- SES auf stromhaltig.de aktiv; keine Webhooks nötig in Welle 1.
- Keine DB‑Migrationen in Welle 1.

## 17. Aufwand/Timeline (Schätzung)
- Implementierung: 1,5–2,5 Wochen (2 Devs) inkl. Tests/Docs.  
- Puffer: +0,5 Woche für QA und Pilotfeedback.

## 18. Anhänge/Referenzen
- Plan: `docs/PLAN_KLAERFALL.md`
- Systemdoku: `docs/bilateral-clarifications.md`
- API: `docs/bilateral-clarifications-api.md`
- User Guide: `docs/bilateral-clarifications-user-guide.md`


## 19. Release-Checklist (Welle 1)
- Version/Tag: Release-Branch erstellen, Tag `w1-bilaterale-klaerung` setzen.
- Changelog: Kurzfassung der Änderungen (Board default, Composer, Import, KPIs, gespeicherte Sichten).
- Feature-Toggles: `boardView.enabled`, `emailImport.enabled`, `sendAsIdentity.enabled` auf Pilot aktiviert.
- Tests: Unit/Light-Integration grün; Smoke: Composer (Senden & warten) und Import (Paste/EML) in Staging manuell prüfen.
- Sicherheit/SES: SPF/DKIM/DMARC Status prüfen, SES Sandbox/Freigaben OK.
- Monitoring: Browser-Fehlerquote (Sentry/Console) beobachten, FAQs/Supporthinweise bereitstellen.
- Handover: Kurz‑Guide an Pilotnutzer, Feedback‑Kanal (Slack/Jira) verlinkt.

## 20. Bekannte Warnungen & Follow-ups
- Test-Warnungen (Material UI TouchRipple, act() Hinweise) in fachfremden Tests vorhanden – kein Blocker; Cleanup in gemeinsamem UI‑Test‑Refactor bündeln.
- Attachment‑Management UI: in Welle 2 vorgesehen (Datei‑Vorschau, Multi‑Upload, Mapping zu E‑Mail‑Einträgen).
- Serverseitige Felder (waitingOn/nextActionAt/slaDueAt/lastEditedBy): Welle 2 – reduziert Client‑Derivation und erleichtert KPIs/Reports.
