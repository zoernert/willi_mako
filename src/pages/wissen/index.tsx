import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  QuestionAnswer as FAQIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../../lib/faq-api';

interface WissenIndexProps {
  faqs: StaticFAQData[];
  tags: FAQTag[];
  totalCount: number;
}

export default function WissenIndex({ faqs, tags, totalCount }: WissenIndexProps) {
  // Gruppiere FAQs nach Tags
  const faqsByTag = tags.reduce((acc, tag) => {
    acc[tag.tag] = faqs.filter(faq => faq.tags.includes(tag.tag)).slice(0, 5); // Top 5 pro Tag
    return acc;
  }, {} as Record<string, StaticFAQData[]>);

  return (
    <Layout title="Wissensdatenbank">
      <Head>
        <title>Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako</title>
        <meta 
          name="description" 
          content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`}
        />
        <meta name="keywords" content="Energiewirtschaft, FAQ, BDEW, EIC, Bilanzkreise, Marktkommunikation, Strommarkt" />
        <link rel="canonical" href="https://stromhaltig.de/wissen" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako" />
        <meta property="og:description" content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/wissen" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako" />
        <meta name="twitter:description" content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel.`} />

        {/* RSS/Atom Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Willi-Mako FAQ RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Willi-Mako FAQ Atom Feed" href="/atom.xml" />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "Wissensdatenbank Energiewirtschaft",
              "description": "Umfassende FAQ-Sammlung für Marktkommunikation in der Energiewirtschaft",
              "url": "https://stromhaltig.de/wissen",
              "isPartOf": {
                "@type": "WebSite",
                "name": "Willi-Mako",
                "url": "https://stromhaltig.de"
              },
              "about": {
                "@type": "Thing",
                "name": "Energiewirtschaft Marktkommunikation"
              },
              "mentions": tags.slice(0, 10).map(tag => ({
                "@type": "Thing",
                "name": tag.tag
              }))
            })
          }}
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wissensdatenbank Energiewirtschaft
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Umfassende FAQ-Sammlung für Marktkommunikation in der Energiewirtschaft. 
            {totalCount} Artikel zu BDEW-Codes, EIC-Codes, Bilanzkreisen und mehr.
          </p>
        </header>

        {/* Tag Navigation */}
        <nav className="mb-12" aria-label="FAQ Kategorien">
          <h2 className="text-2xl font-semibold mb-6">Themengebiete</h2>
          <div className="flex flex-wrap gap-3">
            {tags.slice(0, 15).map(tag => (
              <Link
                key={tag.tag}
                href={`/wissen/thema/${tag.tag.toLowerCase()}`}
                className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <span className="font-medium">{tag.tag}</span>
                <span className="ml-2 text-sm bg-blue-200 px-2 py-1 rounded-full">
                  {tag.count}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        {/* FAQ Sections by Tag */}
        {tags.slice(0, 8).map(tag => {
          const tagFAQs = faqsByTag[tag.tag];
          if (!tagFAQs || tagFAQs.length === 0) return null;

          return (
            <section key={tag.tag} className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {tag.tag}
                </h2>
                <Link
                  href={`/wissen/thema/${tag.tag.toLowerCase()}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Alle {tag.count} Artikel anzeigen →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tagFAQs.map((faq: StaticFAQData) => (
                  <article 
                    key={faq.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-lg font-semibold mb-3">
                      <Link
                        href={`/wissen/${faq.slug}`}
                        className="text-gray-900 hover:text-blue-600"
                      >
                        {faq.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      {faq.description || faq.content.substring(0, 120) + '...'}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{faq.view_count} Aufrufe</span>
                      <time dateTime={faq.updated_at}>
                        {new Date(faq.updated_at).toLocaleDateString('de-DE')}
                      </time>
                    </div>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {faq.tags.slice(0, 3).map((faqTag: string) => (
                        <span
                          key={faqTag}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {faqTag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {/* Call to Action */}
        <section className="text-center mt-16 p-8 bg-blue-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            Suchen Sie spezifische Informationen?
          </h2>
          <p className="text-gray-600 mb-6">
            Nutzen Sie unsere erweiterte Suchfunktion oder registrieren Sie sich für Zugang zu Premium-Features.
          </p>
          <Link
            href="/app"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Zur Hauptanwendung →
          </Link>
        </section>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [faqs, tags] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags()
    ]);

    return {
      props: {
        faqs,
        tags: tags.slice(0, 20), // Limite für Performance
        totalCount: faqs.length
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getStaticProps for /wissen:', error);
    
    return {
      props: {
        faqs: [],
        tags: [],
        totalCount: 0
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
};
