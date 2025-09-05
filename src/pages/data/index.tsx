import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { loadDatasets, DatasetEntry } from '../../lib/datasets';

interface DataIndexProps {
  items: Array<Pick<DatasetEntry, 'name' | 'description' | 'url'>>;
}

export default function DataIndex({ items }: DataIndexProps) {
  const title = 'Datenkatalog – Codelisten & Tabellen | Willi-Mako';
  const description = 'Offene Datensätze zur Marktkommunikation in der Energiewirtschaft: Codelisten mit strukturierten Tabellen (JSON/CSV) und Original-PDFs.';
  const pageUrl = 'https://stromhaltig.de/data';

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: d.url,
      name: d.name,
      description: d.description,
    })),
  };

  const catalog = {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Willi-Mako Datenkatalog',
    description,
    url: pageUrl,
    dataset: items.map((d) => ({ '@type': 'Dataset', name: d.name, description: d.description, url: d.url })),
  };

  return (
    <Layout title="Datenkatalog">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="de" href={pageUrl} />
        <link rel="alternate" hrefLang="x-default" href={pageUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(catalog) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://stromhaltig.de/' },
                { '@type': 'ListItem', position: 2, name: 'Daten', item: pageUrl },
              ],
            }),
          }}
        />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Datenkatalog</h1>
          <p className="text-gray-600">Codelisten mit strukturierten Tabellen (JSON/CSV) und Original-PDFs.</p>
        </header>

        <ul className="space-y-4">
          {items.map((d) => (
            <li key={d.url} className="border rounded p-4 hover:shadow-sm">
              <h2 className="text-xl font-semibold mb-1">
                <Link href={d.url!.replace('https://stromhaltig.de', '')}>{d.name}</Link>
              </h2>
              {d.description && <p className="text-gray-600">{d.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<DataIndexProps> = async () => {
  const ds = loadDatasets();
  // Only keep essentials for the list
  const items = ds.map((d) => ({ name: d.name, description: d.description, url: d.url }));
  return {
    props: { items },
    revalidate: 3600,
  };
};
