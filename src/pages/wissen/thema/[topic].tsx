import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getAllFAQs, getDistinctTags, getFAQsByTag } from '../../../../lib/faq-api';

interface FAQ {
  id: string;
  title: string;
  description: string;
  slug: string;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface TopicPageProps {
  topic: string;
  faqs: FAQ[];
  totalCount: number;
  relatedTopics: string[];
}

export default function TopicPage({ topic, faqs, totalCount, relatedTopics }: TopicPageProps) {
  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  
  return (
    <>
      <Head>
        <title>{`${capitalizedTopic} - Willi-Mako Wissensdatenbank`}</title>
        <meta 
          name="description" 
          content={`${totalCount} FAQ-Beiträge zum Thema ${capitalizedTopic} in der Energiewirtschaft. Expertenwissen zur Marktkommunikation.`} 
        />
        <meta name="keywords" content={`${topic}, Energiewirtschaft, Marktkommunikation, FAQ, ${relatedTopics.join(', ')}`} />
        <link rel="canonical" href={`https://stromhaltig.de/wissen/thema/${topic}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${capitalizedTopic} - Willi-Mako Wissensdatenbank`} />
        <meta property="og:description" content={`${totalCount} FAQ-Beiträge zum Thema ${capitalizedTopic} in der Energiewirtschaft`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://stromhaltig.de/wissen/thema/${topic}`} />
        
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": `${capitalizedTopic} - FAQ Sammlung`,
              "description": `Umfassende FAQ-Sammlung zum Thema ${capitalizedTopic} in der Energiewirtschaft`,
              "url": `https://stromhaltig.de/wissen/thema/${topic}`,
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": totalCount,
                "itemListElement": faqs.map((faq, index) => ({
                  "@type": "ListItem",
                  "position": index + 1,
                  "item": {
                    "@type": "Question",
                    "name": faq.title,
                    "url": `https://stromhaltig.de/wissen/${faq.slug}`
                  }
                }))
              },
              "breadcrumb": {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Wissensdatenbank",
                    "item": "https://stromhaltig.de/wissen"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": capitalizedTopic,
                    "item": `https://stromhaltig.de/wissen/thema/${topic}`
                  }
                ]
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              <li>
                <Link href="/wissen" className="hover:text-blue-600 transition-colors">
                  Wissensdatenbank
                </Link>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-900 font-medium">{capitalizedTopic}</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {capitalizedTopic}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              {totalCount} FAQ-Beiträge zum Thema {capitalizedTopic} in der Energiewirtschaft
            </p>
            
            {/* Related Topics */}
            {relatedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Verwandte Themen:</span>
                {relatedTopics.slice(0, 5).map((relatedTopic) => (
                  <Link
                    key={relatedTopic}
                    href={`/wissen/thema/${relatedTopic.toLowerCase()}`}
                    className="inline-block px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {relatedTopic}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* FAQ List */}
          <main>
            {faqs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  Keine FAQs zum Thema "{capitalizedTopic}" gefunden.
                </p>
                <Link 
                  href="/wissen" 
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Zurück zur Übersicht
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {faqs.map((faq) => (
                  <article 
                    key={faq.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <header className="mb-3">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        <Link 
                          href={`/wissen/${faq.slug}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {faq.title}
                        </Link>
                      </h2>
                      <p className="text-gray-600 line-clamp-3">
                        {faq.description}
                      </p>
                    </header>
                    
                    <footer className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex flex-wrap gap-2">
                        {faq.tags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/wissen/thema/${tag.toLowerCase()}`}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4">
                        <span>{faq.view_count} Aufrufe</span>
                        <time dateTime={faq.updated_at}>
                          {new Date(faq.updated_at).toLocaleDateString('de-DE')}
                        </time>
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            )}

            {/* Back to Overview */}
            <div className="mt-12 text-center">
              <Link 
                href="/wissen" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Zurück zur Wissensdatenbank
              </Link>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const tags = await getDistinctTags();
    
    const paths = tags.map((tag: string) => ({
      params: { topic: tag.toLowerCase() }
    }));

    return {
      paths,
      fallback: 'blocking' // Enable ISR for new topics
    };
  } catch (error) {
    console.warn('Database not available during build, using fallback generation:', error);
    
    // If DB is not available during build, we provide some common paths
    // and rely on ISR for dynamic generation
    const commonTopics = ['edifact', 'marktkommunikation', 'energiemarkt', 'bdew', 'gpke', 'wim'];
    const fallbackPaths = commonTopics.map(topic => ({
      params: { topic }
    }));
    
    return {
      paths: fallbackPaths,
      fallback: 'blocking' // All other paths will be generated on-demand
    };
  }
};

export const getStaticProps: GetStaticProps<TopicPageProps> = async ({ params }) => {
  try {
    const topic = params?.topic as string;
    if (!topic) {
      return { notFound: true };
    }

    // Try to get FAQs for this specific topic
    // During build time, this might fail due to DB connection issues
    let faqs: FAQ[] = [];
    let allTags: string[] = [];
    
    try {
      faqs = await getFAQsByTag(topic);
      allTags = await getDistinctTags();
    } catch (dbError) {
      console.warn('Database not available during static generation, using empty data:', dbError);
      // During build time, we'll have empty data but the page will still be generated
      // At runtime, ISR will fetch the real data
    }

    // Filter out the current topic from related topics
    const relatedTopics = allTags
      .filter((tag: string) => tag.toLowerCase() !== topic.toLowerCase())
      .slice(0, 10); // Limit to 10 related topics

    return {
      props: {
        topic,
        faqs,
        totalCount: faqs.length,
        relatedTopics
      },
      revalidate: 3600 // Revalidate every hour to fetch real data if DB wasn't available at build time
    };
  } catch (error) {
    console.error('Error in getStaticProps for topic page:', error);
    
    // Even if there's an error, return a basic page structure
    return {
      props: {
        topic: params?.topic as string || '',
        faqs: [],
        totalCount: 0,
        relatedTopics: []
      },
      revalidate: 60 // Revalidate more frequently when there are errors
    };
  }
};
