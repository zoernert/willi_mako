import Head from 'next/head';
import { StaticFAQData } from '../../../lib/faq-api';
import { generateFAQJSONLD } from '../../../lib/seo-utils';

interface FAQStructuredDataProps {
  faq: StaticFAQData;
  relatedFAQs?: StaticFAQData[];
}

export default function FAQStructuredData({ faq, relatedFAQs = [] }: FAQStructuredDataProps) {
  const jsonLD = generateFAQJSONLD(faq);

  // Erweiterte Schema.org Daten für bessere KI-Verständlichkeit
  const enhancedJSONLD = {
    ...jsonLD,
    "about": {
      "@type": "Thing",
      "name": "Marktkommunikation Energiewirtschaft",
      "sameAs": relatedFAQs.map(rf => `https://stromhaltig.de/wissen/${rf.slug}`)
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
    "mentions": relatedFAQs.map(rf => ({
      "@type": "Question",
      "name": rf.title,
      "url": `https://stromhaltig.de/wissen/${rf.slug}`
    }))
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(enhancedJSONLD)
        }}
      />
    </Head>
  );
}
