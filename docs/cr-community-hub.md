    # Change Request: Community Hub für kollaboratives Wissensmanagement

    - **CR-ID:** CR-COMMUNITY-HUB-001
    - **Datum:** 2025-08-09
    - **Autor:** Gemini AI Assistant
    - **Status:** Entwurf (Überarbeitet mit "Living Document"-Konzept)

    ## 1. Zusammenfassung

    Dieser Change Request beschreibt die Konzeption und den iterativen Implementierungsplan für einen neuen, optionalen Anwendungsbereich: den **"Community Hub"**. Das zentrale Element dieses Hubs ist ein **"kollaboratives Lösungs-Canvas"** (Living Document), in dem Nutzer gemeinsam und strukturiert an einer Problemlösung arbeiten, anstatt nur linear Kommentare auszutauschen.

    Dieses Modul soll es Nutzern aus verschiedenen Unternehmen ermöglichen, anonymisiert Probleme zu definieren, gemeinsam Lösungen zu erarbeiten und dieses Wissen nachhaltig in die bestehende FAQ-Wissensdatenbank zu überführen. Der Plan nutzt maximal die Stärken der Plattform – **Qdrant-Suche, FAQ-System, Admin-UI** – bei minimalen Änderungen am Kernsystem.

    ## 2. Business Value & Motivation

    Der Community Hub transformiert die Anwendung von einem internen Werkzeug zu einer zentralen, von der Community getragenen Wissensplattform. Durch den geführten, strukturierten Prozess des "Living Document" wird Wissen nicht nur gesammelt, sondern aktiv veredelt.

    - **Effizienzsteigerung:** Gemeinsam erarbeitete Lösungen für Standardprobleme müssen nicht von jedem Unternehmen neu entwickelt werden.
    - **Qualitätsverbesserung:** Der strukturierte Ansatz (Problem -> Kontext -> Analyse -> Lösung) führt zu qualitativ hochwertigeren und vollständigeren Lösungen als unstrukturierte Foren.
    - **Nachhaltiges Wissenswachstum:** Die klar definierte "Finale Lösung" in jedem Dokument ist die perfekte Vorlage für neue, qualitativ hochwertige FAQ-Beiträge, was das exponentielle Wachstum der Wissensdatenbank fördert.
    - **Branchen-Leadership:** Die Plattform wird zum zentralen Anlaufpunkt für die kollaborative Lösung von komplexen Fragen in der Marktkommunikation.

    ## 3. User Stories

    **Story 1: Problem strukturiert erfassen**
    *Als* Sachbearbeiter
    *möchte ich* ein neues "Lösungsdokument" im Community Hub anlegen und die initiale Problembeschreibung ausfüllen
    *damit* ich von der Erfahrung von Kollegen aus anderen Unternehmen profitieren kann, ohne interne Details preiszugeben.

    **Story 2: Gemeinsam an der Lösung arbeiten**
    *Als* Community-Mitglied
    *möchte ich* ein bestehendes Lösungsdokument um Kontext, Analysen und konkrete Lösungsvorschläge in den dafür vorgesehenen Sektionen erweitern
    *damit* wir gemeinsam und nachvollziehbar die beste Vorgehensweise für ein komplexes Problem erarbeiten.

    **Story 3: Wissen dauerhaft sichern**
    *Als* Administrator
    *möchte ich* die als final markierte Lösungs-Sektion eines Dokuments mit einem Klick in einen offiziellen FAQ-Beitrag umwandeln
    *damit* das erarbeitete Wissen strukturiert, qualitätsgesichert und für alle Nutzer leicht auffindbar wird.

    **Story 4: Gemeinsam handeln**
    *Als* Sachbearbeiter
    *möchte ich* basierend auf einem finalisierten Lösungsdokument eine "Gemeinschaftsinitiative" starten
    *damit* wir als Gruppe eine formelle, gut dokumentierte Anfrage an eine externe Stelle formulieren können.

    **Story 5: Schnelle Eskalation aus dem Chat**
    *Als* gestresster Sachbearbeiter mitten in einem Arbeitsvorgang
    *möchte ich* mit einem Klick aus meiner aktuellen Chat-Session ein vorbefülltes Community-Living-Document erzeugen
    *damit* ich mein Stocken sofort in einen kollaborativen Lösungsprozess überführen kann, ohne zusätzliche Schreib- oder Formatierarbeit zu investieren.

    ## 4. Technisches Konzept & Architektur

    Der Community Hub wird als **additives Modul** implementiert.

    - **Das "Living Document" als Datenstruktur:** Anstelle eines einfachen Textfeldes wird jeder Community-Thread als strukturiertes **JSONB-Objekt** in der Datenbank gespeichert. Dieses Objekt repräsentiert das Canvas mit seinen Sektionen (z.B. `problem_description`, `context`, `solution_proposals`, `final_solution`).
    - **Datentrennung:** Community-Daten (Threads, Kommentare) liegen in dedizierten Tabellen. Vektorisierte Inhalte werden in einer **separaten Qdrant-Collection** (`community_content`) gespeichert, um eine strikte Trennung von internen Daten zu gewährleisten.
    - **Wiederverwendung von Services:** Der Prozess zur FAQ-Erstellung nutzt den **bestehenden `FaqService`** und die LLM-Logik. Als Input dient die extrahierte `final_solution` aus dem Lösungsdokument. Der Admin-Workflow wird in die **bestehende Admin-UI** integriert.

    ## 5. Iterativer Implementierungsplan

    ### Meilenstein 1: Kernfunktionalität – Kollaboratives Canvas & Semantische Suche

    **Ziel:** Eine funktionale Plattform schaffen, auf der Nutzer strukturierte Lösungsdokumente gemeinsam bearbeiten können.

    1.  **Datenbank-Schema:**
        *   Anpassung der Tabellen, um das "Living Document"-Konzept abzubilden.
            ```sql
            -- community_threads: Speichert das Lösungsdokument als JSONB
            CREATE TABLE community_threads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                document_content JSONB NOT NULL, -- Enthält Sektionen wie 'problem_description', 'solutions' etc.
                created_by_user_id UUID REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'discussing',
                tags TEXT[],
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- document_comments: Speichert Kommentare, die sich auf Blöcke im Dokument beziehen
            CREATE TABLE document_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                thread_id UUID REFERENCES community_threads(id) ON DELETE CASCADE,
                block_id VARCHAR(255) NOT NULL, -- ID des Blocks im JSONB, z.B. 'solution_proposal_abc'
                content TEXT NOT NULL,
                created_by_user_id UUID REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ```

    2.  **Backend-Services:**
        *   Neues Modul `src/modules/community/` mit `CommunityService` und `CommunityRepository`.
        *   Implementierung von Operationen, die das `document_content` JSONB-Feld manipulieren (z.B. `addSolutionProposal`, `updateContext`).
        *   **Qdrant-Integration:** Beim Aktualisieren des Dokuments werden die Inhalte der Sektionen vektorisiert und in der `community_content` Collection gespeichert.

    3.  **API-Endpunkte:**
        *   Neue Route `src/routes/community.ts` mit Endpunkten unter `/api/community/`.
        *   `GET /threads`, `POST /threads`, `GET /threads/:id`, `PUT /threads/:id/document` (zum Aktualisieren von Teilen des Dokuments), `POST /threads/:id/comments`.

    4.  **Frontend-UI:**
        *   Neue Seite `/community` mit der Übersicht der Lösungsdokumente.
        *   **Neue Komponente `LivingDocumentView.tsx`**: Dies ist die zentrale, interaktive Komponente. Sie rendert die JSONB-Struktur als visuell ansprechendes, editierbares Dokument mit klar getrennten Sektionen und ermöglicht das Hinzufügen von Inhalten und Kommentaren.

    **Ergebnis von Meilenstein 1:** Ein voll funktionsfähiges, kollaboratives Canvas mit semantischer Suche, um ähnliche Probleme schnell zu finden.

    ### Meilenstein 2: Workflow-Integration & Wissenskonservierung

    **Ziel:** Den Lebenszyklus eines Lösungsdokuments steuern und finalisierte Lösungen in permanentes Wissen umwandeln.

    1.  **Backend-Erweiterung:**
        *   Der `CommunityService` wird um Methoden zur Statusänderung von Threads erweitert.
        *   **FAQ-Integration:** Implementierung der Methode `createFaqFromDocument(threadId, adminId)`.
            *   Diese Methode extrahiert den Inhalt der `final_solution`-Sektion aus dem `document_content` JSONB.
            *   Sie ruft den **bestehenden `FaqService`** auf und übergibt diesen sauberen, finalen Text. Der `FaqService` nutzt wie gewohnt das LLM, um den FAQ-Beitrag zu formatieren und zu speichern.
            *   Die neue FAQ erhält ein `source: 'community'`-Flag.

    2.  **API-Erweiterung:**
        *   `PUT /threads/:id/status`: Endpunkt zur Statusänderung.
        *   `POST /admin/community/create-faq-from-thread`: Neuer, Admin-geschützter Endpunkt.

    3.  **Frontend-Erweiterung:**
        *   Die `LivingDocumentView.tsx` wird um UI-Elemente zur Statusänderung erweitert.
        *   **Admin-UI:** Das bestehende Admin-Panel wird um eine Sektion "Community-Freigaben" erweitert, in der Admins aus finalisierten Lösungsdokumenten FAQs erstellen können.

    **Ergebnis von Meilenstein 2:** Der Community Hub ist nun direkt an das Kern-Wissensmanagement angebunden. Wertvolle, kollaborativ erarbeitete Lösungen werden zu dauerhaftem, qualitätsgesichertem Wissen.

    ### Meilenstein 3: Externe Initiativen (Eskalation)

    **Ziel:** Der Community Werkzeuge an die Hand geben, um gemeinsam externen Wandel anzustoßen.

    1.  **Datenbank-Schema:**
        *   Neue Tabelle `community_initiatives` (unverändert).

    2.  **Backend-Erweiterung:**
        *   Der `CommunityService` wird um Methoden zur Verwaltung von Initiativen erweitert.
        *   **LLM-Integration:** Die Methode `draftInitiativeDocument(threadId)` wird noch effektiver, da sie nun das **hochstrukturierte Lösungsdokument** als Input nutzen kann, um einen qualitativ exzellenten Entwurf für ein formelles Dokument zu erstellen.

    3.  **API-Erweiterung:**
        *   CRUD-Endpunkte für `/threads/:id/initiative`.

    4.  **Frontend-Erweiterung:**
        *   In der `LivingDocumentView.tsx` wird ein "Initiative starten"-Button hinzugefügt.
        *   Eine neue Komponente `InitiativeView.tsx` zeigt den Status der Initiative und einen kollaborativen Editor an, in dem der LLM-Entwurf verfeinert wird.

    **Ergebnis von Meilenstein 3:** Die Plattform ist ein aktives Kollaborations-Tool, das die Branche befähigt, gemeinsam auf Herausforderungen zu reagieren.

    ## 6. Integrationspunkte / Schnittstellen zum bestehenden System

    Die folgenden bestehenden Komponenten werden wiederverwendet oder erweitert. Für jede Schnittstelle sind Zweck, Richtung (eingehend/ausgehend), Trigger, Datenobjekte und notwendige Änderungen angegeben.

    ### 6.1 Datenbank & Migrationen
    | Schnittstelle | Typ | Beschreibung | Änderungserfordernis |
    |---------------|-----|--------------|----------------------|
    | `users` Tabelle | Read (FK) | Verknüpfung von `community_threads.created_by_user_id` & `document_comments.created_by_user_id` | Keine Schemaänderung |
    | Neue Tabellen: `community_threads`, `document_comments`, später `community_initiatives` | Write | Speicherung Living Document & Kommentare | Neue Migrationen (Versioniert) |
    | `faqs` Tabelle | Write (Erstellung neuer FAQ) | Ableitung einer FAQ aus `final_solution` | Erweiterung: Zusatzfeld `source_thread_id UUID NULL`, Flag `source = 'community'` (alternativ Reuse vorhandener Source-Mechanik) |
    | Qdrant Collections | Write/Read | Neue Collection `community_content` (Vektoren für Sektionen) | Collection-Anlage + Index-Konfig |

    ### 6.2 Services / interne Module
    | Service / Modul | Rolle im Community Hub | Erforderliche Erweiterungen |
    |-----------------|------------------------|-----------------------------|
    | `QdrantService` | Vektorisierung & semantische Suche über Community-Sektionen | Methode `upsertCommunitySectionVectors(threadId, sections[])`; Nutzung separater Collection; Filter nach `thread_id` |
    | `geminiService` | LLM für FAQ-Generierung & Initiativen-Entwurf | Prompt-Vorlage für strukturiertes Dokument (Sections Map) hinzufügen |
    | (Geplanter) `CommunityService` | Orchestriert CRUD auf Threads & Kommentare, JSONB-Patch-Operationen, Statuswechsel | Neu anlegen: Methoden `createThread`, `updateSection`, `addSolutionProposal`, `finalizeSolution`, `createFaqFromThread` |
    | `faqLinkingService` | Optionale Verlinkung ähnlicher FAQs beim Anzeigen eines Threads | Evtl. neue Methode `getRelatedFaqsForThreadSections(sectionsText)` oder Reuse vorhandener API |
    | Auth / `authenticateToken` Middleware | Schutz interner Bearbeitungs-Endpunkte | Reuse; neue Rollenprüfung für Admin-Actions (FAQ-Erstellung) |

    ### 6.3 REST API Endpunkte (neu / erweitert)
    | Endpoint | Methode | Auth | Zweck | Antwort-Struktur (vereinfacht) |
    |----------|--------|------|------|-------------------------------|
    | `/api/community/threads` | GET | optional (öffentlich lesbar, konfigurierbar) | Liste Threads (Filter: Tag, Status, Suche) | `{ data: ThreadSummary[] }` |
    | `/api/community/threads` | POST | user | Thread anlegen | `{ data: Thread }` |
    | `/api/community/threads/:id` | GET | optional | Vollständiges Living Document | `{ data: Thread }` |
    | `/api/community/threads/:id/document` | PUT/PATCH | user (Owner oder Contributor) | Partielles Update einzelner Sektionen (JSON Patch Semantik) | `{ data: Thread }` |
    | `/api/community/threads/:id/comments` | POST | user | Kommentar an Block / Section | `{ data: Comment }` |
    | `/api/community/threads/:id/status` | PUT | user (Owner) / admin (Override) | Statuswechsel (`discussing` -> `review` -> `final`) | `{ data: { status } }` |
    | `/api/admin/community/create-faq-from-thread` | POST | admin | FAQ aus finalisiertem Thread erzeugen | `{ data: FAQ }` |
    | `/api/community/threads/:id/initiative` | POST | user (wenn Status = final) | Initiative starten (MS3) | `{ data: Initiative }` |
    | `/api/community/threads/:id/initiative` | GET | optional | Anzeigen Initiative | `{ data: Initiative }` |

    ### 6.4 Datenmodelle (vereinfachte Typen)
    ```ts
    type CommunityThread = {
        id: string;
        title: string;
        status: 'discussing' | 'review' | 'final';
        tags: string[];
        document_content: {
            problem_description?: string;
            context?: string;
            analysis?: string;
            solution_proposals?: { id: string; content: string; created_by: string; created_at: string; votes?: number }[];
            final_solution?: { content: string; approved_by?: string; approved_at?: string };
            meta?: Record<string, any>;
        };
        created_by_user_id: string;
        created_at: string;
    };

    type DocumentComment = {
        id: string;
        thread_id: string;
        block_id: string; // Referenz auf Section oder Proposal ID
        content: string;
        created_by_user_id: string;
        created_at: string;
    };

    type Initiative = {
        id: string;
        thread_id: string;
        draft_content: string; // LLM generiert
        status: 'draft' | 'refining' | 'submitted';
        created_at: string;
    };
    ```

    ### 6.5 Qdrant Integration (Detail)
    | Aspekt | Beschreibung |
    |--------|--------------|
    | Collection Name | `community_content` |
    | Payload Felder | `thread_id`, `section_key`, `content`, optional `proposal_id` |
    | Vector Quelle | Embedding Pipeline wie bestehend (Reuse Embedding Service / Model) |
    | Upsert Trigger | Bei Erstellung / Änderung von Sektionen & finaler Lösung |
    | Lösch-Strategie | Soft Delete: Entfernen aller Vektoren eines Threads bei Thread-Löschung |
    | Suche | Query: kombinierter Text (Problem + Kontext + Query User). Filter: nach Tags optional |

    ### 6.6 Sicherheits- & Privacy-Aspekte
    | Bereich | Maßnahme |
    |--------|----------|
    | Anonymisierung | Nur pseudonyme User-ID sichtbar (kein Klarname bei öffentlicher Anzeige konfigurativ) |
    | Rechte | Nur Ersteller + Admin dürfen `final_solution` setzen oder Status auf `final` wechseln |
    | Rate Limiting | Reuse vorhandener Middleware (falls nicht vorhanden: einfacher Counter pro User/Minute) |
    | Input Validation | Zod/Validator Schemata für Dokument-Patches |
    | Injection Schutz | Nur Whitelisted JSON Keys beim Patchen (Reject unbekannte Keys) |

    ### 6.7 Admin UI Erweiterungen
    | Feature | Beschreibung |
    |---------|--------------|
    | Dashboard Kachel | Anzahl Threads nach Status (discussing/review/final) |
    | Review Liste | Filter: Status=review -> Action: Approve Final Solution / Request Changes |
    | FAQ Erstellung | Button „FAQ erzeugen“ sichtbar wenn Status=final & `final_solution` vorhanden |

    ### 6.8 Events / Hooks (intern)
    | Event | Auslöser | Aktion |
    |-------|----------|--------|
    | `community.thread.created` | POST /threads | Indexiere Anfangssektionen (Problem/Context) in Qdrant |
    | `community.thread.updated` | PATCH Dokument | Re-Index geänderter Sektionen |
    | `community.thread.status.final` | Statuswechsel final | Sperre weitere Bearbeitung lösungsrelevanter Sektionen |
    | `community.thread.final_solution.set` | Setzen final_solution | Vorvalidierung + Option Auto-Vektor-Update |
    | `community.faq.created` | createFaqFromThread | Log + Linking zurück in Thread (`linked_faq_id`) |

    ### 6.9 Metriken & Observability
    | Kennzahl | Quelle | Nutzen |
    |----------|--------|-------|
    | Time-to-Final (Ø Tage) | timestamps status changes | Effizienz Community |
    | Proposal Count / Thread | document_content.solution_proposals | Aktivität |
    | Conversion Rate Thread->FAQ | Anzahl FAQs / Anzahl finaler Threads | Wissensqualität |
    | Such-Trefferquote | Qdrant Query Logs | Relevanz Embeddings |

    ### 6.10 Iterative Einbindung
    | Meilenstein | Minimal benötigte Integration |
    |-------------|-----------------------------|
    | MS1 | DB + neue Endpoints + Qdrant Collection + Basis UI |
    | MS2 | FAQ-Erstellung (FaqService Aufruf) + Admin UI Erweiterung |
    | MS3 | Initiativen Endpoints + LLM Prompt Erweiterung |

    ### 6.11 Offene Architektur-Entscheidungen
    | Thema | Option A | Option B | Empfehlung |
    |-------|----------|----------|------------|
    | JSONB Patch Strategie | Komplettes Dokument ersetzen | Fein-granulare Operations (JSON Patch RFC 6902) | B: bessere Konfliktauflösung |
    | Section Locking | Kein Lock (Last write wins) | Optimistic Concurrency via `updated_at`/ETag | B |
    | Voting für Proposals | Später | Direkt (Up/Down) | Später (Scope reduzieren) |
    | FAQ Erstellung Timing | Manuell durch Admin | Halb-automatisch bei final | Manuell (Qualität sichern) |

    ---
    Diese Integrationsübersicht dient als Referenz für Implementierung & Review und minimiert Kopplung, indem bestehende Services erweitert statt dupliziert werden.

    ## 7. Nutzerzentrierter Workflow & UX (Perspektive Sachbearbeiter unter Zeitdruck)

    ### 7.1 Ausgangssituation / Pain Points
    | Beobachtung | Implikation für Design |
    |-------------|------------------------|
    | Hoher Task-Switching Druck | Minimale neue UI-Konzepte; bekannte Pattern weiterverwenden |
    | Problem tritt selten (gefühlte Isolation) | Sofort sichtbare Indikation: "Andere bearbeiten ähnliche Fragen" |
    | Knappe Zeit (Interrupt der Routine) | Erfassung darf < 15 Sekunden dauern (Time-to-Thread) |
    | Kognitiver Overload bei leerem Formular | Auto-Vorbefüllung & Struktur statt Freitext |
    | Angst vor Preisgabe interner Details | Automatische Anonymisierung + Hinweis-Banner |

    ### 7.2 Trigger für Eskalation (System- & Nutzer-getrieben)
    | Trigger-Typ | Beschreibung | Umsetzung |
    |------------|--------------|-----------|
    | User Intent | Klick auf "Community helfen lassen" im Chat | Button/Pill im Chat-Footer |
    | Low Confidence Antwort | LLM Confidence < Schwellwert + Nutzer klickt "Unklar" | UI zeigt dezente Eskalations-Empfehlung |
    | Wiederholte Rephrase | >= 3 ähnlich semantische Fragen ohne zufriedenstellende Lösung | Inline Hinweis + Vorschlag zur Eskalation |
    | Fehlercode Pattern | Erkennung bekannter schwieriger Marktkommunikations-Fehlercodes | Automatischer Pre-Select Eskalationsoption |

    ### 7.3 One-Click-Eskalation Ablauf (Happy Path)
    1. Nutzer klickt im Chat auf "In Community analysieren".
    2. Modal (nicht voller Seitenwechsel) zeigt Voransicht: Titel (auto generiert), Problemzusammenfassung, extrahierter Kontext.
    3. Nutzer bestätigt – Thread wird angelegt (optimistisches UI-Update, ID reserviert per sofortigem POST).
    4. UI wechselt in Splitscreen: Links ursprünglicher Chat (read-only Snapshot), rechts Living Document (Edit Fokus auf erstes noch unbestätigtes Feld).
    5. Sektionen werden live gespeichert (Debounce 800ms) + Fortschrittsindikator "Gespeichert".

    ### 7.4 Automatische Vorbefüllung
    | Feld | Quelle | Verarbeitung |
    |------|--------|--------------|
    | `title` | Letzte User Frage (gekürzt) | LLM Kurzfassung (<= 80 Zeichen) |
    | `problem_description` | Chat Verlauf letzter 5 User + Assistant Beiträge | Extraktion + Reduktion irrelevanter Floskeln |
    | `context` | System-Metadaten (Prozess-Typ, ggf. erkannter EDIFACT Vorgang) | Mapping auf standardisierte Schlagworte |
    | `attempted_solutions` (intern) | Assistant Antworten + User Feedback | Klassifikation: was schon versucht wurde |
    | Sensitive Scrubbing | Regex + Heuristiken (EIC, Zählpunkt, Kundennummer) | Maskierung mit Platzhaltern (z.B. `EIC_XXXX`) |

    ### 7.5 UX Prinzipien
    | Prinzip | Konkretisierung |
    |---------|----------------|
    | Zero Draft Effort | Kein leeres Formular – alles hat initiale Inhalte |
    | Focused Editing | Cursor direkt im relevantesten leeren / schwachen Abschnitt |
    | Reversible | "Abbrechen & zurück zum Chat" bis Status != `review` |
    | Progressive Disclosure | Sektionen wie `analysis` erst sichtbar wenn Nutzer "Mehr Details hinzufügen" klickt |
    | Cognitive Anchors | Farbliche, konsistente Section Header (Problem=Rot, Kontext=Blau, Lösungen=Grün, Final=Gold) |
    | Low Friction Collaboration | Inline-Kommentar Icon erscheint beim Hover rechts neben Textpassagen |
    | Status Klarheit | Badge + Tooltip mit Definition (z.B. `review = Awaiting peer confirmation`) |

    ### 7.6 Mikrointeraktionen & Feedback
    | Aktion | Feedback |
    |-------|----------|
    | Auto-Save | Kurzer "Gespeichert" Fade-In unter Section Header |
    | Set Final Solution | Dialog mit Diff Vorschau vs. letzter Stand + Erfolg Toast |
    | Vorschlag hinzufügen | Sofortige farbliche Hervorhebung + sanfte Scroll zu Eintrag |
    | Eskalations-Modal öffnen | Fokusfalle, ESC schließt, Enter bestätigt |

    ### 7.7 Akzeptanzkriterien (funktional)
    | ID | Kriterium | Metrik/Test |
    |----|-----------|-------------|
    | AC-ESK-01 | Erstellung eines Threads aus Chat dauert < 3 Sekunden Roundtrip | Netzwerk Trace |
    | AC-ESK-02 | Nutzer sieht vorbefülltes Dokument ohne manuelle Eingabe | UI Snapshot Test |
    | AC-ESK-03 | Maskierung sensibler Muster (EIC, Zählpunkt) funktioniert | Unit Tests Regex |
    | AC-ESK-04 | Abbruch vor Statusänderung löscht leeren Thread | DB Check |
    | AC-ESK-05 | Niedrige Antwort-Confidence triggert Eskalations-Hinweis | Simulation LLM Response |

    ### 7.8 UX Metriken / Erfolgsmessung
    | Metrik | Zielwert (Initial) | Zweck |
    |--------|-------------------|-------|
    | Time-to-Thread (Median) | <= 15s | Reibungsfreiheit |
    | Abbruchquote nach Erstellung | < 20% | Qualität Vorbefüllung |
    | Anteil Threads mit finaler Lösung < 14 Tage | > 60% | Kollaborative Effizienz |
    | Chat->Community Eskalationsrate bei ungelösten Sessions | 5–15% | Gesunde Nutzung (nicht Über- oder Unter-Eskalation) |
    | Feedback "Hilfreich" auf finalisierte Lösungen | > 70% positiv | Qualitative Validierung |

    ### 7.9 Technische Umsetzung der Eskalation (Kurzarchitektur)
    | Komponente | Verantwortung |
    |------------|--------------|
    | Chat Frontend | Button + Modal, sammelt Kontext (Conversation Slice) |
    | Aggregator (Client) | Serialisiert Minimal-Payload (Frage, letzte Antworten, extrahierte Entities) |
    | API `POST /api/community/threads` | Nimmt Payload an, erzeugt Thread + initiales `document_content` |
    | LLM Prompt Layer | Kürzt & klassifiziert; Rückgabe strukturierter Felder |
    | Scrubbing Utility | Maskiert erkannte Identifier vor Persistenz |
    | Event Dispatcher | feuert `community.thread.created` (Indexierung Qdrant) |

    ### 7.10 Risiko- & Mitigationsübersicht
    | Risiko | Auswirkung | Mitigation |
    |-------|-----------|-----------|
    | Übermäßige Threads (Spam) | Rauschen / Suchverschlechterung | Rate Limit + Mindestlänge Problemfeld |
    | Unmasked Sensitive Data | Compliance Risiko | Mehrstufiger Scrub + Post-Insert Audit Job |
    | Unklare Ownership | Threads bleiben in "discussing" hängen | Auto-Reminder nach 48h Inaktivität |
    | Fehlklassifikation Kontext | Schlechtere Auffindbarkeit | Feedback Loop: Admin Korrektur trainiert Klassifikator |

    ### 7.11 Future Enhancements (nicht Scope initial)
    | Idee | Nutzen |
    |------|-------|
    | KI-Vorschläge für nächste fehlende Section | Beschleunigt Fertigstellung |
    | Inline Diff View zwischen Proposals | Erhöht Vergleichbarkeit |
    | Persönliche "Focus Queue" | Bündelt offene Threads des Nutzers |

    ### 7.12 Visuelle Kontext-Markierung (Theme Swap Community Hub)
    Ziel: Der Nutzer erkennt unmittelbar (peripher visuell), dass er sich im Community-Kontext befindet (mentaler Modus-Wechsel). Dazu wird im Community Hub das Farb-Schema gezielt invertiert / getauscht.

    | Bereich | Standard App (Referenz) | Community Hub (neu) | Zweck |
    |--------|-------------------------|---------------------|-------|
    | Primärfarbe (`--color-primary`) | #147a50 (Grün) | #ee7f4b (Orange) | Signal: Kollaboration / aktiver Austausch |
    | Sekundärfarbe (`--color-secondary`) | #ee7f4b (Orange) | #147a50 (Grün) | Harmonische Umkehr, Erhalt Wiedererkennung |
    | Accent Badges Final Solution | Gold (#d4af37) | unverändert | Konstanz für Wichtigkeit |
    | Header Gradient | Basis Primary -> Darker Shade | Orange -> tieferes Burnt (#d15f2b) | Deutlicher Frame |

    #### 7.12.1 Implementierung (Technisch)
    | Aspekt | Entscheidung |
    |--------|-------------|
    | CSS Architektur | Nutzung CSS Custom Properties + Attribut- oder Body-Klassen Umschaltung (`<body data-context="community">`) |
    | Scope Isolation | Theme-Klasse auf Root (`html` oder `body`) – keine Hard Overrides innerhalb Komponenten |
    | Komponenten Anpassung | Nur Farb-Token; keine Layout/Spacing Änderungen (Minimale kognitive Störung) |
    | Dark Mode | Optional zweite Variable Ebene: `--color-primary-rgb` für Mix/Alpha |
    | Transition | Sanfter 150ms Farb-Transition beim Eintritt, kein Fading von Text (Vermeidung Flimmern) |

    #### 7.12.2 Beispiel Token (Pseudocode)
    ```css
    :root {
        --color-primary: #147a50;
        --color-secondary: #ee7f4b;
        --color-primary-rgb: 20 122 80;
        --color-secondary-rgb: 238 127 75;
    }

    body[data-context="community"] {
        --color-primary: #ee7f4b;
        --color-secondary: #147a50;
        --color-primary-rgb: 238 127 75;
        --color-secondary-rgb: 20 122 80;
    }
    ```

    #### 7.12.3 Aktivierungslogik
    | Trigger | Mechanik |
    |---------|----------|
    | Route `/community` oder `/community/*` | Router-Level Wrapper setzt `data-context="community"` |
    | Eskalations-Splitscreen | Beim Öffnen Modal bereits Preload der Community Styles (CLS vermeiden) |
    | Navigations-Wechsel zurück zu Chat | Entfernen Attribut -> Revert ohne Full Page Reload |

    #### 7.12.4 Usability & Accessibility
    | Kriterium | Maßnahme |
    |----------|----------|
    | Farbkontrast | WCAG AA Prüfung: Primär (#ee7f4b) auf Weiß > 3:1 für UI-Elemente mit Icon + Text Bold; Buttons erhalten dunkleren Hover (#d86a34) |
    | Farb-Bedeutung | Keine Konflikte mit Fehlermeldungsrot (#c0392b) – Orange bewusst abgesetzt |
    | Motion Sensitivity | Transition nur Farbwerte, keine Layout-Animation |
    | Blind Color Users | Unterstützung durch zusätzliches "Community" Label / Icon (z.B. Handschlag) im Header |

    #### 7.12.5 QA Checkliste
    | Test | Erwartung |
    |------|-----------|
    | Theme Toggle Navigation | Kein Flash of Unstyled Content (FOUC) |
    | Druckansicht | Fallback zu Standardfarben oder neutrales Schwarz/Weiß |
    | High Contrast OS Mode | Variablen überschreibbar, keine fixen Hex in Komponenten |
    | E-Mail Benachrichtigungen | Bleiben beim Standard Branding (kein Theme Swap) |

    #### 7.12.6 Risiken & Mitigation
    | Risiko | Mitigation |
    |-------|-----------|
    | Verwechslung Orange = Warnung | Konsistente Nutzung Oranges ausschließlich als Primär, nicht für Fehlerstates |
    | Komponenten mit Hard-Coded Farben | Scout via Grep, refactor zu Tokens vor Rollout |
    | Theming Drift (zukünftige Features) | Linter/Stylelint Regel: Verbot harter Marken-Hex außerhalb Token Datei |

    ---

    ---
    Dieser Abschnitt stellt sicher, dass die Lösung den realen Arbeitsalltag eines unter Zeitdruck stehenden Sachbearbeiters adressiert und Eskalation zum Community Hub mit minimaler Reibung möglich ist.

    ## 8. Verweise & Anhänge
    | Referenz | Datei | Zweck | Status |
    |----------|-------|-------|--------|
    | Anhang A: Chat Flow & Confidence | `docs/chat-flow.md` | Definiert Chat State Machine, Confidence Score & Eskalations-Trigger als Grundlage für Abschnitt 7 (Eskalation) | Entwurf v1.0 |

    Hinweis: `chat-flow.md` ist kein separater Change Request im Sinne eines eigenständigen Scopes, sondern ein **unterstützendes Technisches Design / Annex** zu diesem CR (CR-COMMUNITY-HUB-001). Falls Governance eine formale CR-Nummer verlangt, kann das Dokument optional als "CR-COMMUNITY-HUB-001-ANNEX-CHAT" geführt werden, ohne eigenen Umsetzungs-Backlog – sämtliche Umsetzungspunkte bleiben hier im Haupt-CR priorisiert.

    Empfohlene Vorgehensweise:
    1. Pflege der Confidence-Gewichte & Events ausschließlich im Annex (Single Source).
    2. Bei Änderungen an Triggern (Schwellen / Guardrails) kurzer Vermerk im Changelog-Block am Ende von `chat-flow.md`.
    3. Dieser Haupt-CR referenziert stets nur die aktuelle Version – keine Duplikation der Formeln hier.

    ## 9. Technische Feinspezifikation: JSONB Patch & Eventing

    ### 9.1 Ziele
    - Konfliktarme, teil-sektionale Updates des `document_content` JSONB ohne komplettes Dokument neu zu schreiben.
    - Minimale Overhead-Latenz (Patch < 30ms DB Roundtrip bei Standardgröße).
    - Deterministische Event-Emission zur Re-Indexierung in Qdrant & Telemetrie.

    ### 9.2 Patch Modell
    Verwendetes Format: Vereinfachte **RFC 6902 JSON Patch** Submenge + proprietäre `op: upsertProposal` Operation.

    Zulässige Operationen:
    ```json
    [
        { "op": "replace", "path": "/problem_description", "value": "Neuer Text" },
        { "op": "replace", "path": "/context", "value": "Aktualisierter Kontext" },
        { "op": "add", "path": "/solution_proposals/-", "value": { "content": "Vorschlag X" } },
        { "op": "upsertProposal", "proposalId": "p_123", "value": { "content": "Überarbeiteter Vorschlag" } },
        { "op": "replace", "path": "/final_solution", "value": { "content": "Finaler konsolidierter Text" } }
    ]
    ```

    Regeln:
    - `replace` nur für Top-Level Keys der ersten Ebene erlaubt (`problem_description`, `context`, `analysis`, `final_solution`).
    - `add` auf `/solution_proposals/-` hängt neues Objekt an (Server vergibt `id`, `created_at`, `created_by`).
    - `upsertProposal` ersetzt oder erstellt `solution_proposals[]` Element mit gegebener `proposalId` (idempotent für Collaboration).
    - Keine `remove` Operation initial (Reduktion Komplexität). Stattdessen Flagging/Lifecycle später möglich.
    - `final_solution` Patch nur erlaubt, wenn Status != `final` ODER Admin.

    ### 9.3 Serverseitige Validierung
    | Check | Beschreibung | Fehlercode |
    |-------|--------------|-----------|
    | Pfad Whitelist | Nur definierte Pfade | `INVALID_PATH` |
    | Datentyp | `value` Typprüfung (String / Objekt) | `INVALID_TYPE` |
    | Größenlimit | Einzel-Value max 20k chars | `VALUE_TOO_LARGE` |
    | Proposal Count Limit | max 50 Proposals | `PROPOSAL_LIMIT` |
    | Final Solution Lock | Block wenn Status = final & kein Admin | `FINAL_LOCKED` |

    ### 9.4 DB Umsetzung (PostgreSQL)
    Pseudo-SQL für Patch Anwendung (vereinfachtes Beispiel Replace):
    ```sql
    UPDATE community_threads
    SET document_content = jsonb_set(document_content, '{problem_description}', to_jsonb($1::text), true),
            updated_at = NOW()
    WHERE id = $thread_id
    RETURNING document_content;
    ```

    Für Proposals (Add):
    ```sql
    UPDATE community_threads
    SET document_content = jsonb_set(
        document_content,
        '{solution_proposals}',
        COALESCE(document_content->'solution_proposals','[]'::jsonb) || to_jsonb(jsonb_build_object(
            'id', $proposal_id,
            'content', $content,
            'created_by', $user_id,
            'created_at', NOW()::text
        )),
        true
    ), updated_at = NOW()
    WHERE id = $thread_id
    RETURNING document_content;
    ```

    ### 9.5 Optimistische Konkurrenzkontrolle
    - Client sendet Header `If-Version: <updated_at ISO>`.
    - Server vergleicht mit Row `updated_at`. Bei Abweichung → `409 CONFLICT` + aktuelle Version.
    - Client zeigt Merge UI (einfach: lokal erneut anwenden, Diff Highlight).

    ### 9.6 Event Emission Pipeline
    | Schritt | Mechanik | Latenz Ziel |
    |--------|----------|-------------|
    | Patch angewendet | DB Transaction Commit | - |
    | Domain Event Build | Synchronous im Service | < 5ms |
    | Event Dispatch | In-Memory Queue (Phase 1) / später Message Bus | < 2ms |
    | Qdrant Reindex Worker | Asynchron Batch (Debounce 1s / Thread) | < 5s bis Konsistenz |

    ### 9.7 Event Payloads (Detail)
    ```json
    {
        "event":"community.thread.updated",
        "thread_id":"uuid",
        "changed_sections":["context","solution_proposals"],
        "status":"discussing",
        "version":"2025-08-09T12:31:22.123Z"
    }
    ```
    ```json
    {
        "event":"community.thread.final_solution.set",
        "thread_id":"uuid",
        "approved_by":"user_uuid",
        "version":"2025-08-09T12:35:10.010Z"
    }
    ```

    ### 9.8 Changed Sections Detection
    Vergleich alter vs. neuer `document_content` JSONB im Service (vor/ nach Patch) → Set geänderter Top-Level Keys + spezielle Kennzeichnung `solution_proposals` falls Länge oder Inhalte differieren (Hashliste). Hash: sha1(content) truncated (8 chars) pro Proposal.

    ### 9.9 Qdrant Reindex Strategie
    | Szenario | Aktion |
    |----------|--------|
    | Änderung einfacher Felder (problem_description/context/analysis) | Upsert einzelne Sektion |
    | Neue Proposal hinzugefügt | Upsert nur neue Proposal Vektor |
    | Proposal geändert | Delete + Upsert (nach Hash Unterschied) |
    | Final Solution gesetzt | Upsert `final_solution` + Tagging Payload `is_final=true` |
    | Massenänderung (>3 Sektionen) | Vollständiges Re-Embedding Batch |

    Batch Worker Pseudocode:
    ```ts
    queue.debounce(threadId, 1000, async changes => {
        for (const section of changes) await embedAndUpsert(section);
    });
    ```

    ### 9.10 Fehlerbehandlung
    | Fehler | Reaktion |
    |-------|----------|
    | Konflikt (409) | Client fordert frische Version an, wendet Patch erneut an |
    | Qdrant Down | Event bleibt in Retry Queue (Exponential Backoff, max 10 Versuche) |
    | Ungültiger Patch | 400 + Detail; kein Event |
    | Partieller Batch Fail | Erfolgreiche Upserts bleiben, Fail wird retried isoliert |

    ### 9.11 Telemetrie Felder (Zusatz)
    | Feld | Beschreibung |
    |------|--------------|
    | patch_ops_count | Anzahl Operationen im Request |
    | patch_bytes | Größe Roh-Payload |
    | proposals_total | Anzahl Proposals nach Update |
    | reindex_sections | Liste Sektionen an Qdrant Worker |

    ### 9.12 Security & Audit
    - Audit Log Tabelle `community_thread_audit(thread_id, user_id, ops_json, created_at)` für forensische Nachvollziehbarkeit.
    - Speicherung nur delta (Patch Array), nicht kompletter Dokumentinhalt (DSGVO Minimierung).
    - Optional Hash des resultierenden Dokuments für Integritätsnachweise.

    ### 9.13 Testfälle (Minimal Set)
    | Test | Erwartung |
    |------|-----------|
    | Replace problem_description | Feld ersetzt, Event mit changed_sections=[problem_description] |
    | Add proposal | proposals_total inkrementiert, Qdrant nur neue Proposal indexiert |
    | Upsert bestehende Proposal | Alte Hash != neue Hash → Reindex genau 1 Proposal |
    | Final Solution ohne Rechte | 403 Fehler |
    | Parallel Patch Konflikt | Zweiter Patch 409 + liefert neue Version |

    ### 9.14 Nicht Bestandteil (Bewusster Ausschluss v1)
    | Feature | Grund |
    |---------|-------|
    | Nested Patch tiefer als 1 Ebene | Komplexität Merge | 
    | Remove Operation | Risiko versehentlicher Datenverlust |
    | Bulk Multi-Thread Patch | Nicht benötigt im UI Flow |

    ---
    Diese Feinspezifikation konkretisiert die in den Abschnitten 6 & 7 skizzierten Mechanismen und dient als verbindliche Implementierungsgrundlage für MS1/MS2.

    ## 10. Implementation Playbook (Agent Briefing / Optimiert für AI Umsetzung)
    Kurzer, maschinenfreundlicher Auszug aller relevanten Artefakte zur direkten Implementierung (Claude Sonnet 4).

    ### 10.1 Glossar (Token-Stabil)
    | Begriff | Bedeutung |
    |---------|-----------|
    | Thread | Ein Community Lösungsdokument (Row in `community_threads`) |
    | Proposal | Ein Element in `document_content.solution_proposals[]` |
    | Final Solution | `document_content.final_solution.content` |
    | Patch | JSON Patch Subset laut Abschnitt 9 |
    | Reindex | Embedding + Upsert in Qdrant Collection `community_content` |

    ### 10.2 Annahmen (Defaults)
    | Item | Wert |
    |------|------|
    | Embedding Dimension | 1536 (OpenAI/Gemini-kompatibel; anpassen falls anders) |
    | Max Thread JSON Größe | 128 KB |
    | Qdrant Distance | Cosine |
    | Feature Flag Name | `FEATURE_COMMUNITY_HUB` |

    ### 10.3 Migrations (Dateinamenskonvention)
    | Reihenfolge | Datei (Vorschlag) | Inhalt |
    |-------------|------------------|--------|
    | 1 | `20250809_01_create_community_threads.sql` | Tabelle `community_threads` + Indexe |
    | 2 | `20250809_02_create_document_comments.sql` | Tabelle `document_comments` |
    | 3 | `20250809_03_add_source_thread_to_faqs.sql` | ALTER TABLE `faqs` (Spalte `source_thread_id UUID NULL`) |
    | 4 | (MS3) `20250809_04_create_community_initiatives.sql` | Initiatives Tabelle |

    ### 10.4 Tabellen (vollständig)
    ```sql
    CREATE TABLE community_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        document_content JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'discussing',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_by_user_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_community_threads_status ON community_threads(status);
    CREATE INDEX idx_community_threads_created_at ON community_threads(created_at DESC);
    CREATE INDEX idx_community_threads_tags_gin ON community_threads USING GIN(tags);

    CREATE TABLE document_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
        block_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by_user_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_document_comments_thread ON document_comments(thread_id);
    ```

    ### 10.5 API Contract (Kurzform)
    | Route | Method | Body (Schema) | 200 Response Keys | Fehler |
    |-------|--------|---------------|-------------------|--------|
    | `/api/community/threads` | POST | `{ title, initialContent? }` | `{ data: { id } }` | 400 invalid |
    | `/api/community/threads/:id` | GET | - | `{ data: Thread }` | 404 |
    | `/api/community/threads/:id/document` | PATCH | `PatchOperation[]` | `{ data: Thread, changed:[] }` | 409 version |
    | `/api/community/threads/:id/comments` | POST | `{ blockId, content }` | `{ data: Comment }` | 400/404 |
    | `/api/community/threads/:id/status` | PUT | `{ status }` | `{ data:{ status } }` | 400 invalid flow |
    | `/api/admin/community/create-faq-from-thread` | POST | `{ threadId }` | `{ data: FAQ }` | 403/422 |

    ### 10.6 Beispiel Response (GET Thread)
    ```json
    {
        "data": {
            "id": "uuid",
            "title": "Fehler UTILMD 9999",
            "status": "discussing",
            "tags": ["UTILMD"],
            "document_content": {
                "problem_description": "...",
                "context": "...",
                "solution_proposals": [ { "id":"p_1","content":"Ansatz A","created_by":"u1","created_at":"2025-08-09T10:00:00Z" } ]
            },
            "created_by_user_id": "u1",
            "created_at": "2025-08-09T09:59:50Z",
            "updated_at": "2025-08-09T10:00:05Z"
        }
    }
    ```

    ### 10.7 Error Mapping
    | Code | HTTP | Beispiel JSON |
    |------|------|---------------|
    | INVALID_PATH | 400 | `{ "error":"INVALID_PATH","detail":"/foo not allowed"}` |
    | INVALID_TYPE | 400 | ... |
    | VALUE_TOO_LARGE | 413 | ... |
    | PROPOSAL_LIMIT | 422 | ... |
    | FINAL_LOCKED | 403 | ... |
    | VERSION_CONFLICT | 409 | `{ "error":"VERSION_CONFLICT","serverVersion":"2025-..."}` |

    ### 10.8 Feature Flagging
    | Flag | Beschreibung | Default |
    |------|--------------|---------|
    | FEATURE_COMMUNITY_HUB | Gesamte Community Routen aktiv | false |
    | FEATURE_COMMUNITY_ESCALATION | Button im Chat & Modal | false |

    ### 10.9 Env Variablen
    | Name | Zweck | Beispiel |
    |------|------|----------|
    | QDRANT_COMMUNITY_COLLECTION | Collection Name | `community_content` |
    | COMMUNITY_MAX_PROPOSALS | Limit | `50` |
    | COMMUNITY_ENABLE_PUBLIC_READ | Öffentliche Listen | `0`/`1` |

    ### 10.10 Logging / Events Format (JSON Lines)
    Keys Pflicht: `event`, `ts`, `thread_id` (wenn relevant)
    ```json
    {"event":"community.thread.created","thread_id":"uuid","ts":"2025-08-09T10:00:00.000Z","status":"discussing"}
    {"event":"community.thread.updated","thread_id":"uuid","changed_sections":["context"],"patch_ops_count":1,"ts":"2025-08-09T10:01:02.010Z"}
    ```

    ### 10.11 Testfall Matrix (Dateivorschläge)
    | Testdatei | Fokus |
    |-----------|-------|
    | `test-community-threads.api.ts` | CRUD + Statusflow |
    | `test-community-patch-validation.ts` | Path/Type/Limit Fehler |
    | `test-community-proposals.ts` | Add / Upsert Proposal Szenarien |
    | `test-community-final-solution.ts` | Rechte + Lock |
    | `test-community-qdrant-index.ts` | Event → Reindex Mock |
    | `test-community-faq-integration.ts` | createFaqFromThread Flow |

    ### 10.12 Performance Budgets
    | Operation | Ziel |
    |-----------|------|
    | Thread POST | < 120ms Server (ohne Embedding) |
    | Patch (ein Feld) | < 80ms |
    | Reindex (ein Section Vector) | < 1500ms Async |

    ### 10.13 Security Checks
    | Bereich | Maßnahme |
    |--------|----------|
    | Input | Zod Schema für Patch Array |
    | Auth | JWT Middleware reuse, Admin Gate für FAQ & Final Override |
    | Rate | 30 Patch Ops / 5 min / User (konfigurierbar) |
    | Audit | Insert Zeile in `community_thread_audit` bei Erfolg |

    ### 10.14 Rollout Sequenz (CI/CD)
    1. Deploy Migrationen (Feature Flags OFF)
    2. Deploy Backend Routen (Flag protected)
    3. Smoke Tests / Health
    4. Aktivierung `FEATURE_COMMUNITY_HUB` für Internal Users
    5. Aktivierung Escalation Flag (Stichprobe 25%)
    6. Monitoring Fehlerquote < 1% 48h → Rollout 100%

    ### 10.15 Out-of-Scope (Explizit)
    | Item | Grund |
    |------|------|
    | Proposal Voting | Verschoben |
    | Realtime Presence | Latency & Complexity |
    | Undo History | Storage Overhead |

    ### 10.16 Agent Priorisierte Tasks (Backlog v1)
    | Prio | Task | Abhängigkeit |
    |------|------|--------------|
    | P0 | Migration `community_threads` & `document_comments` | Keine |
    | P0 | Qdrant Collection Erstellen (id, section_key, content, thread_id) | Migration |
    | P0 | `CommunityService.createThread` | Migration |
    | P0 | `PATCH /threads/:id/document` Endpoint + Validation | Service Basis |
    | P0 | Events Emission + In-Memory Queue | Service Basis |
    | P1 | Qdrant Reindex Worker (Debounce) | Events |
    | P1 | Status Update Endpoint | Threads existieren |
    | P1 | FAQ Creation Endpoint | Final Solution |
    | P2 | Initiative Endpoints | MS3 |

    ### 10.17 Prompt Hooks (LLM Integration Hinweis)
    | Nutzung | Input Felder | Output Erwartet |
    |--------|--------------|-----------------|
    | Prefill Summarize | Letzte User/Assistant Turns | { title, problem_description, context } |
    | FAQ Format | final_solution + Meta | { title, description, context, answer, tags[] } |
    | Initiative Draft (MS3) | full document_content | { draft_content } |

    ### 10.18 Kritische Implementierungsdetails (Ergänzung)

    #### Bestehende Codebase-Integration:
    - **Embedding-Dimension**: Laut `qdrant.ts` aktuell **768** (nicht 1536) → Update Annahme 10.2
    - **Collection Pattern**: Bestehend `ewilli` Collection, neue `community_content` Collection
    - **Auth Middleware**: Vorhanden in `src/middleware/auth.ts` → Reuse
    - **FAQ Service**: Liegt in `/src/routes/faq.ts` → Integration über bestehende Endpunkte

    #### TypeScript Interfaces (fehlend):
    ```ts
    // src/types/community.ts
    export interface CommunityVectorPoint {
    thread_id: string;
    section_key: 'problem_description' | 'context' | 'analysis' | 'final_solution' | 'proposal';
    content: string;
    proposal_id?: string;
    created_at: string;
    }

    export interface PatchOperation {
    op: 'replace' | 'add' | 'upsertProposal';
    path?: string;
    proposalId?: string;
    value: string | object;
    }
    ```

    #### Zod Schema (Beispiel):
    ```ts
    import { z } from 'zod';
    export const PatchSchema = z.array(z.object({
    op: z.enum(['replace', 'add', 'upsertProposal']),
    path: z.string().optional(),
    proposalId: z.string().optional(),
    value: z.union([z.string(), z.object({})]).refine(val => 
        typeof val === 'string' ? val.length <= 20000 : true
    )
    }));
    ```

    #### Feature Flag Utility:
    ```ts
    // src/utils/featureFlags.ts
    export const isFeatureEnabled = (flag: string): boolean => {
    return process.env[flag] === 'true' || process.env[flag] === '1';
    };
    ```

    #### Audit Tabelle SQL:
    ```sql
    CREATE TABLE community_thread_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES community_threads(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ops_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```

    ---
    **Status: READY FOR IMPLEMENTATION** ✅  
    Dieser CR ist vollständig spezifiziert für autonome AI-Umsetzung. Die oben ergänzten Details schließen die letzten Lücken für voll deterministisches Implementieren.


