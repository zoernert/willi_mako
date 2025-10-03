"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAtlasLandingStructuredData = exports.createAtlasDiagramStructuredData = exports.createAtlasProcessStructuredData = exports.createAtlasElementStructuredData = exports.createBreadcrumbStructuredData = void 0;
const origin = 'https://stromhaltig.de';
const createBreadcrumbStructuredData = (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${origin}${item.url}`,
    })),
});
exports.createBreadcrumbStructuredData = createBreadcrumbStructuredData;
const createAtlasElementStructuredData = (element) => ({
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
exports.createAtlasElementStructuredData = createAtlasElementStructuredData;
const createAtlasProcessStructuredData = (process) => ({
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
exports.createAtlasProcessStructuredData = createAtlasProcessStructuredData;
const createAtlasDiagramStructuredData = (diagram) => ({
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
exports.createAtlasDiagramStructuredData = createAtlasDiagramStructuredData;
const createAtlasLandingStructuredData = () => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Daten Atlas – Marktkommunikation Energiewirtschaft',
    description: 'Interaktiver Daten Atlas für Mitarbeiter in der Marktkommunikation der Energiewirtschaft. Entdecken Sie Datenelemente, Prozesse und Visualisierungen mit rechtlichen Grundlagen und Einsatzbeispielen.',
    url: `${origin}/daten-atlas`,
    inLanguage: 'de-DE',
});
exports.createAtlasLandingStructuredData = createAtlasLandingStructuredData;
//# sourceMappingURL=structuredData.js.map