import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getAllPublicFAQs, getFAQBySlug, StaticFAQData } from '../../../lib/faq-api';
import { generateMetadata, generateFAQJSONLD, generateBreadcrumbJSONLD } from '../../../lib/seo-utils';

interface FAQDetailProps {
  faq: StaticFAQData;
}

export default function FAQDetail({ faq }: FAQDetailProps) {
  const metadata = generateMetadata(faq);
  const faqJSONLD = generateFAQJSONLD(faq);
  const breadcrumbJSONLD = generateBreadcrumbJSONLD(faq);

  return (
    <>
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <link rel="canonical" href={metadata.openGraph.url} />
        
        {/* Open Graph */}
        <meta property="og:title" content={metadata.openGraph.title} />
        <meta property="og:description" content={metadata.openGraph.description} />
        <meta property="og:type" content={metadata.openGraph.type} />
        <meta property="og:url" content={metadata.openGraph.url} />
        
        {/* Twitter */}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />

        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJSONLD) }}
        />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/wissen" className="hover:text-blue-600">
                Wissensdatenbank
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium" aria-current="page">
              {faq.title}
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <article className="bg-white">
          {/* Article Header */}
          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {faq.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/wissen/thema/${tag.toLowerCase()}`}
                  className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {faq.title}
            </h1>

            {faq.description && (
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                {faq.description}
              </p>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500 border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-4">
                <span>{faq.view_count} Aufrufe</span>
                <time dateTime={faq.updated_at}>
                  Zuletzt aktualisiert: {new Date(faq.updated_at).toLocaleDateString('de-DE')}
                </time>
              </div>
            </div>
          </header>

          {/* FAQ Content using semantic HTML */}
          <div className="prose prose-lg max-w-none">
            <dl className="faq-content">
              {faq.content && faq.content !== faq.answer && (
                <>
                  <dt className="text-lg font-semibold text-gray-900 mb-3">
                    Kontext:
                  </dt>
                  <dd className="mb-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {faq.content}
                  </dd>
                </>
              )}

              <dt className="text-lg font-semibold text-gray-900 mb-3">
                Antwort:
              </dt>
              <dd className="mb-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {faq.answer}
              </dd>

              {faq.additional_info && (
                <>
                  <dt className="text-lg font-semibold text-gray-900 mb-3">
                    Zusätzliche Informationen:
                  </dt>
                  <dd className="mb-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {faq.additional_info}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Related FAQs */}
          {faq.related_faqs && faq.related_faqs.length > 0 && (
            <aside className="mt-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Verwandte Themen
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {faq.related_faqs.map((relatedFAQ) => (
                  <Link
                    key={relatedFAQ.id}
                    href={`/wissen/${relatedFAQ.slug}`}
                    className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-gray-900 hover:text-blue-600">
                      {relatedFAQ.title}
                    </h3>
                    {relatedFAQ.similarity_score && (
                      <span className="text-xs text-gray-500 mt-1 block">
                        Ähnlichkeit: {Math.round(relatedFAQ.similarity_score * 100)}%
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </aside>
          )}

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-blue-50 rounded-lg text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Haben Sie weitere Fragen?
            </h2>
            <p className="text-gray-600 mb-4">
              Nutzen Sie unsere intelligente FAQ-Suche oder starten Sie einen Chat mit unserem Experten-System.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/wissen"
                className="inline-block bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                ← Zurück zur Übersicht
              </Link>
              <Link
                href="/app"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Zur Hauptanwendung →
              </Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const faqs = await getAllPublicFAQs();
    const paths = faqs.map((faq) => ({
      params: { slug: faq.slug },
    }));

    return {
      paths,
      fallback: 'blocking', // Enable ISR for new FAQs
    };
  } catch (error) {
    console.error('Error in getStaticPaths for FAQ pages:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    const faq = await getFAQBySlug(slug);

    if (!faq) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        faq,
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error(`Error in getStaticProps for FAQ slug ${params?.slug}:`, error);
    
    return {
      notFound: true,
    };
  }
};
