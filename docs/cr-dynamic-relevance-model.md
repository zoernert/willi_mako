# CR: Dynamisches Relevanz-Modell & Automatisierte Content-Erstellung

**Status:** Entwurf  
**Antragsteller:** Strategische Weiterentwicklung  
**Datum:** 2025-08-03  
**Priorität:** Sehr Hoch  
**Geschätzter Aufwand:** 8-10 Tage  

## 1. Zusammenfassung

Dieser Change Request beschreibt die Weiterentwicklung der Willi-Mako Anwendung von einem System mit statischer SEO-Optimierung zu einem **dynamischen, selbstverstärkenden Content-Ökosystem**. Das Kernprinzip ist die Messung von "Content-Resonanz" – also der tatsächlichen Nützlichkeit von Inhalten basierend auf Nutzerinteraktionen.

Diese Resonanz wird als datengestützte Feedback-Schleife genutzt, um die wertvollsten Inhalte automatisch zu identifizieren und deren Sichtbarkeit zu erhöhen. Zusätzlich wird ein Mechanismus zur **automatisierten Erstellung von täglichen Inhalten ("Daily Digest")** implementiert, um kontinuierlich frischen, relevanten Content zu generieren und die Aktivität für Suchmaschinen-Crawler zu signalisieren.

Dieses System transformiert die Anwendung von einer reaktiven Wissensdatenbank in ein proaktives, lernendes System, das sich kontinuierlich auf den Nutzerbedarf ausrichtet.

## 2. Motivation & Business Impact

Während klassisches SEO die Grundlage für Sichtbarkeit schafft, ermöglicht dieses Konzept den entscheidenden nächsten Schritt: die Etablierung als **autoritative Wissensquelle** in der Energiewirtschaft. Indem wir uns auf die Inhalte konzentrieren, die nachweislich den größten Nutzen stiften, erreichen wir:

- **Maximale Nutzerbindung:** Nutzer finden schneller und zuverlässiger die relevantesten Informationen, was die Verweildauer und Wiederkehrrate erhöht.
- **Exponentielles Wachstum:** Inhalte, die bei Nutzern gut ankommen, werden sichtbarer, ziehen mehr Traffic an und verstärken so ihre eigene Relevanz.
- **Nachhaltiger Wettbewerbsvorteil:** Statt auf generische SEO-Metriken optimieren wir auf echten, messbaren Nutzerwert, was von Konkurrenten nur schwer zu kopieren ist.
- **Automatisierte Content-Pipeline:** Der "Daily Digest" sorgt für stetigen Zuwachs an relevanten Inhalten, ohne den manuellen Redaktionsaufwand linear zu erhöhen.
- **Verbesserte Autorität:** Kontinuierlich neue, relevante Inhalte signalisieren Suchmaschinen wie Google eine hohe Aktualität und thematische Tiefe.

## 3. Technische Konzeption

Die Architektur ruht auf vier Säulen: Datenerfassung, Relevanz-Analyse, automatisierte Optimierung und automatisierte Content-Erstellung.

### Säule 1: Datenerfassung (Signal Collection)

Wir führen ein umfassendes Tracking von Nutzerinteraktionen ein. Alle Daten werden in der PostgreSQL-Datenbank gespeichert.

**Neue Datenbanktabellen:**

1.  `content_interactions`:
    -   `id`: Primary Key
    -   `faq_id`: UUID (Referenz zur FAQ)
    -   `interaction_type`: ENUM ('view', 'rag_usage', 'external_referral', 'internal_link_click', 'positive_feedback', 'negative_feedback')
    -   `source_identifier`: VARCHAR(255) (z.B. 'google.com', 'perplexity.ai', Quell-FAQ-ID)
    -   `session_id`: VARCHAR(255)
    -   `created_at`: TIMESTAMP

**Technische Umsetzung:**

-   **Next.js Middleware (`middleware.ts`):** Analysiert den `Referer`-Header und `utm_source`-Parameter für `external_referral`.
-   **Express.js Backend (RAG-Service):** Protokolliert jede Verwendung einer FAQ als Quelle im Chat als `rag_usage`.
-   **Next.js Frontend:**
    -   Ein "Beacon"-API-Aufruf trackt Klicks auf interne Links (`internal_link_click`).
    -   Eine Feedback-Komponente (Daumen hoch/runter) sendet `positive_feedback` / `negative_feedback`.

### Säule 2: Analyse & Priorisierung (Relevance Scoring)

Ein dynamischer `relevance_score` wird zum zentralen KPI für jeden Inhalt.

**Schema-Anpassung:**

-   **Tabelle `faqs`:** Neue Spalte `relevance_score` (FLOAT, default: 0).

**Berechnungs-Workflow:**

-   **Neues Script (`scripts/calculate-relevance-scores.ts`):** Läuft als stündlicher CRON-Job.
-   **Logik:** Das Script aggregiert die Daten aus `content_interactions` für jede FAQ.
    -   **Gewichtungsformel (anpassbar):**
        ```
        score = (count(rag_usage) * 10)
              + (count(external_referral) * 5)
              + (count(internal_link_click) * 3)
              + (count(positive_feedback) * 2)
              - (count(negative_feedback) * 4)
              + (count(view) * 0.5)
        ```
    -   **Zeitliche Abwertung (Decay):** Interaktionen der letzten 24h werden 100% gewichtet, Interaktionen der letzten 7 Tage 50%, ältere 10%.
-   **Qdrant Synchronisation:** Der berechnete `relevance_score` wird als Payload-Feld für jeden Vektor in Qdrant aktualisiert. Dies ist entscheidend für die hybride Suche.

### Säule 3: Automatisierte Optimierung (Reinforcement Loop)

Der `relevance_score` wird aktiv zur Steuerung der User Experience genutzt.

1.  **Hybride Suche für "Siehe auch":**
    -   Die Qdrant-Suche für verwandte FAQs (`getRelatedContent`) wird erweitert. Sie kombiniert semantische Vektor-Ähnlichkeit mit dem `relevance_score`, um Inhalte zu bevorzugen, die sowohl thematisch passen als auch nachweislich nützlich sind.

2.  **Dynamische Content-Hubs:**
    -   Die Übersichtsseite `/wissen` wird dynamisch und zeigt Sektionen wie "Aktuell im Trend" oder "Meistgenutzte Lösungen", sortiert nach `relevance_score`.

3.  **Intelligente Sitemap:**
    -   Die Priorität (`<priority>`) in `sitemap.xml` wird dynamisch auf Basis des `relevance_score` gesetzt. Hochrelevante Seiten erhalten eine Priorität von `1.0`.

### Säule 4: Automatisierte Content-Erstellung ("Daily Digest")

Ein täglicher CRON-Job generiert automatisch neue, relevante Inhalte.

**Workflow:**

1.  **Content-Gap-Analyse (CRON-Job `scripts/generate-daily-digest.ts`):**
    -   **Input 1 (Suchanfragen):** Analysiert interne Suchanfragen, die keine oder irrelevante Ergebnisse lieferten.
    -   **Input 2 (Semantische Cluster):** Nutzt Qdrant, um "Löcher" in der Vektor-Map zu finden – also Themenbereiche, die unterrepräsentiert sind.
    -   **Input 3 (Externe Trends):** (Optional) Anbindung an Google Trends API für aufkommende Themen in der Branche.

2.  **Themen-Selektion & Deduplizierung:**
    -   Der Job wählt das vielversprechendste Thema aus den Gaps.
    -   **Neue DB-Tabelle `daily_digest_history`:** (`topic`, `generated_faq_id`, `created_at`).
    -   Der Algorithmus prüft gegen diese Tabelle und die semantische Ähnlichkeit in Qdrant, um sicherzustellen, dass das Thema in den letzten 14 Tagen nicht behandelt wurde.

3.  **Dediziertes LLM-Prompting:**
    -   Ein sorgfältig aufgebauter Prompt wird an ein LLM (z.B. über die OpenAI API) gesendet.
    -   **Prompt-Struktur:**
        -   **Rolle:** "Du bist ein Experte für Marktkommunikation in der deutschen Energiewirtschaft..."
        -   **Aufgabe:** "Erstelle einen prägnanten und verständlichen FAQ-Beitrag zum folgenden Thema: `[ausgewähltes Thema]`."
        -   **Kontext:** "Hier sind 3 verwandte, bereits existierende FAQs, um den Stil und das Detaillevel zu treffen: `[Beispiel-FAQs]`."
        -   **Negative Constraints:** "Vermeide die direkte Wiederholung von Inhalten aus den Beispielen. Behandle nicht das Thema `[Thema von gestern]`, da dieses kürzlich abgedeckt wurde."
        -   **Format-Vorgabe:** "Strukturiere die Antwort in 'Frage:', 'Antwort:' und 'Tags:' (3-5 relevante Tags)."

4.  **Qualitätssicherung & Veröffentlichung:**
    -   Die generierte FAQ wird in der `faqs`-Tabelle mit dem Status `draft` und einem Flag `is_autogenerated: true` gespeichert.
    -   **Admin-Workflow:** Im Admin-Interface erscheint eine neue Sektion "Zur Freigabe", wo ein menschlicher Experte den Entwurf prüfen, bearbeiten und mit einem Klick veröffentlichen kann. **Es erfolgt keine vollautomatische Veröffentlichung.**

5.  **Frontend-Integration:**
    -   Eine neue Komponente auf der Startseite (`/`) und der Wissens-Übersichtsseite (`/wissen`) zeigt den "Tagesimpuls" oder die "Neueste Frage" an, sobald diese freigegeben ist.

## 4. Implementierungsplan

**Phase 1: Backend & Datenbank-Setup (2 Tage)**
- [ ] DB-Schema erweitern: `faqs.relevance_score`, neue Tabellen `content_interactions` und `daily_digest_history`.
- [ ] Migrationsskripte erstellen und ausführen.
- [ ] API-Endpunkte für Tracking (`/api/track/interaction`) und Feedback (`/api/feedback`) im Express-Backend erstellen.

**Phase 2: Datenerfassung (2 Tage)**
- [ ] Tracking-Logik im RAG-Service implementieren.
- [ ] Next.js Middleware für Referrer-Analyse entwickeln.
- [ ] Frontend-Komponenten für Feedback und internes Link-Tracking erstellen.

**Phase 3: Relevanz-Scoring & Qdrant-Sync (1.5 Tage)**
- [ ] Script `scripts/calculate-relevance-scores.ts` entwickeln.
- [ ] CRON-Job für das Script einrichten.
- [ ] Logik zur Aktualisierung der Qdrant-Payloads implementieren.

**Phase 4: Reinforcement Loop (1.5 Tage)**
- [ ] Qdrant-Suche auf hybride Suche (Vektor + Score) umstellen.
- [ ] `/wissen`-Seite mit dynamischen "Trending"-Komponenten ausstatten.
- [ ] `sitemap.xml.tsx` zur Nutzung des `relevance_score` anpassen.

**Phase 5: Automatisierte Content-Erstellung (3 Tage)**
- [ ] Script `scripts/generate-daily-digest.ts` für Gap-Analyse und Themenwahl entwickeln.
- [ ] LLM-Anbindung und Prompt-Engineering implementieren.
- [ ] Admin-Interface für die Freigabe der Entwürfe erstellen.
- [ ] "Daily Digest"-Komponente für das Frontend entwickeln.

## 5. Erfolgskriterien (Messbar)

- **Engagement:** Steigerung der Klickrate auf "Siehe auch"-Links um 40%.
- **Relevanz:** Durchschnittlicher `relevance_score` der Top-10-FAQs steigt um 50%.
- **Content-Velocity:** Mindestens 5 neue, qualitativ hochwertige FAQs pro Woche werden durch den "Daily Digest"-Workflow generiert und freigegeben.
- **SEO:** Organischer Traffic auf FAQ-Seiten mit hohem `relevance_score` (> Median) steigt um 30% stärker als auf Seiten mit niedrigem Score.
- **Nutzer-Feedback:** Verhältnis von positivem zu negativem Feedback verbessert sich um 25%.

## 6. Risikomanagement

- **Risiko:** Schlechte Qualität der auto-generierten Inhalte schadet der Markenwahrnehmung.
  - **Mitigation:** Obligatorischer menschlicher Review-Prozess. Es gibt keine vollautomatische Veröffentlichung.
- **Risiko:** "Rich-get-richer"-Effekt: Populäre Artikel werden immer populärer, neue haben keine Chance.
  - **Mitigation:** Die Scoring-Formel kann einen "Entdecker-Bonus" für neue Artikel oder Artikel mit hoher Interaktionsrate (aber noch wenig Gesamt-Views) enthalten.
- **Risiko:** Performance-Einbußen durch intensives Tracking.
  - **Mitigation:** Tracking-API-Calls werden asynchron und nicht-blockierend gestaltet. Die aufwändige Score-Berechnung erfolgt offline im CRON-Job.
- **Risiko:** Hohe Kosten durch LLM-API-Aufrufe.
  - **Mitigation:** Der CRON-Job läuft nur einmal täglich. Strikte Kontrollen und Budgets für die API-Nutzung werden implementiert.
