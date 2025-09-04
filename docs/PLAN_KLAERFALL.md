# Plan: Optimierung „Bilaterale Klärung“

Stand: 2025-09-03 • Gilt für Legacy-Route: `/app/bilateral-clarifications`

## Fortschritt (Welle 1) — Status am 2025-09-03
- Gesamtfortschritt: ca. 75% abgeschlossen.
- Erreicht in dieser Iteration:
  - Board (Kanban) als Default inkl. Chips (Wartet auf, SLA/Next Action, Alter) und Sortierung nach nextActionAt — 100%.
  - Frontend-Derivationen (waitingOn, staleSinceDays, nextActionAt) — ~90%.
  - E-Mail Composer „Senden als“ (Team/Benutzer) + Empfänger-Validierung — ~90%.
  - Inbound Import (Copy & Paste + EML-Upload) — ~85%.
  - Timeline-Badges (Ein-/Ausgehend, Wichtig, Antwort/Thread-Hinweise) — 100%.
  - Gespeicherte Sichten (LocalStorage, Presets + Speichern) — ~80%.
- Offen/Nächste Schritte:
  - Listenansicht: Spalten „Wartet auf“, „Wartet seit“, „SLA fällig“ angleichen — offen.
  - Tests (Unit/Light Integration) und kurze User-Doku/Help — offen.

Welle‑1‑Aufgaben (Abgleich):
- [x] Board‑Ansicht implementieren (Default, Sortierung, Chips)
- [x] Derivation waitingOn/staleSince/nextActionAt client‑seitig
- [x] EmailComposer erweitern (Send‑as, Validierung)
- [x] EmailImportDialog (Copy‑&‑Paste + EML)
- [x] Timeline badges/labels (IN/OUT, Thread‑Hint)
- [x] Gespeicherte Sichten (LocalStorage)
- [ ] Tests (Unit + Light Integration), QA mit Dummy‑Fällen
- [ ] Docs/Help aktualisieren (Kurzkapitel „Board & Import“)

## Hintergrund und Ziel
Mitarbeitende bearbeiten ca. 100 offene Klärfälle parallel. Jeder Fall umfasst mehrere E-Mails. Ohne Systemunterstützung gehen Fälle unter oder bleiben ohne Antwort. Ziel ist, Übersicht, Antwort-Tracking, und zügiges Schließen zu verbessern – mit dem vorhandenen Prozesswissen der Energiewirtschaft.

## Anforderungen (Checkliste)
- Team-zentrierte Standardansicht („Team Klärfälle“).  
- „Meine Klärfälle“ = von mir bearbeitet/zugewiesen/zuletzt aktiv.  
- Antwort-Tracking: erkennt, ob Marktpartner oder wir am Zug sind; „wartet seit X Tagen“.  
- Eskalationen/Erinnerungen/SLAs unterstützen.  
- Prozesswissen (EDIFACT/Problemtypen) für Vorschläge, Playbooks, Textbausteine nutzen.  
- Klare Timeline je Fall: E-Mail Ein/Aus, Notizen, Status, Anhänge, Referenzen.  
- Gespeicherte Sichten/Filter für Alltag („Heute fällig“, „Wartet > 7 Tage“, „Neu“).  

## Beschlossene Defaults (Stand: 2025-09-03)
- „Meine Klärfälle“: Fälle, an denen ich zuletzt gearbeitet habe (letzter Bearbeiter = aktueller Nutzer).  
- Inbound-Start: Copy & Paste von E-Mail-Inhalten (Textfeld) und/oder EML-Import; Webhook/IMAP später.  
- Senden als: Start mit Team-Identität; Nutzer ohne Team senden mit generierter Benutzer-Identität (stromhaltig.de).  
- Standardwartezeit: 3 Tage bis Erinnerung/Next Action.  
- Default-Ansicht: Kanban-Board mit Spalten nach Verantwortlichkeit/Status; SLA für Partner-initiierte Klärfälle.  
- Plus-Addressing (clar+<id>@…): Später mit IMAP/Webhooks einführen.

- Adressformate:  
  - Benutzeradresse: `<username>@stromhaltig.de`  
  - Team-Identität: `team-<slug>@stromhaltig.de` (slug = Teamname normalisiert)  
- Kanban-Spalten (Initial): „Klärfall in Vorbereitung“ (Backlog) | „Benötigt unsere Antwort“ | „Wartet auf Partner“ | „Interne Klärung“ | „Überfällig / Eskalation“

  - Normalisierung `<username>`: lowercase; Umlaute ä→ae, ö→oe, ü→ue, ß→ss; Leer-/Sonderzeichen entfernen oder durch `-` ersetzen; erlaubte Zeichen: `[a-z0-9.-]`; Mehrfach‑Trenner zusammenfassen.

## Zielbild UX
- Default-Sicht: „Offene Team-Klärfälle“, sortiert nach Next Action/SLA.  
- Board-/Listenmodus mit Gruppierungen:  
  - Benötigt unsere Antwort  
  - Wartet auf Marktpartner (inkl. „seit X Tagen“)  
  - Interner Klärbedarf  
  - Überfällig / Eskalation  
- Fall-Detail als Timeline mit Quick Actions: Antworten, Erinnerung, Eskalieren, Zuweisen, Status ändern, Vorlage einfügen.  
- Sidebar: Playbook/Checkliste, Tags, Referenzen (Chat/Notiz), verwandte Fälle.

## Kernfunktionen
1) Antwort-Tracking  
- Ableitung aus E-Mail-Verlauf: `lastInboundAt` (Partner), `lastOutboundAt` (wir).  
- Derived: `waitingOn` ('PARTNER' | 'US'), `staleSinceDays`.  
- UI: Ampel + Spalten „Wartet auf“ / „Wartet seit“.

2) Erinnerungen und SLAs  
- `nextActionAt` mit Snooze (Morgen, +2 Tage, Datum).  
- SLA je Falltyp/Priorität; Markierung „überfällig“.  
- Auto-Erinnerungen bei Fristüberschreitung.

3) Playbooks (Prozesswissen nutzen)  
- Je EDIFACT/Problemtyp: nächste Schritte, Validierungen, Checklisten, Textbausteine.  
- Pflichtfelder/Validierungen vor Versand.

4) Produktive E-Mail  
- Vorlagen mit Variablen (Partner, Fristen).  
- Validierung `validateMarketPartnerEmail`.  
- Senden setzt Status/`waitingOn` automatisch; Thread-Zuordnung; Duplikat-Erkennung.

5) Priorisierung/Zuweisung  
- Auto-Priorität aus Inhalt (bestehende Kontext-Extraktion).  
- Zuweisen/Watcher; Vorschlag Verantwortliche basierend auf Falltyp.

6) Kontextverknüpfungen  
- Chat-/Notiz-Referenzen sichtbar, schnell anlegbar; verwandte Fälle zum gleichen Partner/Typ.

## UI-Änderungen in der Route
- Listenansicht  
  - Default-Filter: Team offen (`status=open`).  
  - Spalten: Titel, Marktpartner, Verantwortlich, Wartet auf, Wartet seit, Priorität, SLA fällig, Letzte Aktivität, E-Mails (#).  
  - Filterchips: Falltyp, Priorität, Wartet auf, Überfällig, Zuweisung, Tags.  
  - Batch-Aktionen: Zuweisen, Erinnerung, Priorität ändern, Eskalieren.  
- Detailansicht  
  - Header: Status/Priorität, Verantwortlich, SLA/Next Action, Wartet auf, Partner-Infos.  
  - Timeline: E-Mails (ein/ausgehend), Notizen, Statuswechsel, Anhänge, Referenzen.  
  - Composer: Vorlagen, Validierung, Anhänge, „Senden & Status setzen“.  
  - Sidebar: Playbook/Checkliste, Tags, Referenzen, verknüpfte Fälle.

## Datenmodell-/API-Erweiterungen (ergänzend)
Zusätzliche Felder je Klärfall (Liste + Detail):
- `lastInboundAt`, `lastOutboundAt`, `waitingOn`, `staleSinceDays`  
- `nextActionAt`, `slaDueAt`, `escalated`, `escalationLevel`  
- `emailThreadCount`, `lastEmailStatus` (delivered/bounced)  
- `assignedTo`, `watchers[]`, `unreadCount`

Empfohlene Endpunkte (falls nicht vorhanden):
- GET `/:id/activities` (gemischte Timeline)  
- POST `/:id/reminders`, PATCH `/:id/sla`, POST `/:id/escalate`  
- GET `/:id/thread` (E-Mail-Thread-Meta)  
- PATCH `/:id/assignment` (Zuweisen/Watcher)  
- Inbound-Mail Webhook: Zuordnung via Message-ID/References, speichert `direction` und Timestamps.

Bestehende Services nutzbar (app-legacy/src/services/bilateralClarificationService.ts):
- E-Mail: `sendClarificationEmail`, `getEmailHistory`, `validateMarketPartnerEmail`.  
- Status/Team: `updateStatus`, `shareWithTeam`, `unshareFromTeam`, `getClarifications`.  
- Kontext: `addChatReference`, `addNoteReference`, `getReferences`, `getClarificationsLinkedToChat/Note`.  
- Auto-Vorschläge: `createFromChatContext`/`createFromMessageAnalyzerContext` inkl. `extractContextData`.

## Automationen
- Nach Outbound-Mail: `waitingOn=PARTNER`, `nextActionAt=+3 Tage`.  
- Bei Inbound vom Partner: `waitingOn=US`, Erinnerung zurücksetzen.  
- Stale Detection: `waitingOn=PARTNER` und `staleSinceDays > X` => Markierung/Eskalation.  
- Täglicher Digest: Heute fällig/überfällig pro Nutzer/Team.  
- Smart-Vorschläge: Titel/Problemtyp/Priorität/Template aus Kontextdaten.

- Partner-initiierter Erstkontakt (Inbound ohne vorherigen Outbound): setze `waitingOn=US` und `slaDueAt=+3 Tage` automatisch; Board-Einordnung in „Klärfall in Vorbereitung“ oder „Interne Klärung“ je Inhalt.
 - Neue Klärfälle (manuell erstellt): initiale Board‑Spalte „Klärfall in Vorbereitung“, bis erste Aktivität erfolgt (Notiz, Outbound‑E‑Mail, Inbound‑Import).

## KI‑Coach: LLM + QDrant für „Next Best Action“ und Training-on-the-Job
Ziel: Das System agiert als Coach, nutzt die gesamte Klärfall-Historie, unser Prozesswissen (QDrant Collection „willi_mako“) und liefert konkrete Handlungsempfehlungen, Erklärungen und Lernunterstützung im Arbeitsfluss.

### Ziele
- Nächste Schritte vorschlagen (inkl. Begründung, erwartetes Ergebnis, Zeitbedarf).  
- Risiken/Blocker früh erkennen (fehlende Pflichtangaben, falsche Rolle, überfällig).  
- Fachliche Einordnungen/Erklärungen (z. B. APERAK, MaLo-ID, DAR, MSCONS/UTILMD).  
- „Training on the Job“: Schrittweise Guidance mit kleinen Aufgaben und Feedback.

### Datenquellen & Kontextaufbau
- Klärfall-Timeline: E-Mails (in/out), Notizen, Statuswechsel, Anhänge-Metadaten.  
- Metadaten: EDIFACT-Typ, Problemtyp, Priorität, Marktrolle, Partner, SLA/Next Action.  
- Retrieval aus QDrant (Collection „willi_mako“):  
  - Query-Konstruktion aus Titel/Tags/EDIFACT/Problemtyp/aktueller Status.  
  - Top‑K Retrieval (z. B. K=5–10), optional Reranking.  
- Prompt-Zusammenstellung mit kompaktem Timeline-Summary (rolling summary, Token-Budget beachten).

### Fähigkeiten des Coaches
- Next Best Actions (3 konkrete Optionen) mit: Schrittbeschreibung, Begründung, benötigten Daten, „One‑click“-Action (z. B. Vorlage öffnen, Status ändern).  
- Vorlagenauswahl/Vorschlag im Composer inkl. ausfüllbarer Platzhalter.  
- Prüfungen: DAR-Format, Rollen-Zuständigkeit, Pflichtfelder – mit Korrekturhinweisen.  
- Erklärmodus: Kurz-Erklärungen mit Quellen-Hinweis (z. B. docs/bilateral.md) und weiteren Links.  
- Lernkarten/Skills: Kurze Micro‑Lektionen zu häufigen Themen, adaptiv anhand der Fälle.

### UI-Integration
- Coach-Panel in der Detailansicht (Sidebar):  
  - Register: Vorschläge | Erklären | Fragen.  
  - Inline‑Aktionen: „Übernehmen“ (füllt Felder/öffnet Composer mit Template), „Merken“ (Reminder), „Ignorieren“.  
- Composer‑Assistent: Kontextknopf „Coach empfehlen“, der eine passende E‑Mail entwirft und Validierungen prüft.

### API/Services
- POST `/api/bilateral-clarifications/:id/coach/suggest` – erzeugt Vorschläge (serverseitig LLM+QDrant).  
- POST `/api/coach/ask` – freies Q&A mit kontextualisiertem Retrieval.  
- Logging: Feedback (Daumen hoch/runter, „umgesetzt“), zur Qualitätsmessung und Feinjustierung.  
- Sicherheit: Keine sensiblen Daten an externe Modelle ohne Freigabe; PII-Minimierung, Maskierung wo möglich.

### Sicherheit/Qualität
- Zitationspflicht: Coach zeigt genutzte Quellen (Dok‑Titel/Abschnitt) und sagt „unsicher“, wenn Evidenz dünn.  
- Guardrails: Keine rechtlichen Zusagen; klare Formulierungen, dass Empfehlungen geprüft werden müssen.  
- Evaluationskriterien: Annahmequote der Vorschläge, Zeit bis Antwort, Reduktion „Wartet > 7 Tage“.

### Roadmap KI‑Coach
- Welle 2:  
  - Grundlegende Vorschläge (Next Actions, Erklären), Composer‑Assist, Feedback-Logging.  
  - Retrieval gegen QDrant „willi_mako“, Timeline-Summary.  
- Welle 3:  
  - Training-on-the-Job (Micro‑Lektionen), adaptive Playbooks, Skill‑Tracking.  
  - Erweitertes Reranking/Fact‑checking, automatisierte Validierungs-Checks vor Versand.

### Akzeptanzkriterien (KI‑Coach, initial)
- Für offene Fälle liefert der Coach max. 3 umsetzbare nächste Schritte mit Begründung.  
- Composer‑Assist generiert einen kontextuell passenden E‑Mail‑Entwurf inkl. Platzhaltern.  
- Mind. eine Quelle (Dokabschnitt) wird je Empfehlung angezeigt.  
- Nutzerfeedback wird gespeichert und in Metriken angezeigt.

## E-Mail-Management (Team-Postfach, Versand/Empfang, Identitäten)
Ziel: Einheitlicher E-Mail-Kanal pro Team mit sauberer Thread-Zuordnung, inkl. Fallbacks für Nutzer ohne Team.

### Ziele
- Antworten des Marktpartners landen zuverlässig im System und werden dem richtigen Klärfall zugeordnet.  
- Team-basiertes „Send as“ mit konsistenter Absenderadresse (SPF/DKIM/DMARC-konform).  
- Nutzer ohne Team können E-Mails importieren und senden (persönliche Identität oder Orga-Default).  
- Minimale Latenz bis E-Mails in der Timeline erscheinen; robuste Fehler-/Bounce-Behandlung.

### Architekturüberblick
- Outbound: Composer → `POST /:id/send-email` → SMTP/SES → Zustell-Callbacks (optional).  
- Inbound: Mail-Webhook (SES/Sendgrid/Webhook-Gateway) ODER IMAP-Collector → `POST /:id/emails` (direction=INCOMING).  
- Threading: Speichern von `messageId`, `inReplyTo`, `references`, `threadId` je E-Mail; Matching-Strategie:  
  1) Direktadresse `clar+<id>@domain` (stark),  
  2) `In-Reply-To`/`References` (mittel),  
  3) DAR/Titel/Partner-Heuristiken (fallback, nur mit Review-Flag).

### Identitäten (Send-as)
- Start: Team-Identität ist im Composer auswählbar und Standard für Team-Mitglieder.  
- Nutzer ohne Team: Versand mit generierter Benutzer-Identität `<username>@stromhaltig.de`, Reply-To optional auf Team später.  
- Mehrere Teams parallel möglich; keine generische Sammeladresse am Anfang.  
- Später erweiterbar um weitere Identitäten (persönlich/orga).

### Empfang
- Start: Copy & Paste-Import (Raw-Inhalt in Textfeld) und EML-Upload im UI; Zuordnung zum Klärfall via Auswahl oder Header-Paste.  
- Später: Webhook (SES) mit Signaturprüfung ODER IMAP-Poller für Team-Postfächer.  
- Routing-Priorität (wenn Webhook/IMAP aktiv):  
  1) Plus-Addressing `clar+<id>@stromhaltig.de`,  
  2) `In-Reply-To`/`References`,  
  3) Heuristik (DAR/Betreff/Partner) mit Review-Flag.  
- Sicherheit: SPF/DKIM/DMARC bereits auf stromhaltig.de; bei Webhook später Signaturprüfung.

- Outlook/Clients: Nutzer kopieren typischerweise den sichtbaren Mailtext; das Textfeld akzeptiert reinen Text (inkl. optionaler Kopfzeilen). Parser extrahiert Betreff/Absender, wenn vorhanden; Anhänge werden separat hochgeladen.

### Versand
- Domain: stromhaltig.de via Amazon SES (SPF/DKIM/DMARC vorhanden).  
- Envelope-From und Header-From konsistent; optional `Reply-To` auf Team-Adresse.  
- Bounces/Complaints erfassen → `lastEmailStatus`, Bounce-Grund speichern, UI-Badge anzeigen.

### Identitäts‑Provisionierung (Team)
- Namensschema: `team-<slug>@stromhaltig.de`, `<slug>` aus Team‑Namen (lowercase, a‑z0‑9, `-`), Kollisionen via Suffix `-2`, `-3`.  
- From‑Name: `<Teamname> | Willi‑Mako`.  
- SES: Identität/DKIM aktivieren, Absender prüfen; Policy nur für autorisierte Services/Nutzer.  
- Speicherung: Mail‑Identität pro Team in DB (Adresse, From‑Name, SES‑Id, Status).  
- Fallback (Nutzer ohne Team): `<username>@stromhaltig.de` (Normalisierung, nicht erlaubte Zeichen entfernen/ersetzen).  

### Datenmodell-Erweiterungen (E-Mail)
- Felder pro E-Mail:  
  - `id`, `clarificationId`, `direction` ('OUTGOING'|'INCOMING'), `subject`, `from`, `to[]`, `cc[]`, `bcc[]`,  
  - `messageId`, `inReplyTo`, `references[]`, `threadId`,  
  - `content`, `contentType`, `attachments[]`,  
  - `sentAt`/`receivedAt`, `smtpStatus`, `bounceType`, `bounceReason`,  
  - `senderIdentity` ('TEAM'|'PERSONAL'|'ORG_DEFAULT'), `identityAddress`.

### API-Erweiterungen
- POST `/:id/emails` – Inbound schreiben (bereits vorhanden laut Doku).  
- GET  `/:id/thread` – Thread-Metadaten (optional).  
- POST `/email/webhook/:provider` – Inbound-Webhooks (SES/Sendgrid), mit Signaturprüfung.  
- GET/POST `/teams/:teamId/mailbox` – Team-Postfach/Identität konfigurieren (SMTP/SES-Identity, Signaturen).  
- GET/POST `/users/:userId/mail-identity` – persönliche Identität/Signatur.  
- POST `/:id/emails/import` – Upload EML/MSG oder Raw MIME für Nutzer-Import (ohne Team).  
- POST `/:id/emails/forward-capture` – Verarbeitung von weitergeleiteten Mails (Header-Preservation).

### UI-Erweiterungen
- Composer: „Senden als“ (Team-Identität bzw. generierte Benutzer-Identität für Nutzer ohne Team), Validierung `validate-email`, Vorlagen pro Team/Problemtyp, Signatur der Identität.  
- Detail/Timeline: Badge für Richtung (ein/aus), Absenderidentität, Bounce-Status, Thread-Grouping.  
- Einstellungen: Team-Postfach-Setup (nur Admin), persönliche Identität (Signatur, Standard-Absender).  
- Import-Dialog: EML/Raw-MIME hochladen oder Copy & Paste in Textfeld; später „Weitergeleitete Mail verarbeiten“.

### Rechte/Rollen
- Team-Admins: Team-Postfach/Identität konfigurieren.  
- Nutzer ohne Team: persönlicher Versand erlaubt, Import erlaubt; Orga-Default-Identität nutzbar.  
- Audit: Jede gesendete/empfangene Mail mit User/Team-Attribution.

### Sicherheit/Compliance
- DKIM/SPF/DMARC, Webhook-Signaturen, Anti-Spoofing.  
- Sensible Anhänge markieren/verschlüsseln; DLP-Regeln (optional).  
- Logs/Audit-Trail, Aufbewahrungsfristen, Datenschutz (Minimierung, Löschkonzepte).

### Monitoring/Operations
- Metriken: Send/Receive Rate, Bounce-Rate, Queue-Latenz, Fehlerquoten.  
- Alarme bei Webhook-Ausfall, IMAP-Fehlern, SPF/DKIM-Fehlkonfiguration.  
- Rate Limits aus API-Doku beachten; Backoffs und Retries implementieren.

### Nutzer ohne Team – Fallbacks
- Versand: generierte Benutzer-Identität unter stromhaltig.de.  
- Empfang: Copy & Paste/EML-Import; später Drop-Box (`clar+<id>@stromhaltig.de`).  
- Später optional: persönliche Inbound-Adresse `user+clar@stromhaltig.de` mit Routing.

### Roadmap – E-Mail
- Welle 1:  
  - Composer „Senden als“ (Team-Identität; generierte Benutzer-Identität für Nutzer ohne Team), Validierung, Status-Update nach Versand.  
  - Copy & Paste-Import und EML-Upload für Inbound (manuell).  
  - Timeline mit Thread-Badges und Direction.  
- Welle 2:  
  - Webhook-Inbound (SES) mit Signaturprüfung, Auto-Routing und Plus-Addressing.  
  - Team-/User-Identitätsverwaltung in Settings (UI + API).  
  - Bounce/Complaint-Handling, SMTP-Status in UI.  
- Welle 3:  
  - IMAP-Collector (falls nötig), intelligente Zuordnung (DAR/Partner-Heuristik).  
  - SLA-gekoppelte Auto-Reminders basierend auf Inbound/Outbound-Events.

### Akzeptanzkriterien (E-Mail, Welle 1)
- Versand funktioniert mit wählbarer Identität und validierter Empfängeradresse.  
- Nach Versand wird der Fall auf `waitingOn=PARTNER` gesetzt; `nextActionAt` wird aus SLA-Default berechnet.  
- Nutzer ohne Team können EML-Dateien importieren und der Timeline hinzufügen.  
- Timeline gruppiert E-Mails korrekt per Thread (mind. via `In-Reply-To`).

## Roadmap (inkrementell)
Welle 1 (1–2 Wochen)
- Listenansicht/Board: Kanban-Board als Default, Spalten nach Verantwortlichkeit/Status (inkl. „Wartet auf“/„Wartet seit“/SLA).  
- Derived `waitingOn`/`staleSinceDays` im Frontend aus E-Mail-Daten (manuell importiert oder History; falls History-API vorhanden, nutzen).  
- Composer: Vorlagen-Grundgerüst; „Senden als“ Team bzw. generierte Benutzer-Identität; `validateMarketPartnerEmail` vor Versand.  
- Inbound: Copy & Paste-Import/EML-Upload und Timeline-Darstellung.

Welle 2 (2–3 Wochen)
- Reminders/`nextActionAt` Backend + UI (Snooze).  
- Vereinheitlichte Timeline (E-Mail + Notes + Status).  
- Batch-Aktionen in der Liste.

Welle 3 (3–5 Wochen)
- SLA-Logik pro Falltyp/Priorität, Eskalationen, Team-Digest.  
- Playbooks/Checklisten/Validierungen je Falltyp.

Welle 4
- Inbound-Mail Webhook stabil, automatische Thread-Zuordnung, KPIs/Reports.

## KPIs/Erfolgskriterien
- Median „Zeit bis Antwort an Partner“ sinkt.  
- Anteil „überfällig“ reduziert.  
- Anteil „Wartet auf Partner > 7 Tage“ sinkt.  
- Erstlösungsquote steigt, Eskalationen sinken.  
- UX: weniger Kontextwechsel, schnellere Quick Actions.

## Edge Cases
- Falsche Thread-Zuordnung/fehlende Message-IDs.  
- Weiterleitungen/mehrere Marktpartner.  
- Große/mehrere Anhänge.  
- Bounce/Fehlzustellung.  
- Temporäre API-Fehler: Offline-Entwürfe/Retry.

## Quick Wins (sofort)
- Default-Filter „Team offene Klärfälle“.  
- Spalten „Wartet auf“ + „Wartet seit Tagen“ in Liste.  
- Gespeicherte Sichten: „Meine aktiven“, „Wartet > 7 Tage“, „Heute fällig“.  
- Composer: Vorlagen + E-Mail-Validierung vor Versand.

## Dokumentationsbasis: Was wir bereits haben und wie wir es nutzen
Aus den vorhandenen Dokumenten leiten wir konkrete Umsetzungshilfen ab.

### A) Prozess- und Regulatorik-Leitplanken (docs/bilateral.md)
- Marktrollen (LF, VNB, MSB, ÜNB, BKV) bestimmen Empfänger, Tonalität und Templates.  
- EDIFACT-/DAR-Kontext: VALIDIERUNG der DAR je Nachrichtentyp (UTILMD, MSCONS, INVOIC, …).  
- APERAK als Fehlerquittung etabliert: Status/Playbooks müssen APERAK-Fälle berücksichtigen (z. B. „APERAK erhalten – fachliche Prüfung/Antwort“).  
- MaLo-ID und Stammdatenfehler sind häufige Ursachen: Playbooks „Stammdaten“, „Messwerte“, „Prozessfehler/Fristen“.  
- Eskalationsbedarf bei Fristüberschreitung ist legitimiert; Plan enthält SLAs/Eskalationen als erste Bürger.

Umsetzung: Validierungslogik im Composer, Playbooks je Problemtyp, Filter/Tags für Rollen/EDIFACT.

### B) System- und Komponenten-Basis (docs/bilateral-clarifications.md)
Bereits definierte Komponenten können direkt genutzt/erweitert werden:
- ClarificationsList → neue Spalten („Wartet auf“, „Wartet seit“, SLA fällig), Filterchips, Batch-Aktionen.  
- ClarificationDetailModal + ClarificationTimeline → vereinheitlichte Timeline (E-Mail/Notiz/Status/Anhänge).  
- LLMEmailComposerDialog → Vorlagen, Validierung, „Senden & Status setzen“.  
- WorkflowStatusCard → Status-/SLA-Anzeige und Quick Actions.  
- WorkflowDemoTab → Schulung/Onboarding konsistent mit Playbooks halten.

Umsetzung: Minimal invasive Erweiterungen statt Neuentwicklung; Fokus auf Props/State für neue Felder (waitingOn, staleSinceDays, nextActionAt/SLA).

### C) API-Referenz-Mapping (docs/bilateral-clarifications-api.md)
Sofort nutzbare Endpunkte für Welle 1:
- GET /api/bilateral-clarifications (Liste) – bereits Filter/Summary/Pagination.  
- GET /api/bilateral-clarifications/:id (Details).  
- POST /api/bilateral-clarifications/:id/send-email (Versand).  
- GET /api/bilateral-clarifications/validate-email (Empfänger-Validierung).  
- POST /api/bilateral-clarifications/:id/attachments, /notes (Anhänge/Notizen).  
- PATCH /api/bilateral-clarifications/:id/status (Statuswechsel).  

Ergänzungsbedarf (für Welle 2/3, falls nicht vorhanden):
- GET /:id/activities (gemischte Timeline) – alternativ: Frontend mergen aus Emails/Notes/Status.  
- Reminders (`POST /:id/reminders`), SLA (`PATCH /:id/sla`), Eskalation (`POST /:id/escalate`).  
- Assignment/Watcher (`PATCH /:id/assignment`).  
- Inbound-Mail-Webhook zur automatischen Thread-Zuordnung (direction, messageId, references).

Technische Hinweise aus der API-Doku: JWT Auth, standardisiertes Response-Format, Rate Limits (E-Mail/Upload), Versionierung – einplanen für Fehler- und Retry-Handling.

### D) Nutzerflüsse und Best Practices (docs/bilateral-clarifications-user-guide.md)
Erhaltenswerte UX-Elemente, die mit dem Plan harmonieren:
- Tabs/Navigation („Meine Klärfälle“, „Team-Klärfälle“, „Dashboard“, „Workflow Demo“).  
- Timeline als zentrale Arbeitsfläche mit Inline-Notizen.  
- Keyboard-Shortcuts (Strg+N/F/R, Esc) – auch nach UI-Erweiterungen beibehalten.  
- Filter/Suche inkl. Zeitraum, Priorität, Marktpartner – ergänzen um „Wartet auf“/„Überfällig“.

Umsetzung: Quick Wins bauen auf vorhandenen Flows (Composer, Validate, Timeline) auf; nur fehlende Metadaten ergänzen.

### E) Service-Layer (app-legacy/src/services/bilateralClarificationService.ts)
Vorhandene Methoden, die den Plan direkt stützen:
- E-Mail: `sendClarificationEmail`, `getEmailHistory`, `validateMarketPartnerEmail`.  
- Status/Team: `updateStatus`, `shareWithTeam`, `unshareFromTeam`, `getClarifications`.  
- Kontext: `addChatReference`, `addNoteReference`, `getReferences`, `getClarificationsLinkedToChat/Note`.  
- Auto-Vorschläge: `createFromChatContext`, `createFromMessageAnalyzerContext`, `extractContextData` (EDIFACT, Priorität, Problemtyp).

Delta für Plan-Features: Ergänzende Felder (waitingOn, staleSinceDays, nextActionAt, slaDueAt) – zunächst im Frontend berechnen, später API erweitern.

### F) Datenmodell-Anchoring
An die API-Modelle anlehnen (Status/Priorität/Attachment/Note).  
Mapping:  
- `WAITING_FOR_RESPONSE` ~ „Wartet auf Partner“; `INTERNAL` ~ „Benötigt unsere Antwort/Interne Klärung“.  
- `SENT` + Outbound-Mail → automatisch `waitingOn=PARTNER`.  
- Inbound-Mail → `waitingOn=US` und `staleSinceDays=0`.

### G) Risiken/Abhängigkeiten
- Inbound-Mail-Webhook noch nicht produktiv? Frontend-Derivation per `getEmailHistory` als Übergang.  
- Rate Limits beim Versand: Composer mit Entwurfs-/Retry-Modus.  
- Berechtigungen/Rollen: „Meine Klärfälle“ präzisieren (Assigned oder letzte Aktivität durch mich?).

### H) Umsetzungsmatrix (Plan ↔ vorhandene Assets)
- Welle 1:  
  - Liste erweitern (ClarificationsList) • GET /clarifications • Derivation waitingOn/staleSince aus `getEmailHistory` (falls Details-API nötig: lazy load pro Row/Detail).  
  - Composer validiert Empfänger (`validate-email`) und setzt Status via `PATCH /:id/status` nach Versand (`POST /:id/send-email`).  
  - Gespeicherte Sichten in Frontend-State/LocalStorage; Server-Filter, wo möglich.  
- Welle 2:  
  - Reminders/SLA/Eskalation: neue Endpunkte; UI in WorkflowStatusCard/Detail.  
  - Einheitliche Timeline: ggf. GET /:id/activities; bis dahin Merge von Emails/Notes/Status-Changes clientseitig.  
- Welle 3:  
  - Playbooks je EDIFACT/Problemtyp; Templates auf Basis `extractContextData`; Team-Digest (cron/worker + Mail).

## Annahmen / Offene Fragen
- „Meine Klärfälle“ = zugewiesen ODER zuletzt durch mich kommentiert/gesendet?  
- Standardwartezeit bis Erinnerung (3 Tage?) je Typ/Priorität.  
- Eskalationspfade und Eskalations-Mailverteiler vorhanden?  
- Inbound-Mail-Webhook bereits verfügbar/planbar?

## Akzeptanzkriterien (Auszug Welle 1)
- Liste zeigt standardmäßig Team-offene Fälle, sortiert nach Next Action.  
- Jede Zeile zeigt korrekt „Wartet auf“ und „Wartet seit“.  
- E-Mail-Versand via Composer validiert Empfänger und setzt Status `waitingOn=PARTNER`.  
- Gespeicherte Sichten funktionieren und bleiben über Sessions bestehen.
