# Whitepaper & Artikel – Git-basierte Pflege

Diese Anleitung zeigt, wie du Whitepaper-Landingpages, PDFs und begleitende Artikel per Markdown/MDX im Repo pflegst. Keine externe CMS-Installation nötig.

## Ordnerstruktur
```
content/
  whitepapers/
    <whitepaper-slug>/
      index.mdx                 # Metadaten + optional kurzer Introtext
      articles/
        <article-slug>.mdx      # Begleitartikel
public/
  whitepapers/
    <whitepaper-slug>/
      <pdf-datei>.pdf           # Whitepaper PDF
      assets/                   # Bilder, Audio, etc.
        *.png *.jpg *.mp3 *.m4a *.mpg
```

Unterstützte Medienformate: PNG, JPG, MP3, M4A, MPG

## Whitepaper anlegen
1. Neuen Ordner `content/whitepapers/<slug>/` erstellen.
2. Datei `index.mdx` mit Frontmatter erstellen:

---

title: "Whitepaper: Die Zukunft der Energie"
slug: "die-zukunft-der-energie"
description: "Erfahren Sie, wie digitale Infrastrukturen die Energiewende vorantreiben."
publishedDate: "2025-09-01"
seoTitle: "Whitepaper: Die Zukunft der Energie - Stromhaltig"
seoDescription: "Laden Sie unser Whitepaper über digitale Infrastrukturen herunter."
canonicalUrl: "https://stromhaltig.de/whitepaper/die-zukunft-der-energie"
thumbnail: "/whitepapers/die-zukunft-der-energie/assets/cover.jpg"
pdfPath: "/whitepapers/die-zukunft-der-energie/die-zukunft-der-energie.pdf"
status: "published" # oder "draft"

---

Optionaler kurzer Introtext in Markdown.

3. Lege das PDF in `public/whitepapers/<slug>/` ab (siehe `pdfPath`).
4. Bilder/Medien in `public/whitepapers/<slug>/assets/` ablegen und in Markdown referenzieren, z. B. `![](/whitepapers/<slug>/assets/cover.jpg)`.

## Artikel anlegen
1. Datei `content/whitepapers/<whitepaper-slug>/articles/<article-slug>.mdx` erstellen.
2. Frontmatter:

---

title: "Digitale Infrastrukturen als Basis der Energiewende"
slug: "digitale-infrastrukturen-energiewende"
shortDescription: "Auszug aus dem Whitepaper zur Zukunft der Energie."
publishedDate: "2025-09-02"
whitepaperSlug: "die-zukunft-der-energie"
seoTitle: "Digitale Infrastrukturen – Stromhaltig"
seoDescription: "Rolle digitaler Infrastrukturen in der Energiewende."
canonicalUrl: "https://stromhaltig.de/wissen/artikel/digitale-infrastrukturen-energiewende"
tags: ["energie", "digital", "smart-grids"]
coverImage: "/whitepapers/die-zukunft-der-energie/assets/diagramm.png"

---

Darunter folgt der eigentliche Artikelinhalt in Markdown.

## Veröffentlichung
- Commit & Push. Die Seiten werden statisch generiert (ISR). Neue Whitepaper/Artikel erscheinen automatisch im Listing.

## Formular & Lead-Mails
- Auf jeder Whitepaper-Landingpage gibt es ein Formular. Bei Absenden werden zwei E-Mails versendet:
  - Lead-Mail an dev@stromdao.com (Absender: dev@stromdao.com)
  - Service-Mail an den Interessenten mit dem PDF-Link
- Keine Double-Opt-In-Logik. Leadverarbeitung erfolgt nachgelagert.

## SEO-Hinweise
- Fülle `seoTitle`, `seoDescription`, `canonicalUrl` im Frontmatter.
- Nutze aussagekräftige Titel/Slug.
- Bilder mit sprechenden Dateinamen und sinnvollen ALT-Texten versehen.

## Tipps
- Dateinamen klein und ohne Leerzeichen.
- Große Medien komprimieren (Ladezeit/SEO).
- Prüfe Links lokal (`npm run dev`).
