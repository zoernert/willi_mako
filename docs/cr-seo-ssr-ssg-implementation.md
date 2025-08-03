```markdown
# CR: SEO-Optimierung durch serverseitiges Rendering (SSR/SSG)

**Status:** Entwurf
**Antragsteller:** Gemini AI
**Datum:** 2025-08-03

## 1. Zusammenfassung

Dieser Change Request beschreibt die Planung und Implementierung einer grundlegenden SEO-Optimierung für die Anwendung. Das Kernproblem ist die aktuelle Architektur als reine Single-Page-Application (SPA), bei der Inhalte clientseitig via JavaScript gerendert werden. Dies verhindert eine effektive Indexierung durch Suchmaschinen, insbesondere für die wertvollen FAQ-Inhalte.

Die vorgeschlagene Lösung ist die Einführung eines Next.js-Frameworks für alle öffentlich zugänglichen Seiten (Startseite, FAQs/Wissensdatenbank). Die bestehende, passwortgeschützte Hauptanwendung wird dabei nahtlos in die Next.js-Anwendung integriert, sodass die gesamte Plattform als ein einziger, monolithischer Service betrieben werden kann. Dies vermeidet die Komplexität von Reverse-Proxies und getrennten Deployments.

## 2. Motivation

Das strategische Ziel ist es, die Anwendung als führendes Tool für Wissen im Bereich "Marktkommunikation in der Energiewirtschaft" zu etablieren. Um zahlende Kunden zu gewinnen, müssen wir eine kritische Masse an organischem Traffic von potenziellen Nutzern generieren.

- **Sichtbarkeit erhöhen:** Durch SEO-optimierte, statisch generierte Wissens-Seiten (bisher FAQs) wird die Anwendung für relevante Suchanfragen bei Google sichtbar.
- **Nutzer-Funnel aufbauen:** Potenzielle Nutzer finden über spezifische Fachfragen auf unsere Seite, erkennen die Expertise und werden schrittweise an die Premium-Funktionen der Hauptanwendung herangeführt.
- **Wettbewerbsvorteil gegenüber generischen KIs:** Wir bieten verifizierte, aktuelle und tiefgehende Fachinformationen, die generische Modelle wie ChatGPT nicht in dieser Qualität liefern können. Die Verlinkung zu den Quellen und die thematische Tiefe schaffen Vertrauen.

## 3. Problembeschreibung

Die aktuelle `client`-Anwendung ist eine reine React-SPA.

1.  **Schlechte Indexierbarkeit:** Suchmaschinen-Crawler erhalten eine nahezu leere HTML-Seite. Der eigentliche Inhalt wird erst nach der Ausführung von JavaScript geladen, was die Indexierung unzuverlässig und ineffizient macht.
2.  **Keine individuellen Metadaten:** Es ist unmöglich, für jede FAQ-Seite einzigartige, SEO-optimierte `<title>`- und `<meta name="description">`-Tags zu setzen.
3.  **Performance:** Client-seitiges Rendering führt zu einem langsameren First Contentful Paint (FCP), was ein negativer Ranking-Faktor sein kann.

## 4. Vorgeschlagene Lösung: Einheitliche Next.js-Anwendung

Wir ersetzen die Reverse-Proxy-Architektur durch ein integriertes Modell.

- **Ein Service:** Die gesamte Anwendung wird als eine einzige Next.js-Applikation gebaut und betrieben.
- **Struktur:**
    - **Next.js (Root):** Verantwortlich für alle öffentlichen Seiten (`/`, `/wissen`, `/wissen/[slug]`). Diese Seiten werden mittels Static Site Generation (SSG) zur Build-Zeit als reines HTML erzeugt.
    - **Legacy App (`/app`):** Die bestehende React-Anwendung wird als statischer Export gebaut und in das `public/app`-Verzeichnis der Next.js-Anwendung gelegt.
- **Routing:** Next.js' interner Server routet Anfragen:
    - Anfragen an `/` oder `/wissen/...` werden von Next.js direkt mit den statisch generierten Seiten beantwortet.
    - Anfragen an `/app/...` liefern die `index.html` der Legacy-App aus, die dann das clientseitige Routing übernimmt.

Dieses Modell kombiniert die SEO-Vorteile von SSG mit der Stabilität der bestehenden Anwendung bei minimaler betrieblicher Komplexität.

## 5. Implementierungsplan

### Phase 0: Projekt-Setup & Integration (Dauer: ca. 0.5 Tage)

**Ziel:** Die Codebasis für die neue, einheitliche Struktur vorbereiten.

1.  **Verzeichnis umbenennen:** Das `client`-Verzeichnis wird zu `app-legacy` umbenannt, um die Rolle klar zu definieren.
    - `mv ./client ./app-legacy`
2.  **Next.js initialisieren:** Im Projekt-Root wird eine neue Next.js-Anwendung aufgesetzt.
    - `npx create-next-app@latest . --typescript --eslint --app-router false --src-dir`
3.  **Build-Skripte anpassen:** Die `package.json` im Root-Verzeichnis wird die Build-Prozesse orchestrieren.

    ```json
    "scripts": {
      "dev": "next dev",
      "build:legacy": "cd app-legacy && npm run build",
      "build:next": "next build",
      "build": "npm run build:legacy && rm -rf public/app && mv app-legacy/build public/app && npm run build:next",
      "start": "next start"
    }
    ```
    *Der `build`-Befehl baut zuerst die Legacy-App, verschiebt deren statische Artefakte in den `public/app`-Ordner der Next.js-App und baut dann die Next.js-App.*

### Phase 1: Aufbau der öffentlichen Wissensdatenbank (Dauer: ca. 2 Tage)

**Ziel:** Statisch generierte, SEO-optimierte Seiten für alle FAQs erstellen.

1.  **Routen erstellen:**
    - `src/pages/wissen/index.tsx`: Übersichtsseite, die alle Wissens-Einträge auflistet, gruppiert nach Tags aus der PostgreSQL-Datenbank.
    - `src/pages/wissen/[slug].tsx`: Detailseite für einen einzelnen Eintrag.
2.  **Daten-Pipeline für SSG (in `[slug].tsx`):**
    - **`getStaticPaths`:** Liest zur Build-Zeit alle FAQs aus der Postgres-DB und generiert eine Liste aller `slugs` (z.B. `/wissen/was-sind-bdew-codes`).
    - **`getStaticProps`:** Holt für jeden `slug` den spezifischen Inhalt (Frage, Antwort) aus der DB.
3.  **Intelligente interne Verlinkung:**
    - Innerhalb von `getStaticProps` wird der FAQ-Inhalt genutzt, um über den Vector Store 3-5 semantisch ähnliche Artikel zu finden.
    - Diese Links zu "Verwandten Themen" werden auf jeder Seite angezeigt, um die interne Verlinkungsstruktur und die Nutzerbindung zu stärken.
4.  **Semantische Anreicherung (Microformats & Schema.org):**
    - **HTML-Struktur (Microformats):** Der Inhalt der Wissens-Seite wird mit semantisch korrekten HTML-Tags strukturiert. Die Frage wird z.B. in einem `<dt>` (Definition Term) und die Antwort in einem `<dd>` (Definition Description) innerhalb einer `<dl>` (Description List) platziert. Dies allein hilft Suchmaschinen bereits, die Struktur des Inhalts zu verstehen.
    - **Rich Data Snippets (Schema.org):** Zusätzlich zur HTML-Struktur wird das `FAQPage` Schema.org JSON-LD-Skript in den `<Head>` der Seite eingefügt. Diese Kombination aus sichtbarem, strukturiertem Inhalt (Microformat) und maschinenlesbaren Metadaten (JSON-LD) signalisiert eine hohe inhaltliche Qualität und macht die Seite für die Darstellung als Rich Snippet in den Suchergebnissen besonders attraktiv.
    - Jede Seite erhält zudem via `<Head>`-Tag einen einzigartigen Titel und eine Beschreibung.

### Phase 2: Konfiguration der Legacy-App-Integration (Dauer: ca. 0.5 Tage)

**Ziel:** Die Legacy-App unter `/app` nahtlos erreichbar machen.

1.  **Client-seitiges Routing ermöglichen:** Damit Anfragen wie `/app/dashboard` nicht zu einem 404-Fehler führen, wird in `next.config.js` ein Fallback-Rewrite konfiguriert.

    ```javascript
    // next.config.js
    module.exports = {
      async rewrites() {
        return {
          fallback: [
            {
              source: '/app/:path*',
              destination: '/app/index.html',
            },
          ],
        };
      },
    };
    ```
    *Dies stellt sicher, dass jede nicht von Next.js behandelte Anfrage unter `/app/` die Haupt-HTML-Datei der Legacy-App lädt, deren React-Router dann die Kontrolle übernimmt.*

2.  **API-Requests sicherstellen:** Bestehende API-Aufrufe der Legacy-App (z.B. an `/api/...`) müssen weiterhin den Backend-Server erreichen. Falls der API-Server und der Next.js-Server getrennt sind, muss eine entsprechende Rewrite-Regel in `next.config.js` hinzugefügt werden. Wenn sie vom selben Server bedient werden, sind keine Änderungen nötig.

### Phase 3: Deployment & Verifizierung (Dauer: ca. 1 Tag)

**Ziel:** Die neue, einheitliche Anwendung in Produktion bringen.

1.  **Vereinfachte CI/CD-Pipeline:** Die Pipeline führt nur noch `npm run build` aus und deployt das Ergebnis (den `.next`-Ordner, `public`, `package.json` etc.) auf einen einzigen Node.js-Server.
2.  **Start-Befehl:** Der Server wird mit `npm run start` gestartet. Es ist kein externer Proxy mehr nötig.
3.  **Verifizierung:**
    - Einreichen der automatisch generierten `sitemap.xml` bei der Google Search Console.
    - Überprüfung einzelner `/wissen`-URLs mit dem "URL-Inspektionstool" von Google, um die korrekte HTML-Auslieferung zu bestätigen.
    - Vollständiger Funktionstest der Legacy-Anwendung unter `/app`.

## 6. Risiken

- **Build-Abhängigkeit:** Der gesamte Build-Prozess schlägt fehl, wenn der Build der `app-legacy` fehlschlägt.
- **Routing-Konflikte:** Eine neue Seite in Next.js darf nicht mit einer existierenden Route der Legacy-App unter `/app` kollidieren. Der `app`-Pfad ist für die Legacy-Anwendung reserviert.
- **Abhängigkeitsmanagement:** Gemeinsame Bibliotheken sollten auf eine Version im Root-`package.json` konsolidiert werden, um Konflikte zu vermeiden.

## 7. Erfolgskriterien

- Die öffentlichen `/wissen`-Seiten werden als statisches HTML ausgeliefert und erreichen einen Google Lighthouse Score von >90 im Bereich Performance und SEO.
- Die bestehende Anwendung unter `/app` ist nach dem Login ohne funktionale Einschränkungen nutzbar.
- Die gesamte Anwendung läuft als ein einziger Node.js-Prozess.
- Die Google Search Console zeigt an, dass die Wissens-Seiten erfolgreich gecrawlt und indexiert werden.
```
