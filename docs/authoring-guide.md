# Authoring Guide: Whitepapers & Articles

This guide shows how to write and publish Whitepapers (PDF + landing page) and Fachartikel (supporting articles) in this project.

## Content locations

- Whitepapers (MDX landing page + PDF)
  - Folder: `content/whitepapers/<slug>/`
  - File: `content/whitepapers/<slug>/index.mdx`
  - Optional related articles: `content/whitepapers/<slug>/articles/*.mdx`
- Articles (two patterns supported)
  - Flat: `content/articles/<slug>/index.mdx`
  - Nested under a whitepaper: `content/whitepapers/<wp-slug>/articles/<article-slug>.mdx`

Media files (PDF, images, audio, etc.) live under `public/` and are referenced with root-relative URLs (don’t include `public` in links):
- PDF example path: `public/whitepapers/<slug>/<file>.pdf` → use in MDX as `/whitepapers/<slug>/<file>.pdf`
- Images/audio example: `public/media/<file>` → use as `/media/<file>`

## Whitepaper frontmatter (index.mdx)

```yaml
---
# Required
title: "Titel des Whitepapers"
slug: "whitepaper-slug"
description: "Kurzbeschreibung für Listenseiten."
publishedDate: "2025-09-04"   # ISO Datum
pdfPath: "/whitepapers/whitepaper-slug/whitepaper.pdf"  # Pfad unter /public

# Optional
status: "published"            # "draft" | "published" (nur published wird gelistet)
seoTitle: "SEO Title (optional)"
seoDescription: "SEO Description (optional)"
canonicalUrl: "https://stromhaltig.de/whitepaper/whitepaper-slug"  # optional
---

# Einleitung

Inhalt in Markdown/MDX. Siehe weiter unten für Markdown-Features.
```

Notes
- `slug` muss Ordnernamen entsprechen.
- `pdfPath` muss auf eine existierende Datei unter `public/` zeigen.
- Nur `status: published` erscheint in Listen/Sitemaps.

## Article frontmatter

```yaml
---
# Required
title: "Titel des Artikels"

# Optional (werden teilweise aus dem Pfad abgeleitet)
slug: "artikel-slug"            # wird aus Dateiname/Ordner abgeleitet, kann gesetzt werden
whitepaperSlug: "whitepaper-slug"  # bei verschachtelter Struktur wird es aus dem Pfad abgeleitet
shortDescription: "Teaser für Listenansicht."
publishedDate: "2025-09-04"    # optional; default = now
status: "published"            # "draft" | "published"
seoTitle: "SEO Title (optional)"
seoDescription: "SEO Description (optional)"
canonicalUrl: "https://stromhaltig.de/wissen/artikel/artikel-slug"  # optional
---

Artikelinhalt in Markdown/MDX.
```

Notes
- Slug-Ermittlung: 
  - Flat: aus Ordnername `content/articles/<slug>/index.mdx`
  - Nested: aus Dateiname `content/whitepapers/<wp>/articles/<slug>.mdx`
- `whitepaperSlug` wird automatisch gesetzt, wenn der Artikel unter einem Whitepaper liegt; sonst optional.
- Nur `status: published` erscheint in der Übersicht.

## What renders where

- Whitepapers list: `/whitepaper` (nur published)
- Whitepaper detail: `/whitepaper/<slug>` zeigt MDX und verlinkte PDF (Lead-Formular sendet E-Mail; danach Direktlink)
- Articles list: `/wissen/artikel` (nur published)
- Article detail: `/wissen/artikel/<slug>`
- Whitepaper detail zeigt „Verwandte Artikel“ anhand `whitepaperSlug`.

## Markdown and HTML features

The local Markdown renderer supports:
- CommonMark + GitHub-Flavored Markdown (GFM)
  - Tabellen werden mit MUI-Komponenten gestylt.
- Lightweight raw HTML inside an explicit `<html>...</html>` block.
  - Example (Audio):

```md
<html>
<audio controls>
  <source src="/media/beispiel.m4a" type="audio/m4a" />
  Ihr Browser unterstützt das Audio-Element nicht.
</audio>
</html>
```

Guidelines
- Verwende für Medien immer Pfade ab `/` (ohne `public`).
- Audio-Container: bevorzugt `.m4a` Dateien.
- Roh-HTML ist erlaubt, aber bewusst sparsam einsetzen. Bei externen Beiträgen ggf. Sanitizing/Whitelist ergänzen.

## SEO tips

- Setze `seoTitle` und `seoDescription` im Frontmatter, falls der Standardtitel nicht optimal ist.
- `canonicalUrl` setzen, wenn Inhalte anderweitig gespiegelt werden.
- Titel-Hierarchie sauber strukturieren (`#`, `##`, `###`).
- Interne Links nutzen: Whitepaper ↔ Artikel.

## Publish workflow

1) Erstelle/ändere MDX unter `content/` gemäß Struktur oben.
2) Medien unter `public/` ablegen und im MDX mit Root-Pfad verlinken.
3) `status: published` setzen, wenn der Inhalt live gehen soll.
4) Lokal prüfen:
   - Development starten und Seiten testen.
5) Deploy ausführen.
   - Die Deploy-Skripte kopieren `content/` mit auf den Server, damit ISR die MDX-Dateien zur Laufzeit lesen kann.

### Local preview

- Start: `npm run dev`
- Prüfen:
  - `http://localhost:3000/whitepaper`
  - `http://localhost:3000/whitepaper/<slug>`
  - `http://localhost:3000/wissen/artikel`
  - `http://localhost:3000/wissen/artikel/<slug>`

## Troubleshooting

- 404 nach Deploy für Inhalte: sicherstellen, dass `content/` im Deploy enthalten ist (ist in den Skripten bereits vorgesehen).
- PDF-Link öffnet nicht: stimmt `pdfPath` und existiert die Datei unter `public/whitepapers/<slug>/`?
- Audio 404: richtige Endung `.m4a` und Datei unter `public/media/`?
- Artikel fehlt in Liste: `status` auf `published` setzen.

## Authoring checklist

- [ ] Richtiger Ordnerpfad (Whitepaper/Artikel, flat oder nested)
- [ ] Frontmatter vollständig (inkl. status)
- [ ] Medien in `public/` und mit Root-Pfaden
- [ ] Lokaler Test ok
- [ ] Deploy
