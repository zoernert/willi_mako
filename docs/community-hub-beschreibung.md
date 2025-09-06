# Community Hub – Funktionsbeschreibung

Stand: 2025-09-06

## Überblick
Der Community Hub ist ein kollaboratives Wissens- und Lösungsforum innerhalb von Willi‑Mako. Mitarbeitende aus der Marktkommunikation strukturieren dort Problemstellungen, diskutieren Lösungsansätze und finalisieren eine gemeinsame Lösung. Finalisierte Lösungen können in FAQs überführt und als formelle „Community‑Initiativen“ aufbereitet werden.

Ziel: Wissen bündeln, Transparenz schaffen und wiederverwendbare, geprüfte Antworten erzeugen.

## Mehrwert der Community‑Funktion
- Schnellere Problemlösung: Fachwissen wird gebündelt, Rückfragen und Alternativen werden systematisch im „Living Document“ festgehalten.
- Höhere Antwortqualität: Review‑Phase und finaler Status sichern Konsens und Nachvollziehbarkeit; Audit‑Trail dokumentiert Änderungen.
- Wiederverwendbarkeit: Finalisierte Lösungen fließen direkt in die FAQ und stehen dem ganzen Unternehmen strukturiert zur Verfügung.
- Bessere Auffindbarkeit: Semantische Indizierung (Qdrant) macht ähnliche Fälle und relevante Abschnitte schnell auffindbar.
- Reduktion von Doppelarbeit: Vorhandene Lösungswege werden sichtbar; parallele Klärungen werden vermieden.
- Wissenssicherung: Erfahrungswissen einzelner wird institutionalisiert (Kommentare, Vorschläge, finale Lösung, Meta‑Infos).
- Onboarding & Schulung: Strukturierte Dokumente (Problem/Kontext/Analyse/Lösung) erleichtern das Einarbeiten neuer Mitarbeitender.
- Brücke zu Stakeholdern: Aus finalen Threads generierte „Community‑Initiativen“ bereiten formelle Anfragen an Verbände/Partner vor.
- Steuerbarkeit per Feature‑Flags: Aktivierung/Öffentlichkeit (Public‑Read) und Eskalationspfade lassen sich kontrolliert steuern.

## Kernobjekte und Datenmodell
- CommunityThread
  - Felder: id, title, status (discussing | review | final), tags[], document_content, created_by_user_id, created_at, updated_at
  - document_content (Living Document):
    - problem_description, context, analysis
    - solution_proposals[] (id, content, created_by, created_at, votes?)
    - final_solution { content, approved_by?, approved_at? }
    - meta {}
- DocumentComment: Kommentare zu spezifischen Blöcken/Abschnitten (z. B. „problem_description“ oder eine proposal‑ID)
- CommunityInitiative: formelle Ausarbeitung auf Basis einer finalen Lösung; Status: draft | refining | submitted
- Audit (community_thread_audit): Protokolliert Patch‑Operationen an Dokumenten
- Vektorindex (Qdrant): Semantische Indizierung von Thread‑Abschnitten für die Suche

Persistenz erfolgt in PostgreSQL; semantische Suche und Kontextabgleich in Qdrant.

## Statusfluss (Threads)
- discussing → review → final (validierte Übergänge; Admin kann überschreiben)
- Regeln:
  - Im Status „final“ sind Lösungsinhalte geschützt (keine Änderungen an final_solution oder proposals via Patch)
  - Statuswechsel nur durch Ersteller oder Admin

## Hauptfunktionen
- Threads
  - Erstellen mit Titel, optionalen Anfangsinhalten (Problem/Kontext) und Tags
  - Listen mit Paging und Filtern (Status, Tags, Volltextsuche über Titel/Inhalt)
  - Lesen nach Rechteprüfung; optionaler Public‑Read (Feature Flag)
  - Aktualisieren per Patch‑Operationen
    - op: replace (z. B. /problem_description)
    - op: add (z. B. /solution_proposals/-)
    - op: upsertProposal (gezieltes Anlegen/Aktualisieren per proposalId)
  - Kommentare pro Dokumentblock
  - Löschen (nur Admin; inklusive abhängiger Initiativen/Kommentare)
- Suche (semantisch)
  - Abschnitte werden als Vektorpunkte in Qdrant indiziert: problem_description, context, analysis, final_solution, proposal
  - Suche per Textquery liefert relevante Threads sortiert nach Ähnlichkeit
- FAQ‑Erzeugung (aus finalen Threads)
  - Bereitet Daten zur Übergabe an das bestehende FAQ‑System vor (Titel, Beschreibung/Kontext, Antwort, Tags, Quelle)
- Community‑Initiativen
  - Aus finalen Threads generierbar (1:1‑Beziehung pro Thread)
  - LLM‑gestützte Erstellung eines Entwurfs (Fallback‑Template bei Fehlern)
  - Bearbeiten (nur Ersteller, nicht wenn submitted)
  - Statuswechsel: draft ↔ refining → submitted (final)
  - Optional: submission_details (Kontakt, Einreichungsweg, Referenz, Notizen)

## Ereignisse und Re‑Indexierung
- Domain Events (in‑memory geloggt), z. B.:
  - community.thread.created, community.thread.updated, community.thread.status.final, community.comment.created
  - community.initiative.created/updated/status_changed/deleted
- Reindex‑Strategie (Qdrant)
  - Geänderte Abschnitte werden gesammelt (debounced) und als Batch upserted
  - Finale Lösungen werden sofort reindiziert
  - Deterministische IDs pro Vektorpunkt (thread_id + section_key + proposal_id)

## Frontend (Next.js)
- Seiten
  - /community: Übersicht mit Filtern, Erstellung neuer Threads, Kennzahlen (Vorschläge/Kommentare), Status‑Badges
  - /community/thread/[id]: Detailansicht mit Living Document, Inline‑Bearbeitung, Vorschlagsliste, Kommentare, Statusaktionen
- UI/Theme
  - Community‑Theme in `src/styles/community-theme.css` (Farbswap, Badges, Living‑Document‑Stile)

## Rechte und Zugriff
- Lesen: öffentlich, wenn COMMUNITY_ENABLE_PUBLIC_READ=true; sonst nur angemeldet
- Bearbeiten: Ersteller (solange nicht final)
- Status ändern: Ersteller oder Admin (Admins können Transitionen erzwingen)
- Kommentieren: alle angemeldeten Nutzer
- Optimistische Nebenläufigkeit: Versionierung via updated_at bei Patch‑Requests

## Feature Flags und Konfiguration
- FEATURE_COMMUNITY_HUB: aktiviert das Modul
- FEATURE_COMMUNITY_ESCALATION: optionale Erweiterungen
- COMMUNITY_ENABLE_PUBLIC_READ: erlaubt öffentliches Lesen
- COMMUNITY_MAX_PROPOSALS: Limit für Anzahl Vorschläge (Logik/Validierung)
- QDRANT_COMMUNITY_COLLECTION: Basisname der Qdrant‑Kollektion (anbieterabhängige Ableitung)
- QDRANT_URL, QDRANT_API_KEY: Qdrant‑Zugang

Konfiguration wird über `src/utils/communityValidation.ts` und `src/utils/featureFlags.ts` geprüft/ausgelesen.

## API‑Skizze (vom Frontend verwendet)
- GET /api/community/threads?status=&tags=&search=
- POST /api/community/threads
- GET /api/community/threads/:id
- PATCH /api/community/threads/:id/document  (Patch‑Ops + version)
- PUT /api/community/threads/:id/status
- GET/POST /api/community/threads/:id/comments

Hinweis: Die konkrete Implementierung der API‑Routen folgt der Service/Repository‑Logik.

## Setup und Betrieb
- Voraussetzungen
  - PostgreSQL‑Tabellen für: community_threads, document_comments, community_initiatives, community_thread_audit (siehe Migrationsdateien im Repo)
  - Qdrant‑Instanz erreichbar; Kollektion wird bei Bedarf erstellt
- Aktivierung
  - .env setzen: FEATURE_COMMUNITY_HUB=true, QDRANT_URL, QDRANT_API_KEY (optional), QDRANT_COMMUNITY_COLLECTION, COMMUNITY_ENABLE_PUBLIC_READ
  - Anwendung starten; beim ersten Zugriff erstellt der Qdrant‑Service die Kollektion und indiziert Inhalte beim Schreiben/Ändern

## Typische Fehlerszenarien
- Ungültiger Status oder verbotene Transition → 400/Fehler
- Versionkonflikt beim Patch (optimistic concurrency) → Fehler mit aktuellem Zeitstempel
- Änderungen an geschützten Bereichen im Status „final“ → Fehler
- Initiative existiert bereits für Thread → Fehler
- Unzureichende Berechtigungen (lesen/bearbeiten/status/comment) → Fehler

## Dateien (Ausschnitt)
- Services: `src/services/CommunityService.ts`, `CommunityQdrantService.ts`, `CommunityEventManager.ts`
- Repository: `src/repositories/CommunityRepository.ts`
- Typen: `src/types/community.ts`
- Seiten: `src/pages/community/index.tsx`, `src/pages/community/thread/[id].tsx`
- Styles: `src/styles/community-theme.css`

## Kurzfazit
Der Community Hub verbindet kollaboratives Schreiben mit semantischer Suche und einem formalen Übergang in Initiativen und FAQs. Das Modul ist funktionsgetrennt (Service/Repository), ereignisgetrieben indizierend (Qdrant) und über Feature Flags kontrollierbar.
