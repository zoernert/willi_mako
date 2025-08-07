"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.generateFAQJSONLD = generateFAQJSONLD;
exports.generateBreadcrumbJSONLD = generateBreadcrumbJSONLD;
exports.calculateSitemapPriority = calculateSitemapPriority;
exports.calculateChangeFreq = calculateChangeFreq;
exports.generateRSSItem = generateRSSItem;
exports.generateAtomEntry = generateAtomEntry;
// Generiere SEO-optimierte Metadaten für eine FAQ
function generateMetadata(faq) {
    const title = `${faq.title} | Willi-Mako Energiewirtschaft FAQ`;
    const description = faq.description || faq.content.substring(0, 160) + '...';
    const url = `https://stromhaltig.de/wissen/${faq.slug}`;
    return {
        title,
        description,
        keywords: faq.tags.join(', '),
        openGraph: {
            title,
            description,
            type: 'article',
            url
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description
        }
    };
}
// Generiere Schema.org JSON-LD für FAQ
function generateFAQJSONLD(faq) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": {
            "@type": "Question",
            "name": faq.title,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer,
                "author": {
                    "@type": "Organization",
                    "name": "Willi-Mako Expertensystem",
                    "url": "https://stromhaltig.de"
                },
                "dateCreated": faq.created_at,
                "dateModified": faq.updated_at
            }
        },
        "about": {
            "@type": "Thing",
            "name": "Marktkommunikation Energiewirtschaft",
            "sameAs": faq.related_faqs.map(rf => `https://stromhaltig.de/wissen/${rf.slug}`)
        },
        "isPartOf": {
            "@type": "Dataset",
            "name": "Energiewirtschaft FAQ Datenbank",
            "description": "Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft",
            "license": "https://creativecommons.org/licenses/by-sa/4.0/",
            "publisher": {
                "@type": "Organization",
                "name": "STROMDAO GmbH",
                "url": "https://stromhaltig.de"
            }
        },
        "keywords": faq.tags.join(', '),
        "datePublished": faq.created_at,
        "dateModified": faq.updated_at
    };
}
// Generiere Breadcrumb JSON-LD
function generateBreadcrumbJSONLD(faq, cluster) {
    const breadcrumbs = [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://stromhaltig.de"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": "Wissensdatenbank",
            "item": "https://stromhaltig.de/wissen"
        }
    ];
    if (cluster) {
        breadcrumbs.push({
            "@type": "ListItem",
            "position": 3,
            "name": cluster,
            "item": `https://stromhaltig.de/wissen/thema/${cluster.toLowerCase()}`
        });
    }
    breadcrumbs.push({
        "@type": "ListItem",
        "position": breadcrumbs.length + 1,
        "name": faq.title,
        "item": `https://stromhaltig.de/wissen/${faq.slug}`
    });
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs
    };
}
// Berechne Sitemap-Priorität basierend auf View Count und Tags
function calculateSitemapPriority(viewCount, tags) {
    const basePriority = Math.min(0.9, 0.5 + (viewCount / 1000));
    const tagBoost = tags.some(tag => ['BDEW', 'EIC', 'Bilanzkreis'].includes(tag)) ? 0.1 : 0;
    return Math.min(1.0, basePriority + tagBoost).toFixed(1);
}
// Berechne Change Frequency basierend auf View Count
function calculateChangeFreq(viewCount) {
    if (viewCount > 100)
        return 'weekly';
    if (viewCount > 50)
        return 'monthly';
    return 'yearly';
}
// Generiere RSS Feed Item
function generateRSSItem(faq) {
    return `
    <item>
      <title><![CDATA[${faq.title}]]></title>
      <description><![CDATA[${faq.description || faq.content.substring(0, 300)}]]></description>
      <link>https://stromhaltig.de/wissen/${faq.slug}</link>
      <guid>https://stromhaltig.de/wissen/${faq.slug}</guid>
      <pubDate>${new Date(faq.updated_at).toUTCString()}</pubDate>
      ${faq.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('\n      ')}
    </item>
  `;
}
// Generiere ATOM Feed Entry
function generateAtomEntry(faq) {
    return `
    <entry>
      <title type="html"><![CDATA[${faq.title}]]></title>
      <link href="https://stromhaltig.de/wissen/${faq.slug}" />
      <id>https://stromhaltig.de/wissen/${faq.slug}</id>
      <updated>${new Date(faq.updated_at).toISOString()}</updated>
      <published>${new Date(faq.created_at).toISOString()}</published>
      <summary type="html"><![CDATA[${faq.description || faq.content.substring(0, 300)}]]></summary>
      <content type="html"><![CDATA[${faq.answer}]]></content>
      <author>
        <name>Willi-Mako Expertensystem</name>
        <uri>https://stromhaltig.de</uri>
      </author>
      ${faq.tags.map(tag => `<category term="${tag}" />`).join('\n      ')}
    </entry>
  `;
}
//# sourceMappingURL=seo-utils.js.map