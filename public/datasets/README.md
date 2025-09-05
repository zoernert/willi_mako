# Dataset JSON-LD handover

This folder contains the JSON-LD graph with schema.org Dataset entries for Codeliste PDFs.

Files
- datasets.jsonld: JSON-LD object with `@context` and `@graph` (array of Dataset objects)
- data/<slug>/:
	- Original PDF copied here for delivery to frontend
	- tables.json: manifest of parsed tables (one entry per table with page and confidence)
	- table-XXX.json: JSON representation per table (headers + rows)
	- table-XXX.csv: CSV export per table

How to use (frontend)
- Create a landing page per dataset at: https://stromhaltig.de/data/<slug>/
- For each page, embed the corresponding Dataset as a `<script type="application/ld+json">` tag.
- The `url` field already points to the intended landing page; keep it consistent with the route.
- The `distribution[0].contentUrl` points to the expected public PDF URL under the dataset page. Serve the original PDF at that path.
- New: We also add structured data files per dataset under the same route:
	- <slug>/tables.json: Summary + index of all extracted tables
	- <slug>/table-XXX.json and <slug>/table-XXX.csv: Per-table data (headers + rows)
	- You can fetch and render these to build interactive tables.

Sources
- knowledge/: local curated code lists
- km2/: additional BDEW/market documents, filtered to Codeliste*.pdf

Notes
- The `_source` section is for implementation only (local path, Qdrant presence). It can be removed before embedding.
- You can set DATA_BASE_URL in the environment to change the base path for generated URLs if needed.
- To regenerate structured data, run: `npm run export:datasets:tables`.
- If you add more files, re-run the generator: `npm run export:datasets`.

## Digest (Übersicht) für Frontend/SEO

Kurzer Überblick über die aktuell generierten Datasets inkl. Route und Tabellenzahl. Die Route ist jeweils:
- https://stromhaltig.de/data/<slug>/

Snapshot (aus den aktuellen Artefakten):
- codeliste-artikelnummern-und-artikel-id-5-5-20231024 — tables: 1
- codeliste-artikelnummern-und-artikel-id-5-5-ausserordentliche-20250320 — tables: 1
- codeliste-der-temperaturanbieter-1-0i-20220722 — tables: 0
- codeliste-der-zeitreihentypen-1-1d-20210401 — tables: 1
- codeliste-der-zeitreihentypen-1-1d-lesefassung-20210716 — tables: 1
- codeliste-europaeischer-laendercode-1-0-fehlerkorrektur-20230330 — tables: 1
- codeliste-europaeischer-laendercodes-1-0-20170401 — tables: 1
- codeliste-konfigurationen-1-3b-20241001 — tables: 1
- codeliste-konfigurationen-1-3b-fehlerkorrektur-20250417 — tables: 1
- codeliste-lokationsbuendelstrukturen-1-0-20230331 — tables: 1
- codeliste-lokationsbuendelstrukturen-1-0-fehlerkorrektur-20241213 — tables: 1
- codeliste-lokationsbundelstrukturen-1-0-fehlerkorrektur-20241213 — tables: 1
- codeliste-obis-kennzahlen-medien-2-5b-20240125 — tables: 1
- codeliste-obis-kennzahlen-medien-2-5b-fehlerkorrektur-20250210 — tables: 1

Hinweise
- Die Tabellenzahl stammt aus `<slug>/tables.json` (Feld `tablesCount`).
- Doppelte/nahezu identische Slugs können durch unterschiedliche Diakritika entstehen (z. B. „buendel“ vs. „bundel“). Dies kann bewusst für Weiterleitungen genutzt werden oder später dedupliziert werden.

## SEO-Implementierung (Kurzleitfaden)

- Indexseite `/data/` (optional):
	- Rendern Sie eine Liste aller Datasets (Slugs aus `datasets.jsonld -> @graph[*].url`).
	- Optional: Einbetten eines `ItemList`-JSON-LD mit Einträgen zu allen Dataset-URLs.
- Detailseite `/data/<slug>/`:
	- Binden Sie den passenden `Dataset`-Eintrag aus `datasets.jsonld` als `<script type="application/ld+json">` ein.
	- Zeigen Sie Download-Links an:
		- PDF: `distribution[].contentUrl` (typischerweise der erste Eintrag)
		- Strukturiert: `<slug>/tables.json` und pro Tabelle `table-XXX.(json|csv)`
	- Meta-Tags: `title`, `description`, `og:*`, `twitter:*`, `canonical` auf die Dataset-URL setzen.
- Sitemaps/Robots:
	- Alle `/data/<slug>/`-Seiten in die Sitemap aufnehmen; `lastmod` aus der Dataset-Metadatenlage (z. B. `datePublished` sofern vorhanden) ableiten.
- Mehr Kontext für E-E-A-T:
	- Publisher/Autor benennen (Organisation), Quelle verlinken (siehe Abschnitt „Hintergrund & Meta“), Änderungsstand/Version klar ausweisen (aus Dateinamen/Metadaten).

## Datenvertrag (Tables Manifest & Tabellen-Dateien)

- `<slug>/tables.json`
	- `tablesCount`: Anzahl erkannter Tabellen.
	- `tables[]`: Liste mit Objekten `{ id, page, confidence, indicators, headersCount, rowsCount, files: { json, csv } }`.
- `<slug>/table-XXX.json`
	- `{ headers: string[], rows: Array<string[]> }` — bereits bereinigt und spaltenstabilisiert.
- `<slug>/table-XXX.csv`
	- CSV-Repräsentation der obigen `rows` inkl. Headerzeile.

Fehlerszenarien
- Kein Tabellenfund: Es existiert dennoch ein `tables.json` mit `tablesCount = 0` (Frontend kann fallbacken auf PDF-Download).
- Teil-Extraktionen: LLM/Heuristiken können bei komplexen Layouts einzelne Spalten vereinfachen. Das Feld `confidence` hilft bei UI-Hinweisen.

## Hintergrund & Meta-Informationen

- Quellen
	- Canonical sind die PDFs (Ordner `knowledge/` und `km2/`). Die JSON/CSV sind abgeleitete Hilfsformate für die UI.
	- Dokumente stammen u. a. aus BDEW-/Marktkommunikationsunterlagen („Codeliste …“), z. T. als Lesefassung/Fehlerkorrektur.
- Aktualität
	- Neue/aktualisierte PDFs können jederzeit ergänzt werden. Generator erneut ausführen (siehe oben) — die Routen bleiben stabil über `<slug>`.
- Qualität & Haftung
	- Die tabellarischen Daten sind automatisiert extrahiert (Heuristiken + LLM). Für normative Zwecke gilt ausschließlich das PDF.
	- `confidence` im Manifest gibt Hinweise auf Extraktionssicherheit; UI kann dies anzeigen.
- Lizenz/Urheber
	- Bitte die rechtlichen Rahmenbedingungen der jeweiligen Dokumentenherausgeber beachten; bei Unsicherheit Links zur Originalquelle ergänzen.

