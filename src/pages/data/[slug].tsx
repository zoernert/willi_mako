import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getAllPublicFAQs, StaticFAQData } from '../../lib/faq-api';
import { findDatasetBySlug, getAllDatasetSlugs, loadTablesManifest, DatasetEntry, getSampleTableJsonPath, loadFirstTableData, TableData } from '../../lib/datasets';

interface DataDetailProps {
  slug: string;
  dataset: DatasetEntry | null;
  tablesCount: number;
  sampleTableJsonPath: string | null;
  sampleTable?: TableData | null;
  relatedFaqs?: Array<Pick<StaticFAQData, 'title' | 'slug' | 'description'>>;
  sampleTableCsvPath?: string | null;
}

export default function DataDetail({ slug, dataset, tablesCount, sampleTableJsonPath, sampleTable, relatedFaqs = [], sampleTableCsvPath = null }: DataDetailProps) {
  if (!dataset) {
    return (
      <Layout title="Datensatz nicht gefunden">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-2">Datensatz nicht gefunden</h1>
          <p className="text-gray-600 mb-4">Dieser Datensatz ist nicht verfügbar.</p>
          <Link className="text-blue-600" href="/data">Zur Übersicht</Link>
        </div>
      </Layout>
    );
  }

  const title = `${dataset.name} | Datenkatalog`; 
  const description = dataset.description || 'Codeliste als Datensatz mit strukturierten Tabellen und PDF-Download.';
  const url = dataset.url || `https://stromhaltig.de/data/${slug}`;
  const pdfUrl = dataset.distribution?.find((d) => (d.encodingFormat?.includes('pdf') || (d.contentUrl?.toLowerCase().endsWith('.pdf') ?? false)))?.contentUrl
    || dataset.distribution?.[0]?.contentUrl
    || undefined;

  // Embed exactly the Dataset entry as JSON-LD
  const datasetJSONLD = {
    '@context': 'https://schema.org',
    ...dataset,
  };

  return (
    <Layout title={dataset.name || 'Datensatz'}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <link rel="alternate" hrefLang="de" href={url} />
        <link rel="alternate" hrefLang="x-default" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
  {/* Twitter Card */}
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJSONLD) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://stromhaltig.de/' },
                { '@type': 'ListItem', position: 2, name: 'Daten', item: 'https://stromhaltig.de/data' },
                { '@type': 'ListItem', position: 3, name: dataset.name, item: url },
              ],
            }),
          }}
        />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/">Home</Link></li>
            <li>/</li>
            <li><Link href="/data">Daten</Link></li>
            <li>/</li>
            <li className="text-gray-900">{dataset.name}</li>
          </ol>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{dataset.name}</h1>
          {dataset.description && <p className="text-gray-700">{dataset.description}</p>}
          <p className="text-gray-500 mt-2">Tabellen erkannt: {tablesCount}</p>
        </header>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Downloads</h2>
          <ul className="list-disc list-inside">
            {pdfUrl && (
              <li>
                <a className="text-blue-600" href={pdfUrl} target="_blank" rel="noopener noreferrer">Original-PDF</a>
              </li>
            )}
            <li>
              <Link className="text-blue-600" href={`/data/${slug}/tables.json`}>Tables Manifest (JSON)</Link>
            </li>
            {tablesCount > 0 && sampleTableJsonPath && (
              <li>
                <Link className="text-blue-600" href={sampleTableJsonPath}>Beispiel-Tabelle (JSON)</Link>
              </li>
            )}
            {tablesCount > 0 && sampleTableCsvPath && (
              <li>
                <Link className="text-blue-600" href={sampleTableCsvPath}>Beispiel-Tabelle (CSV)</Link>
              </li>
            )}
          </ul>
          <p className="text-xs text-gray-500 mt-2">Hinweis: Für normative Zwecke gilt ausschließlich das PDF.</p>
        </section>

        {tablesCount > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Vorschau</h2>
            <p className="text-gray-600 mb-3">Eine kleine Vorschau ausgewählter Tabellen fördert die Indexierbarkeit. Vollständige Daten per Download.</p>
            {sampleTable && (
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {sampleTable.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-medium text-gray-700 border-b">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleTable.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 border-b text-gray-800">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {relatedFaqs.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Verwandte FAQs</h2>
            <ul className="list-disc list-inside space-y-1">
              {relatedFaqs.slice(0, 5).map((f) => (
                <li key={f.slug}>
                  <Link className="text-blue-600" href={`/wissen/${f.slug}`}>{f.title}</Link>
                  {f.description && (
                    <p className="text-gray-600 text-sm">{f.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllDatasetSlugs();
  const paths = slugs.map((slug) => ({ params: { slug } }));
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<DataDetailProps> = async ({ params }) => {
  const slug = params?.slug as string;
  if (!slug) return { notFound: true };

  const dataset = findDatasetBySlug(slug);
  const manifest = loadTablesManifest(slug);
  const tablesCount = manifest?.tablesCount || 0;
  const sampleTableJsonPath = manifest ? getSampleTableJsonPath(slug, manifest) : null;
  const sampleTable = loadFirstTableData(slug);
  const sampleTableCsvPath = (() => {
    if (!manifest || !manifest.tables?.length) return null;
    const first = manifest.tables[0];
    const rel = first.files?.csv || `${first.id}.csv`;
    return `/data/${slug}/${rel}`;
  })();

  // Compute related FAQs via simple token overlap
  let relatedFaqs: Array<Pick<StaticFAQData, 'title' | 'slug' | 'description'>> = [];
  try {
    const allFaqs = await getAllPublicFAQs();
    const hay = `${dataset?.name || ''} ${dataset?.description || ''} ${slug}`.toLowerCase();
    const tokens = Array.from(new Set(hay.split(/[^a-z0-9äöüß-]+/).filter(Boolean)));
    const scored = allFaqs.map((f) => {
      const t = `${f.title} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
      let s = 0;
      tokens.forEach((k) => { if (t.includes(k)) s += 1; });
      return { f, s };
    });
    relatedFaqs = scored
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(({ f }) => ({ title: f.title, slug: f.slug, description: f.description }));
  } catch {
    // ignore if DB not available
  }

  // If dataset exists but url is inconsistent, keep canonical as JSON-LD url; otherwise construct one.
  return {
    props: {
      slug,
      dataset,
      tablesCount,
  sampleTableJsonPath,
  sampleTable,
  relatedFaqs,
  sampleTableCsvPath,
    },
    revalidate: 3600,
  };
};
