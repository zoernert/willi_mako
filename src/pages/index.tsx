import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../lib/faq-api';

interface HomeProps {
  featuredFAQs: StaticFAQData[];
  popularTags: FAQTag[];
  totalFAQCount: number;
}

export default function Home({ featuredFAQs, popularTags, totalFAQCount }: HomeProps) {
  return (
    <>
      <Head>
        <title>Willi-Mako | Energiewirtschaft Expertensystem & FAQ-Datenbank</title>
        <meta 
          name="description" 
          content={`Willi-Mako: Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft. ${totalFAQCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr. Jetzt kostenlos testen!`}
        />
        <meta name="keywords" content="Energiewirtschaft, Marktkommunikation, BDEW, EIC, Bilanzkreise, FAQ, Expertensystem, Strommarkt" />
        <link rel="canonical" href="https://stromhaltig.de" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Willi-Mako | Energiewirtschaft Expertensystem" />
        <meta property="og:description" content={`Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft. ${totalFAQCount} FAQ-Artikel verfügbar.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de" />
        <meta property="og:site_name" content="Willi-Mako" />
        
        {/* RSS/Atom Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Willi-Mako FAQ RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Willi-Mako FAQ Atom Feed" href="/atom.xml" />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Willi-Mako",
              "description": "Expertensystem für Marktkommunikation in der Energiewirtschaft",
              "url": "https://stromhaltig.de",
              "publisher": {
                "@type": "Organization",
                "name": "STROMDAO GmbH",
                "url": "https://stromdao.de"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://stromhaltig.de/wissen?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-green-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Willi-Mako
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              Zugang zu {totalFAQCount}+ verifizierten FAQ-Artikeln zu BDEW-Codes, EIC-Codes, 
              Bilanzkreisen und allen relevanten Themen der Energiewirtschaft.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wissen"
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Wissensdatenbank durchsuchen
              </Link>
              <Link
                href="/app"
                className="inline-block bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Zur Hauptanwendung
              </Link>
            </div>
          </div>
        </section>

        {/* Featured FAQs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Häufig gestellte Fragen
              </h2>
              <p className="text-lg text-gray-600">
                Die wichtigsten Antworten zu Themen der Energiewirtschaft
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredFAQs.map((faq) => (
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

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{faq.view_count} Aufrufe</span>
                    <time dateTime={faq.updated_at}>
                      {new Date(faq.updated_at).toLocaleDateString('de-DE')}
                    </time>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {faq.tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/wissen"
                className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-lg"
              >
                Alle {totalFAQCount} FAQ-Artikel anzeigen →
              </Link>
            </div>
          </div>
        </section>

        {/* Popular Topics */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Beliebte Themengebiete
              </h2>
              <p className="text-lg text-gray-600">
                Entdecken Sie die wichtigsten Bereiche der Energiewirtschaft
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {popularTags.slice(0, 12).map((tag) => (
                <Link
                  key={tag.tag}
                  href={`/wissen/thema/${tag.tag.toLowerCase()}`}
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="font-medium text-gray-900">{tag.tag}</span>
                  <span className="ml-3 text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {tag.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Warum Willi-Mako?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Verifizierte Inhalte</h3>
                <p className="text-gray-600">
                  Alle FAQ-Artikel werden von Experten geprüft und regelmäßig aktualisiert.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Intelligente Suche</h3>
                <p className="text-gray-600">
                  KI-gestützte Suche findet auch semantisch verwandte Inhalte.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Umfassende Datenbank</h3>
                <p className="text-gray-600">
                  {totalFAQCount}+ Artikel zu allen Bereichen der Energiewirtschaft.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Willi-Mako</h3>
                <p className="text-gray-400">
                  Expertensystem für Marktkommunikation in der Energiewirtschaft
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Navigation</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/wissen" className="hover:text-white">Wissensdatenbank</Link></li>
                  <li><Link href="/app" className="hover:text-white">Hauptanwendung</Link></li>
                  <li><Link href="/feed.xml" className="hover:text-white">RSS Feed</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Beliebte Themen</h4>
                <ul className="space-y-2 text-gray-400">
                  {popularTags.slice(0, 4).map((tag) => (
                    <li key={tag.tag}>
                      <Link href={`/wissen/thema/${tag.tag.toLowerCase()}`} className="hover:text-white">
                        {tag.tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">STROMDAO GmbH</h4>
                <p className="text-gray-400 text-sm">
                  © 2025 STROMDAO GmbH<br />
                  Alle Rechte vorbehalten
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [allFAQs, tags] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags()
    ]);

    // Sortiere FAQs nach View Count für Featured Section
    const featuredFAQs = allFAQs
      .sort((a: StaticFAQData, b: StaticFAQData) => b.view_count - a.view_count)
      .slice(0, 6);

    return {
      props: {
        featuredFAQs,
        popularTags: tags.slice(0, 20),
        totalFAQCount: allFAQs.length
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getStaticProps for homepage:', error);
    
    return {
      props: {
        featuredFAQs: [],
        popularTags: [],
        totalFAQCount: 0
      },
      revalidate: 60,
    };
  }
};
