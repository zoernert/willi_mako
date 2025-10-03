# Daten Atlas – Umsetzungskonzept

## 1. Ziele & Erfolgskriterien
- **SEO-Wirksamkeit:** Neue, crawlbare Landing- und Detailseiten mit klaren H1/H2-Strukturen, sprechenden URLs, Rich Snippets (FAQ/HowTo) und hoher interner Verlinkung.
- **Nutzwert für Marktkommunikation:** Schnelles Auffinden von Datenelementen, Prozessen und Diagrammen; Kontextinformationen zu rechtlichen Grundlagen und Einsatzszenarien.
- **Interaktive Erfahrung:** Filter, Volltextsuche, Diagramm-Viewer, Verknüpfungen zwischen Datenelementen, Prozessen und Visualisierungen.
- **Performance & Wartbarkeit:** Statische Generierung (SSG) + optionale ISR, Caching der Datengrundlagen, nachhaltige Datenpipeline.

## 2. Informationsarchitektur & Navigation
- **Neuer Hauptmenüpunkt "Daten Atlas":** Verlinkt auf `/daten-atlas` (Landing Page) mit Unterpunkten für Datenelemente, Prozesse und Visualisierungen.
- **URL-Strategie:**
  - `/daten-atlas` – Übersicht & Einstieg.
  - `/daten-atlas/datenelemente/[slug]` – Detailseiten für Datenelemente.
  - `/daten-atlas/prozesse/[slug]` – Prozessbeschreibungen inkl. beteiligter Nachrichten.
  - `/daten-atlas/visualisierungen/[diagramId]` – Interaktive Darstellung (SVG/PNG/PUML-Viewer).
- **Interne Verlinkung:**
  - Landing Page verlinkt auf Top-Datenelemente, Prozesse und Diagramme.
  - Detailseiten referenzieren verwandte Inhalte (z. B. „Verwendet in Prozess X“, „Siehe Diagramm Y“).
  - Integration relevanter Links aus bestehenden Wissens-/Quizseiten.
  - QDrant-gestützte Empfehlungen heben inhaltliche Zusammenhänge hervor; es werden bewusst keine redaktionellen Prioritätslisten gepflegt.
- **Breadcrumbs:** Konsistente Breadcrumb-Komponenten für SEO & UX.

## 3. Datenquellen & Aufbereitung
- **Primärdaten:** `data/atlas/data_atlas.json`, `process_definitions.json`, UML-Dateien (`.puml`, `.svg`, `.png`).
- **Sekundärdaten:** Inhalte aus der QDrant-Collection `willi_mako` zur Anreicherung von Textbausteinen, Cross-Links und Kontextbeschreibungen.
- **Parsing & Normalisierung:**
  - TypeScript-Interfaces in `lib/atlas/types.ts` definieren.
  - Utility in `lib/atlas/data.ts` zum Laden/Normalisieren (inkl. Caching via `globalThis`).
  - Mapping von Datenelementen zu Prozessen, Diagrammen und gesetzlichen Referenzen.
- **Slug-Generierung:** Aus Kennungen (z. B. `BGM_1004`) SEO-freundliche Slugs erstellen (`bgm-1004-belegart-code`).
- **Diagrammverarbeitung:**
  - Build-Skript (`scripts/generate-atlas-assets.ts`) konvertiert `.puml` → `.svg` (mittels `@plantuml/cli`) und kopiert vorhandene `.svg`/`.png` nach `public/atlas/`.
  - Ergänzend werden `.svg`-Quellen in markenkonforme PDF-Dateien mit „Willi Mako“-Branding (Logo + URL `https://stromhaltig.de`) gerendert und nach `public/atlas/pdf/` gelegt.
  - Metadaten-Datei (`atlas_diagrams.json`) erzeugen mit Titel, Beschreibung, Pfaden (SVG, PNG, PDF, PUML) und Branding-Hinweis.

## 4. Seiten & Komponenten
- **Landing Page (`src/pages/daten-atlas/index.tsx`):**
  - Hero mit kurzer Einordnung + CTA.
  - Interaktive Kacheln (Datenelemente, Prozesse, Visualisierungen) mit Count-Badges.
  - Top-Suche (Auto-Suggest) und Filter (z. B. nach Nachrichtentyp, Prozess, Rechtsgrundlage).
  - Abschnitt „So arbeitest du mit dem Atlas“ + FAQ (für Schema.org FAQPage).
- **Datenelement-Detail (`[slug].tsx`):**
  - Titel, Beschreibung, Einsatzprozesse, Rechtsgrundlagen.
  - Tabs: „Überblick“, „Prozesse“, „Visualisierungen“.
  - Callouts mit wichtigen Codes, Pflicht/Optional.
  - Interaktive Tabelle mit verwendeten Nachrichten (filterbar).
- **Prozess-Detail (`prozesse/[slug].tsx`):**
  - Prozessbeschreibung, beteiligte Rollen, relevante Nachrichten.
  - Timeline/Schritt-für-Schritt Visualisierung (evtl. mit `react-flow` oder `framer-motion`).
  - Linkliste auf Datenelemente + Diagramme.
- **Visualisierung (`visualisierungen/[diagramId].tsx`):**
  - Rendern von SVG/PNG direkt (Next Image) + Download-Link.
  - Falls nur `.puml` existiert: gerenderte SVG aus Build-Skript.
  - Zusätzlicher Download-CTA für brand-konforme PDF-Versionen.
  - Optionaler Inline-PlantUML-Renderer (Lazy Load) für zusätzliche Interaktion (z. B. Highlight von Elementen).
- **Gemeinsame Komponenten:**
  - `AtlasSearchBar` (Autosuggest mit Algolia Mini-Like, aber lokal via Fuse.js).
  - `AtlasFilterPanel` (Checkbox/Tag-Filter).
  - `AtlasCard`, `AtlasBreadcrumbs`, `AtlasReferenceList`.
  - Schema.org-Komponenten (BreadcrumbList, FAQPage, Article).

## 5. Interaktive Funktionen
- **Clientseitige Suche:** Einsatz von `fuse.js` mit vorbereiteten Indexdaten (`atlas_search_index.json`).
- **Filter & Facetten:** Mehrfachauswahl (z. B. Nachrichtentypen, Prozesse, Rechtsgrundlagen).
- **Diagramm-Viewer:** Zoom/Pan (z. B. via `react-svg-pan-zoom`), Lightbox für Vollbild.
- **Cross-Highlighting:** Beim Hover über Datenelemente markierte Bereiche im Diagramm (optional, Phase 2).
- **Content Sharing:** Direktlinks zu Abschnitten (Anchor-Links) + Copy-URL Button.
- **Analytics:** Standard-Tracking (z. B. Plausible) weiterverwenden; Events nur ergänzen, falls Fachbereich später Bedarf meldet.

## 6. SEO-Strategie
- **Static Generation:** `getStaticPaths` + `getStaticProps` für alle Detailseiten; Revalidation auf Wochenbasis (`revalidate: 86400 * 7`).
- **Meta & Structured Data:**
  - Titel/Description dynamisch generieren (z. B. `Datenelement BGM 1004 – Belegart, Code`).
  - BreadcrumbList + Article/FAQ JSON-LD.
  - Open Graph Bilder (generisch oder per Diagramm).
- **Interne Verlinkung:** CTA-Boxen „Mehr zu …“, Related Content Blöcke, Footer-Links.
- **Sitemaps:** Erweiterung der bestehenden Sitemap-Generator-Logik um Atlas-Pfade.
  - Automatische Aktualisierung der `sitemap.xml` beim Build, damit alle Landing- und Detailseiten (inkl. Visualisierungen) erfasst sind.
- **Performance:** Nutzung von `next/image`, Lazy Loading, Code-Splitting.

## 7. Implementierungsschritte
1. **Vorbereitung (Sprint 1):**
   - Datentypen, Utilities & Slug-Logik.
   - Build-Skript zur Diagrammkonvertierung + statische Assets.
   - Generierung Search-Index.
2. **Grundseiten (Sprint 2):**
   - Landing Page Layout + Basis-Navigation.
   - Detailseiten mit statischen Inhalten (ohne Interaktion).
   - Menüintegration + Breadcrumb-Komponente.
3. **Interaktion (Sprint 3):**
   - Suche, Filter, Autosuggest.
   - Diagramm-Viewer mit Zoom/Pan.
   - Related-Content-Blöcke & interne Verlinkung.
4. **SEO-Finishing (Sprint 4):**
   - Structured Data, OG-Bilder, Sitemap.
   - Performance-Optimierungen + Lighthouse.
   - Content QA & Redaktionsfreigabe.

## 8. Daten- & Content-Pipeline
- **Skripte:**
  - `npm run atlas:build` → Einmalige Generierung statischer Assets (SVG, PNG, PDF), Search-Index, QDrant-gestützte Text-Snippets sowie Metadaten-Dateien. Der Job läuft initial vollständig und wird nur bei Datenänderungen erneut ausgeführt.
  - `npm run atlas:validate` → Prüft JSON-Schema/Referenzen und vergleicht QDrant-Verlinkungen auf Konsistenz.
- **Redaktionelle Pflege:**
  - Beschreibungen/Metadaten in `data_atlas.json`/`process_definitions.json` aktualisieren; QDrant-Inhalte per Import-Skript synchronisieren.
  - Keine CMS-Integration vorgesehen; Pflege erfolgt git-basiert.

## 9. Qualitätssicherung
- **Tests:**
  - Unit-Tests für Utilities (Slug, Mapping, Suche).
  - Integrationstests der Seiten (Playwright/Next E2E, optional Lighthouse CI).
  - Snapshot-Tests für strukturierte Daten.
- **Checks:** Type-Check, Lint, `npm run build:next`, optional `npm run test`.

## 10. Risiken & Mitigation
- **PlantUML-Abhängigkeiten:** Headless Rendering kann zeitaufwendig sein → Vor-Rendern im Build, Caching der Ergebnisse.
- **Datenvolumen (1000+ Elemente):** Pagination & Lazy Loading für Tabellen; Search Index optimieren.
- **SEO-Kannibalisierung:** Koordination mit bestehenden Wissensseiten, klare Kanonical Tags.
- **Asset-Branding:** Sicherstellen, dass generierte PDFs das aktuelle „Willi Mako“-Branding verwenden (Regressionstest im Build).

## 11. Offene Fragen
- Wie wird das finale Branding-Template (Logo, Farbe, Positionierung) für die PDF-Generierung bereitgestellt?
- Benötigen wir redaktionelle Guidelines für die Einbindung von QDrant-Snippets (z. B. Längenbegrenzung, Style)?
