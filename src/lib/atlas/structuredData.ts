import type { AtlasDiagram, AtlasElement, AtlasProcess } from './types';

const origin = 'https://stromhaltig.de';

export const createBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${origin}${item.url}`,
  })),
});

export const createAtlasElementStructuredData = (element: AtlasElement) => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: `${element.elementName} (${element.edifactId})`,
  description: element.description,
  url: `${origin}/daten-atlas/datenelemente/${element.slug}`,
  inLanguage: 'de-DE',
  keywords: element.keywords,
  dateModified: element.updatedAt,
  about: element.processes.map((process) => ({
    '@type': 'Thing',
    name: process.name,
    url: `${origin}/daten-atlas/prozesse/${process.slug}`,
  })),
});

export const createAtlasProcessStructuredData = (process: AtlasProcess) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  name: `${process.name} – Marktkommunikation`,
  description: process.summary || process.description,
  url: `${origin}/daten-atlas/prozesse/${process.slug}`,
  inLanguage: 'de-DE',
  keywords: process.keywords,
  dateModified: process.updatedAt,
  mentions: process.elements.map((slug) => ({
    '@type': 'Thing',
    name: slug,
    url: `${origin}/daten-atlas/datenelemente/${slug}`,
  })),
});

export const createAtlasDiagramStructuredData = (diagram: AtlasDiagram) => ({
  '@context': 'https://schema.org',
  '@type': 'VisualArtwork',
  name: diagram.title,
  url: `${origin}/daten-atlas/visualisierungen/${diagram.slug}`,
  inLanguage: 'de-DE',
  encodingFormat: 'image/svg+xml',
  fileFormat: 'image/svg+xml',
  dateModified: diagram.updatedAt,
  keywords: diagram.keywords,
});

export const createAtlasLandingStructuredData = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Daten Atlas – Marktkommunikation Energiewirtschaft',
  description:
    'Interaktiver Daten Atlas für Mitarbeiter in der Marktkommunikation der Energiewirtschaft. Entdecken Sie Datenelemente, Prozesse und Visualisierungen mit rechtlichen Grundlagen und Einsatzbeispielen.',
  url: `${origin}/daten-atlas`,
  inLanguage: 'de-DE',
});
