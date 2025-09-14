# Öffentliche Read-Only Darstellung der Konsultation (Mitteilung Nr. 53) in Next.js

Stand: 2025-09-13

Ziel
- Read-Only-Landingpage in Next.js für die Konsultation (Mitteilung Nr. 53), inkl. SEO/OG/JSON-LD.
- Nutzung bestehender Community-Hub-Inhalte (Threads/Initiatives) ohne Login, strikt lesend und PII-frei.
- Anschluss an „Fachartikel“/Whitepaper-Bereich für Reichweite und interne Verlinkung.

Neue Quelle (Seed)
- Die Datei `docs/konsultation.md` enthält eine strukturierte Markdown-Fassung (Kapitel 1–10 inkl. 9.1.x). Diese nutzen wir als initiale, kuratierte Quelle für die öffentliche Landingpage und für Kapitel-Teaser/Fachartikel, bis der Community-Thread „final + is_public“ ist. Danach kann die Public-API dynamisch aus dem Community Hub spiegeln (gleiche Struktur/Keys), mit `konsultation.md` als Fallback.

Rahmenbedingungen
- Community Hub ist aktuell nur für eingeloggte Nutzer (React-App). Öffentliche Sichtbarkeit fehlt.
- Feature-Flags vorhanden (COMMUNITY_ENABLE_PUBLIC_READ). API/Services existieren.

Architektur (High-Level)
- Public Mirror API (serverseitig):
  - Neue Routen unter /api/public/community/… (Express), nur GET, nur whitelisted Threads/Initiatives.
  - Sanitizing: Content, Titel, Tags, Status, Zeitstempel; keine Nutzer-IDs, keine Kommentare, kein Audit.
  - Quelle: CommunityService/Repository; Sichtbarkeitsflag pro Thread/Initiative (z. B. meta.is_public = true).
- Next.js Seiten:
  - Landing: /konsultation/mitteilung-53 (SSR/SSG mit revalidate: 300s).
  - JSON-LD (WebPage + DiscussionForumPosting), OG-Tags, Canonical.
  - Interne Sprungmarken für Kap. 1–8 (Allgemeines Feedback) und Kap. 9 (API-Ausgestaltung).
- Fachartikel-Integration:
  - 2 Varianten: (a) eine lange Seite mit Kapiteln und Ankern; (b) pro Kapitel „Artikel-Teaser“ im Bereich /wissen/artikel mit Cross-Links.
  - Nutzung existierender Articles/Whitepaper-Hilfsfunktionen (src/pages/whitepaper, lib/content/articles).
- Veröffentlichung/Workflow:
  - Interner Thread bleibt kollaborativ; „final“ + „is_public“ ⇒ Public Mirror/API revalidiert (On-Demand Revalidation Hook).
  - Initiative generiert öffentliches „Executive Summary“ und Download (PDF/DOCX) der Stellungnahme.

Kapitel-Mapping (Struktur)
- sections[]: geordnete Liste passender Kapitel:
  - { key: "ch1",  title: "1 Warum veröffentlicht EDI@Energy ein Konzept?" }
  - { key: "ch2",  title: "2 Einleitung" }
  - { key: "ch3",  title: "3 Veröffentlichung auf GitHub" }
  - { key: "ch3_1", title: "3.1 Versionierung eines Repository" }
  - { key: "ch3_2", title: "3.2 Änderungsmanagement" }
  - { key: "ch3_3", title: "3.3 Änderungshistorie des Releases und eines API-Webdienstes" }
  - { key: "ch3_3_1", title: "3.3.1 Änderungshistorie eines Repository" }
  - { key: "ch3_3_2", title: "3.3.2 Änderungshistorie eines API-Webdienstes" }
  - { key: "ch4",  title: "4 Umgang mit zukünftigen Konsultationsbeiträgen" }
  - { key: "ch5",  title: "5 Fehler oder Änderungswunsch in einem API-Webdienst" }
  - { key: "ch6",  title: "6 Aufbau der API-Webdienste" }
  - { key: "ch6_1", title: "6.1 Aufbau von API-Webdiensten und zentrale Ablage der Schemas" }
  - { key: "ch6_2", title: "6.2 Namenskonventionen der API-Webdienste" }
  - { key: "ch6_3", title: "6.3 Namenskonventionen der YAML-Dateien der API-Webdienste" }
  - { key: "ch6_4", title: "6.4 Namenskonventionen der Schemas" }
  - { key: "ch6_5", title: "6.5 Namenskonventionen der YAML-Dateien der Schemas" }
  - { key: "ch6_6", title: "6.6 Kombinationen von Schemas" }
  - { key: "ch7",  title: "7 Visualisierung der API-Webdienste" }
  - { key: "ch8",  title: "8 Zeitplan zur Umsetzung im Energiemarkt" }
  - { key: "ch8_1", title: "8.1 Zeitplan für bestehende API-Webdienste" }
  - { key: "ch8_2", title: "8.2 Zeitplan für neue API-Webdienste" }
  - { key: "ch9",  title: "9 Ausgestaltung zukünftiger API-Webdienste" }
  - { key: "ch9_1", title: "9.1 Hinweise zu den API-Webdiensten zur Messwertübermittlung" }
  - { key: "ch9_1_1", title: "9.1.1 Ausprägung von Arrays …" }
  - { key: "ch9_1_2", title: "9.1.2 OBIS-Kennzahlen …" }
  - { key: "ch10", title: "10 Rückmeldung zum Konzept …" }
  - { key: "ch10_1", title: "10.1 Rückmeldung zu Kapitel 1 bis 8" }
  - { key: "ch10_2", title: "10.2 Rückmeldung zu Kapitel 9" }

Hinweis: Für die öffentliche Darstellung fassen wir Inhalte kuratiert zusammen (Executive Summary + pro Kapitel). Wir zeigen keine personenbezogenen Daten; Zitate aus der Quelle sind zulässig, da vom Nutzer bereitgestellt, werden aber sparsam verwendet.

Sicherheit & Compliance
- Kein PII in Public API (keine user_id, keine E-Mail). Nur kuratierte Inhalte.
- Whitelist: Nur explizit freigegebene Threads/Initiativen mit meta.is_public.
- Rate-Limits bestehen; Public-API zusätzlich mit Cache/ETag.

Implementierung (inkrementell)
- T0 (MVP, 0.5–1 Tag)
  - DB/Meta: Sichtbarkeitsflag pro Thread/Initiative (meta.is_public true/false) ohne Schemaänderung (JSON).
  - Public GET /api/public/community/consultations/mitteilung-53 ⇒ aus einem festgelegten Thread/Initiative lesen (per slug in meta).
  - Next.js Seite /konsultation/mitteilung-53 (getServerSideProps oder SSG + revalidate) – Render Kapitel, Summary, Download-CTA.
  - SEO/JSON-LD/OG, Deadline-Banner (15.10.2025).
  - Bootstrapping: Parser für `docs/konsultation.md` (Markdown → strukturiertes JSON) als Fallback-Provider; identischer Payload wie Public-API, damit die Next.js Seite ohne Backend-Änderung initial aus der Datei rendern kann.
- T1 (Fachartikel & Export, 1–2 Tage)
  - Fachartikel-Teaser: optional pro Kapitel Einbindung unter /wissen/artikel mit Querverweisen zur Landing.
  - Server-Export: PDF/DOCX (MVP: SSR->PDF via Puppeteer; DOCX via docx) für Stellungnahme.
  - Download-Endpunkte aus Public-API: /export.pdf /export.docx.
  - On-Demand Revalidation Hook: Wenn Thread/Initiative aktualisiert/„final“ → anstoßen.
- T2 (Revalidation & Metriken, 0.5–1 Tag)
  - On-Demand Revalidation: Trigger bei Statuswechsel „final“/„published“.
  - Simple Metriken (Views/Downloads) anonymisiert; Social Snippets.

Parsing-Pipeline (Seed)
- Ort: `lib/content/consultations.ts`
- Funktionen:
  - `parseConsultationMarkdown(filePath: string): ConsultationPayload` – liest `docs/konsultation.md`, extrahiert H1/H2/H3 und zugehörige Blöcke (inkl. 9.1.x), rendert zu HTML/Markdown und mappt auf `sections[]` gemäß Kapitel-Mapping.
  - `getConsultationBySlug(slug: string)` – liefert aus Markdown (Seed) oder aus Public-API (wenn verfügbar) die normalisierte Struktur.
- Payload-Shape (vereinheitlicht):
  ```ts
  interface ConsultationPayload {
    slug: string;
    title: string; // z. B. „Mitteilung 53 – API-Webdienste“
    status: 'draft' | 'published' | 'final';
    updated_at: string;
    tags: string[];
    executiveSummary?: string; // kuratierte Zusammenfassung
    sections: Array<{ key: string; title: string; html: string }>;
    downloads?: { pdf?: string; docx?: string };
  }
  ```

Fachartikel-Integration
- Für zentrale Kapitel (z. B. 3, 6, 9) optional automatisch Artikel-Teaser generieren:
  - Titel, Abstract, Link zur Ankerstelle der Landing.
  - Nutzung bestehender Whitepaper/Artikel-Helper (Cross-Linking, nicht duplizieren).

Rollout-Strategie
- Schritt 1: Landing mit Parser-Fallback (keine Backend-Änderungen nötig). Schnell online, indexierbar.
- Schritt 2: Public-API-Spiegel aktivieren, wenn Community-Thread final + is_public ist; Next.js wechselt transparent von File-Provider → API.
- Schritt 3: Exporte/Downloads und Revalidation-Hooks; Metriken/Social-Snippets.

Schnittstellen (Kontrakt, vereinfacht)
- GET /api/public/community/consultations/:slug
  - Input: slug (z. B. "mitteilung-53").
  - Output: { title, status, updated_at, tags[], sections: [{key, title, html}], executiveSummary, downloads: {pdf, docx} }.
- GET /api/public/community/consultations/:slug/export.pdf|docx
  - Output: Datei-Stream.

SEO/Präsentation
- JSON-LD: WebPage + DiscussionForumPosting (ohne PII), Publisher STROMDAO GmbH.
- OG-Bilder und Social-Meta; interne Verlinkung zu Whitepaper/Artikeln.

Erfolgskriterien
- Landing erreichbar ohne Login; sauber indexierbar; strukturierte Daten valide.
- Veröffentlichung spätestens T-21 Tage vor Frist; > X Aufrufe/Downloads; Referenzierbar aus Startseite.

Nächste Schritte
- MVP T0 umsetzen: Public-API + Landing + Banner + SEO.
- Konsultationsinhalte aus Community-Thread kuratieren und is_public setzen.
- Optional: sofortiger Executive Summary Teaser auf Startseite.

## GitHub-Repo-Integration (Konzept_API_Strom)

Ziel
- Die öffentlichen Issues des Repositories EDI-Energy/Konzept_API_Strom sichten, clustern (Kapitel‑Mapping), und für die inhaltliche Ausarbeitung nutzen, ohne die offiziellen Einreichungsvorgaben (E‑Mail an BNetzA) zu verletzen.

Hinweise aus der Konsultation
- Für diese Konsultation erfolgt die offizielle Rückmeldung per E‑Mail (PDF/DOCX/XLSX). Das GitHub‑Repo dient der Veranschaulichung (Schemas/Beispiele).
- Für künftige Konsultationen sind Issues als Einreichungskanal vorgesehen. Wir können dennoch Issues beobachten und für unsere fachliche Ausarbeitung referenzieren.

Vorgehen
- Fetch & Cache (read‑only):
  - Job „githubIssuesFetcher“ (stündlich/täglich) liest offene Issues aus dem Repo (ohne PII‑Erweiterung; nur: issue_number, title, labels, state, html_url, created/updated_at, author_login).
  - Speicherung: leichtgewichtig als JSON Cache (oder Tabelle github_issues) mit Repo/Slug, Fetched‑At.
- Kapitel‑Mapping:
  - Label‑ oder Titel‑Heuristik → Kapitel (1–10/9.1.x) zuordnen.
  - Manuelle Korrektur möglich (Mapping‑Overrides per JSON im Repo, z. B. content/github-mapping.json).
- Nutzung in der Ausarbeitung:
  - Interne Sicht (Community Hub): Referenzen auf Issues pro Abschnitt (z. B. meta.issue_refs: [#12, #27]).
  - Öffentliche Landing: Abschnitt „Relevante GitHub‑Issues“ je Kapitel mit Liste: „#123 – Titel (Link) – Label(s)“. Keine Volltexte.
  - Export (PDF/DOCX): Anhang „Referenzen“ mit Liste der referenzierten Issues (Nummer, Titel, URL). Keine Vollzitate.
- Datenschutz & Urheberrecht:
  - Keine Volltexte der Issues spiegeln; nur Titel, Nummer, Labels, Links und kurze eigene Zusammenfassungen.
  - GitHub‑Usernamen nur im Original‑Link anzeigen (keine zusätzliche Verarbeitung/Profilbildung).
  - Opt‑in, falls Mitwirkende namentlich im öffentlichen Auftritt genannt werden sollen (separat).
- Governance & Compliance:
  - Offizieller Einreichungskanal bleibt E‑Mail an BNetzA. Issues dienen als Informationsquelle und Verlinkung.
  - Falls wir selbst Issues erstellen: ein Team‑Account verwenden; Inhalte deckungsgleich zur E‑Mail‑Einreichung; keine personenbezogenen Daten.

Implementierung
- T1.1 (Fetcher & Cache):
  - Node‑Fetcher (GitHub REST, ohne Token oder mit PAT bei Bedarf), Rate‑Limit beachten.
  - JSON Cache unter .cache/github/consultations/mitteilung-53.json oder DB‑Tabelle github_issues.
- T1.2 (UI/SSR):
  - Public API erweitert: GET /api/public/community/consultations/:slug/issues → reduzierte Liste (nummer, title, labels, url, updated_at, chapterKey).
  - Landing rendert pro Kapitel eine kompakte Liste, inkl. Timestamp „Zuletzt aktualisiert“.
- T1.3 (Exports):
  - Export‑Service ergänzt Anhang „Referenzen“ (Issues‑Liste) mit Kapiteln.
- T1.4 (Mapping‑Overrides):
  - Datei content/github-mapping.json für manuelle Kapitelzuordnung; Build/SSR liest Overrides.

Erfolgskriterien GitHub‑Integration
- Relevante Issues werden sichtbar (öffentlich lesbar) pro Kapitel verlinkt.
- Keine PII‑Spiegelung; rechtssichere Darstellung (nur Titel/Links/Labels + eigene Summary).
- Exporte enthalten konsistente Referenzen.

---

## Implementierungsstatus (2025‑09‑13)

Erledigt (bereit zur Nutzung)
- Öffentliche API (Express):
  - GET `/api/public/community/consultations/mitteilung-53` → normalisierte Payload aus `docs/konsultation.md` (Fallback‑Quelle).
  - GET `/api/public/community/consultations/mitteilung-53/issues` → reduzierte Issues‑Liste (Nummer, Titel, Labels, URL, State, updated_at, chapterKey) mit optionalem Filter `?chapterKey=…`.
  - GET `/api/public/community/consultations/mitteilung-53/export.pdf` → PDF mit Anhang „Referenzen (GitHub Issues)“.
  - GET `/api/public/community/consultations/mitteilung-53/export.docx` → DOCX mit Anhang „Referenzen (GitHub Issues)“.
- Parser/Content:
  - `src/lib/content/consultations.ts` parst `docs/konsultation.md` in `sections[]` (Kapitel‑Keys wie `ch6`, `ch9_1_2`, …) und liefert HTML.
- GitHub‑Integration:
  - `src/services/GithubIssuesService.ts` lädt Issues aus `EDI-Energy/Konzept_API_Strom`, cached 1h in `.cache/github/consultations/mitteilung-53.json` und mapped per Heuristik + Overrides.
  - Manuelle Overrides: `content/github-mapping.json` (z. B. `{ "overrides": { "123": "ch9_1_1" } }`).
- Next.js Landing (SSR):
  - Seite `/konsultation/mitteilung-53` mit Inhaltsverzeichnis, Kapiteln, Sidebar „Referenzen (GitHub)“ pro Abschnitt, Export‑Links, SEO/OG + JSON‑LD und Frist‑Banner.
  - EVU‑Zielgruppenblöcke: „Warum wichtig für EVU“ und „Konkrete Handlungsempfehlungen“ + „Was sollten EVU jetzt tun?“ Kurzbox.
- Homepage‑Teaser:
  - Startseite verlinkt prominent auf die Landing inkl. Deep‑Links zu EVU‑Abschnitten und Rückmeldungsankern.

Offen (optional / Folgetasks)
- Feature‑Flag/Toggle für öffentliche Routen (derzeit immer aktiv; Absicherung via Reverse‑Proxy möglich).
- On‑Demand Revalidation für SSG‑Variante (aktuell SSR mit Cache‑Headern, `s-maxage=300`).
- OG‑Bild für bessere Social‑Previews; anonyme Metriken (Views/Downloads).
- Optionaler Wechsel auf SSG mit `revalidate(300)`.

## Admin‑Handbuch (Betrieb & Pflege)

Schnellstart
1) Inhalte pflegen: `docs/konsultation.md` bearbeiten (Kapitel als `##`, `###`, `####`). Speichern genügt – die Landing rendert serverseitig (SSR) bei Aufruf neu.
2) GitHub‑Kapitelmapping korrigieren (optional): In `content/github-mapping.json` unter `overrides` Issue‑Nummern auf Kapitel‑Keys mappen, z. B.:
   ```json
   {
     "overrides": {
       "123": "ch9_1_1",
       "145": "ch6_3"
     }
   }
   ```
3) Seite prüfen: `/konsultation/mitteilung-53` im Browser aufrufen. Referenzen pro Kapitel und Exporte (PDF/DOCX) sollten verfügbar sein.

Wichtige Pfade & Endpunkte
- Öffentliche Seite: `/konsultation/mitteilung-53` (SSR; Cache‑Header: `s-maxage=300`).
- Public API:
  - Payload: `/api/public/community/consultations/mitteilung-53`
  - Issues: `/api/public/community/consultations/mitteilung-53/issues[?chapterKey=ch9_1_1]`
  - Exporte: `/api/public/community/consultations/mitteilung-53/export.pdf` und `/export.docx`
- Caches/Mapping:
  - GitHub‑Cache: `.cache/github/consultations/mitteilung-53.json`
  - Mapping‑Overrides: `content/github-mapping.json`

Konfiguration & Umgebungsvariablen
- GitHub‑API (optional, empfohlen): Setzen Sie `GITHUB_TOKEN`, um höhere Rate‑Limits zu erhalten und 403/Rate‑Limit‑Fehler zu vermeiden.
- PDF‑Rendering (Puppeteer/Chromium): Falls die Laufzeit kein eingebettetes Chromium starten kann, konfigurieren Sie `PUPPETEER_EXECUTABLE_PATH` auf ein vorhandenes Chrome/Chromium‑Binary.

Caching & Aktualisierung
- SSR‑Seitencache: 5 Minuten (`s-maxage=300`, `stale-while-revalidate=600`). Änderungen an `docs/konsultation.md` sind nach kurzer Zeit sichtbar.
- GitHub‑Issues‑Cache: 1 Stunde TTL. Sofortige Aktualisierung erzwingen: Cache‑Datei löschen (`.cache/github/consultations/mitteilung-53.json`).

Deaktivieren/Schützen (falls erforderlich)
- Öffentliche Routen sind aktuell aktiv. Zum temporären Abschalten: per Reverse‑Proxy/WAF die Pfade `/api/public/community/*` sperren oder den Route‑Mount in `src/server.ts` deaktivieren und neu deployen.

Troubleshooting
- PDF/DOCX‑Export schlägt fehl:
  - Prüfen Sie Puppeteer/Chromium (ggf. `PUPPETEER_EXECUTABLE_PATH` setzen), ausreichende Ressourcen, keine Sandbox‑Restriktionen.
- GitHub‑Issues fehlen/403:
  - `GITHUB_TOKEN` setzen; alternativ kurz warten (Rate‑Limit) oder Cache löschen, dann erneut aufrufen.
- Kapitel nicht richtig zugeordnet:
  - `content/github-mapping.json` Overrides ergänzen oder Überschriften in `docs/konsultation.md` an vorgegebene Struktur anpassen. Notfalls Titel‑→Key‑Mapping in `src/lib/content/consultations.ts` erweitern.
  - Werden auf der Landing `[cite_start]`/`[cite:]` angezeigt, prüfen Sie, ob die Parser‑Normalisierung aktiv ist (Funktion `renderMarkdownToHtml` in `src/lib/content/consultations.ts`). Diese entfernt die Tokens und rendert Zitat‑Marken als kleine Hochzahlen.

Hinweise zur Nutzung im Marketing
- Die Startseite enthält bereits einen Teaser mit Deep‑Links zu den EVU‑Abschnitten und Rückmeldungsankern.
- Verlinken Sie die Landing in News/Blog/Newsletter; Social Preview wird über OG/JSON‑LD unterstützt (OG‑Bild optional ergänzbar).

Anforderungen & Status (Kurzüberblick)
- Öffentliche Landing (Next.js, Read‑Only): Erledigt
- Parser aus Markdown‑Seed: Erledigt
- Öffentliche API (Payload, Issues, Exporte): Erledigt
- GitHub‑Integration mit Mapping & Cache: Erledigt
- EVU‑Zielgruppenmodule (Wichtigkeit/Empfehlungen): Erledigt
- Exporte (PDF/DOCX) inkl. Referenzen‑Anhang: Erledigt
- Revalidation/Metriken/OG‑Bild: Offen (optional)

## Öffentlichkeitsarbeit (PR) & Moderation

Zielsetzung
- Sichtbarkeit und Reichweite für die Konsultation erhöhen, Mehrwert für EVU klar kommunizieren, Beiträge kuratieren und rechtssicher publizieren.

Kernbotschaften (was wir kommunizieren)
- Öffentliche Lesefassung der „Mitteilung Nr. 53“ inkl. Kapitel‑Navigation und GitHub‑Referenzen (ohne PII, keine Volltexte der Issues).
- Nutzen für EVU: Vorbereitung auf API‑Webdienste im MaBiS‑Hub, Kosteneffizienz durch Standardisierung, konkrete Handlungsschritte.
- Frist 15.10.2025, Exportfunktionen (PDF/DOCX) für die eigene Einreichungsvorbereitung.
- Rolle von Willi‑Mako: kuratiert, strukturiert und vernetzt Wissen – offizieller Einreichungskanal bleibt E‑Mail an die BNetzA.

Was wir nicht kommunizieren
- Keine personenbezogenen Daten, keine vertraulichen Firmeninterna, keine verbindliche Rechtsberatung/‑auslegung.
- Keine Spiegelung kompletter Issue‑Inhalte; nur Titel/Labels/Link + eigene kurze Zusammenfassungen.

Kanäle & Formate
- Website: Startseiten‑Teaser (bereits integriert) und Landing `/konsultation/mitteilung-53`.
- News/Blog/„Fachartikel“: Kurzbeitrag mit Deep‑Links zu „Warum wichtig für EVU“ und „Handlungsempfehlungen“.
- Newsletter: 1 Teaser‑Abschnitt mit Frist‑Hinweis und CTA.
- LinkedIn/X: Kurzpost (3–5 Sätze) mit Nutzen, Frist und Link; optional Thread mit Kapitel‑Highlights.
- Fachforen/Verbände: Hinweis mit Link auf die öffentliche Lesefassung (kein Cross‑Posting von Inhalten).

Moderation & Governance
- Eingangskanäle: 
  - E‑Mail (Kontakt): dev@stromdao.com für „Beitragsvorschläge“ (Anmerkungen/Verbesserungen/Quellenhinweise).
  - Community Hub (intern, Login): Redaktionssammlung und Bewertung; nur kuratierte Inhalte gehen öffentlich.
- Prüfprozess (48h Ziel‑SLA): fachliche Relevanz, Quellenlage, PII‑Check, Konsistenz der Argumentation.
- Kennzeichnung: „Entwurf“, „Veröffentlicht“, „Aktualisiert am …“; keine Autorennennung ohne Opt‑in.
- Compliance: Verweis auf offiziellen Einreichungskanal; Hinweise zu GitHub‑Nutzung (Issues sind öffentlich, ToS beachten).

Einreichungen annehmen (operator workflow)
- Falls Beiträge per E‑Mail eingehen: 
  1) Sichtung und Antwort mit Dank + Hinweis auf öffentliche Lesefassung.
  2) Aufnahme in internen Community‑Thread (privat) mit Tagging pro Kapitel.
  3) Kuratierte Übernahme in `docs/konsultation.md` (oder separaten Abschnitt „Community‑Hinweise“), danach Veröffentlichung (SSR, Cache ≤5 min).
- GitHub‑Issue‑Referenzen: Kapitelzuordnung prüfen; ggf. `content/github-mapping.json` per Override fixieren.
- Export für Versand: PDF/DOCX aus Landing generieren, intern reviewen, dann für BNetzA‑E‑Mail nutzen.

Verbreitung (Playbook)
- Bei größeren Aktualisierungen:
  - Startseiten‑Teaser kurz anheben (Reihenfolge), Landing aktualisieren.
  - LinkedIn‑Post mit Nutzen + Frist + Link; Kommentar mit Kapitel‑Deep‑Links.
  - Newsletter‑Hinweis (kurz), optional Blog‑Eintrag mit 2–3 Highlights.
  - UTM‑Parameter nutzen (z. B. `?utm_source=linkedin&utm_medium=social&utm_campaign=mitteilung53`).

Messung & KPIs
- Seitenaufrufe Landing, Export‑Downloads (PDF/DOCX), Verweildauer.
- Newsletter‑CTR, Social‑Engagement (Likes/Kommentare/Reshares).
- Anzahl qualifizierter Beitragsvorschläge (E‑Mail), Zeit bis Veröffentlichung (SLA‑Trefferquote).

Krisenkommunikation (Kurzleitfaden)
- Bei Fehlern/Unschärfen: Korrektur an Landing, Änderungsnotiz am Seitenfuß, kurzer Social‑Follow‑Up.
- Bei rechtlichen Hinweisen/PII‑Verstößen: Sofortige Depublikation betroffener Passage, Prüfung, anschließend bereinigte Wiederveröffentlichung.

## Weitere Konsultationen unterstützen (kleine Anleitung)

Ziel
- Neue Konsultationen (weitere „Mitteilung …“, Leitfäden, Konsultationspapiere) mit minimalem Aufwand in die öffentliche Read‑Only‑Strecke aufnehmen: Landing, Issues‑Referenzen, Exporte, Schnell‑Rückmeldung, KI‑Hilfen.

Es gibt zwei Wege: ein schneller „Heute“-Weg (kleine Änderungen) und ein empfohlener „Sauber“-Weg (einmalige Refaktorierung, danach Content‑only).

Variante A – Schnellweg (heute, 30–60 Min.)
1) Slug festlegen (z. B. `leitfaden-2026`).
2) Quelle anlegen: `docs/consultations/<slug>.md` (Struktur wie `docs/konsultation.md`, Überschriften mit `##/###/####`, gleiche Kapitel‑Keys).
3) Parser erweitern: `src/lib/content/consultations.ts`
  - In `getConsultationBySlug(slug)` ein Mapping hinzufügen:
    - `mitteilung-53` → bisher: `docs/konsultation.md` (bestehen lassen)
    - `<slug>` → `docs/consultations/<slug>.md`
  - Optional: `title` und `tags` pro Slug setzen.
4) GitHub‑Mapping (optional): `content/github-mapping-<slug>.json` erzeugen (kann leer sein, später ergänzen).
5) Issues‑Service minimal nutzen:
  - Wenn dasselbe Repo gilt (`EDI‑Energy/Konzept_API_Strom`), keine Änderung nötig.
  - Falls anderes Repo: im Code vorübergehend eine zweite Methode/Branch ergänzen (z. B. in `GithubIssuesService`) und Cache/Pfad unterscheiden (`.cache/github/consultations/<slug>.json`).
6) Next.js Seite anlegen: `src/pages/konsultation/<slug>.tsx`
  - Datei aus `src/pages/konsultation/mitteilung-53.tsx` kopieren und alle Slug‑Vorkommen ersetzen.
  - SEO‑Title/Text anpassen.
7) Smoke‑Test:
  - `GET /api/public/community/consultations/<slug>` → JSON Payload sichtbar
  - `GET /api/public/community/consultations/<slug>/issues` → Issues vorhanden/leer
  - Exporte: `/export.pdf` und `/export.docx`
  - Schnell‑Rückmeldung: `POST /response.docx`

Variante B – Sauber (einmalig, 0.5–1 Tag; danach Content‑only)
1) Zentrales Mapping einführen: `content/consultations.config.json`
  ```json
  {
    "mitteilung-53": { "md": "docs/konsultation.md", "repo": "EDI-Energy/Konzept_API_Strom", "title": "Mitteilung Nr. 53 – Konsultation API‑Webdienste" },
    "<slug>": { "md": "docs/consultations/<slug>.md", "repo": "<owner>/<repo>", "title": "<Seitentitel>" }
  }
  ```
2) Parser generalisieren (`src/lib/content/consultations.ts`):
  - `getConsultationBySlug(slug)` liest Pfad/Meta aus `consultations.config.json` und ruft `parseConsultationMarkdown(mdPath)` auf.
3) Issues‑Service generalisieren (`src/services/GithubIssuesService.ts`):
  - Signatur z. B. `getIssues(slug: string, forceRefresh=false)`; Repo und Cache‑Datei aus Config (`.cache/github/consultations/<slug>.json`).
  - Overrides pro Slug aus `content/github-mapping-<slug>.json` (Fallback: gemeinsame `content/github-mapping.json`).
4) Public‑Routes sind bereits slug‑basiert; Aufrufe der Services auf slug‑Variante umstellen.
5) Next.js dynamisch machen: `src/pages/konsultation/[slug].tsx`
  - Die bestehende Seite verallgemeinern (Slug aus Router/`getServerSideProps`) – dann ist keine Kopie pro Konsultation nötig.
6) Optional: Startseiten‑Teaser automatisieren (kleine Liste aus Config generieren).

Best‑Practices (für beide Wege)
- Slug‑Konvention: Kleinbuchstaben, Bindestriche (`mitteilung-53`, `leitfaden-2026`).
- Markdown‑Struktur beibehalten (Kapitel‑Überschriften), damit Mapping/Exports robust funktionieren.
- Pro Konsultation eine eigene Overrides‑Datei beginnen, auch wenn sie anfangs leer ist.
- Bei anderem GitHub‑Repo rechtzeitig `GITHUB_TOKEN` setzen (Rate‑Limit) und Caches trennen.

5‑Minuten‑Checkliste bei neuer Konsultation
- [ ] Datei `docs/consultations/<slug>.md` erstellt und mit Grundstruktur gefüllt
- [ ] Parser kennt den Slug (Schnellweg) oder Config‑Eintrag vorhanden (Sauber)
- [ ] (Optional) `content/github-mapping-<slug>.json` angelegt
- [ ] Seite `/konsultation/<slug>` rendert, Issues‑Liste reagiert, Exporte funktionieren
- [ ] Homepage‑Teaser ergänzt (optional)

## Qdrant Wissensbasis: Inhalte hinzufügen (Ingestion‑Script)

Ziel
- Vorherige Einreichungen (PDF) und öffentliche Quellen (Webseiten) als Kontext in eine Qdrant‑Collection einspielen. Diese Sammlung kann für KI‑gestützte Zusammenfassungen/Antwortvorschläge genutzt werden.

Voraussetzungen
- Laufende Qdrant‑Instanz (URL/API‑Key) – lokal oder verwaltet.
- Ein API‑Schlüssel für Embeddings:
  - Standard: `EMBEDDING_PROVIDER=gemini` und `GEMINI_API_KEY`
  - Alternativ: `EMBEDDING_PROVIDER=mistral` und `MISTRAL_API_KEY` (optional `MISTRAL_EMBED_MODEL`)
- Optional: Ablageordner `data/` für PDFs (im Repo angelegt).

Wichtige Umgebungsvariablen
- `QDRANT_URL` (z. B. http://localhost:6333)
- `QDRANT_API_KEY` (falls Qdrant Auth nutzt)
- `EMBEDDING_PROVIDER` (`gemini` | `mistral`, Standard: `gemini`)
- `GEMINI_API_KEY` bzw. `MISTRAL_API_KEY`
- Optional: `GEMINI_EMBED_DIM` (Standard 768), `MISTRAL_EMBED_DIM` (Standard 1024)

Hinweis zu Collections & Provider
- Der Ingest‑Service hängt den Providernamen automatisch an (bei Mistral): `getCollectionName('consultations-m53')` ⇒ `consultations-m53_mistral`.
- Wechsel des Providers erstellt daher eine eigene Collection; mischen vermeiden.

Kommando (NPM‑Script)
- Generisch: `npm run ingest:consultation -- [--collection <name>] [--pdf <file.pdf>] [--url <https://...>]...`
- Beispiel (Mitteilung 53):
  - PDF plus zwei Webseiten ingestieren:
    ```bash
    QDRANT_URL=http://localhost:6333 \
    QDRANT_API_KEY=local-dev \
    GEMINI_API_KEY=… \
    npm run ingest:consultation -- \
      --collection consultations-m53 \
      --pdf ./data/submissions_230pages.pdf \
      --url "https://www.bundesnetzagentur.de/DE/Beschlusskammern/1_GZ/BK6-GZ/2024/BK6-24-210/InfoVorgehen/BK6-24-210_Verfahrensstand.html?nn=1029832" \
      --url "https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_83_Zug_Mess/845_MaBiS_Hub/BK6_MaBiS_Hub_node.html"
    ```

Ablauf im Script
- Erstellt die Collection falls sie fehlt (Dimension = Embedding‑Dimension des Providers).
- PDF wird zu Text geparst und in Abschnitte (≈1200 Zeichen) geschnitten, jeweils mit Embedding upserted.
- Webseiten werden schlicht von HTML befreit (minimaler Filter) und ebenfalls in Chunks ingestiert.

Validierung / Troubleshooting
- Erfolgs‑Log „Done.“ am Ende. Bei Fehlern zu API‑Keys/HTTP werden Exceptions geloggt.
- Qdrant‑Check (optional, direkt gegen Qdrant REST): Anzahl Punkte in der Collection prüfen.
- Häufige Ursachen:
  - Falsche API‑Keys oder fehlende Provider‑Variablen.
  - Qdrant nicht erreichbar (URL/Firewall).
  - PDF‑Pfad falsch (Datei existiert nicht).

Nächste Schritte (optional, low‑risk)
- Read‑Only Endpoint ergänzen, der Top‑3 Kontext‑Snippets je Anfrage liefert (Query → Vektorsuche in Qdrant) und diese auf der Landing als „Weitere Quellen“ anzeigt.
- Für weitere Konsultationen eigene Collections verwenden (Namensschema `consultations-<slug>`).
