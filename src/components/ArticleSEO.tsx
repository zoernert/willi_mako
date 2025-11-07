import Head from 'next/head';

interface ArticleSEOProps {
  title: string;
  description: string;
  canonical: string;
  publishedTime: string;
  modifiedTime?: string;
  tags?: string[];
  image?: string;
  author?: {
    name: string;
    url?: string;
  };
}

/**
 * SEO-Komponente für Artikel mit strukturierten Daten (JSON-LD),
 * Open Graph, Twitter Cards und erweiterten Meta-Tags
 */
export function ArticleSEO({
  title,
  description,
  canonical,
  publishedTime,
  modifiedTime,
  tags = [],
  image = 'https://stromhaltig.de/images/og-default.jpg',
  author = { name: 'Willi-Mako Team', url: 'https://stromhaltig.de' }
}: ArticleSEOProps) {
  const fullTitle = `${title} | Willi-Mako`;
  const fullUrl = `https://stromhaltig.de${canonical}`;

  // Schema.org Article structured data
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url
    },
    publisher: {
      '@type': 'Organization',
      name: 'Willi-Mako',
      logo: {
        '@type': 'ImageObject',
        url: 'https://stromhaltig.de/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl
    },
    keywords: tags.join(', ')
  };

  // BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://stromhaltig.de'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Artikel',
        item: 'https://stromhaltig.de/articles'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: fullUrl
      }
    ]
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={tags.join(', ')} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Willi-Mako" />
      <meta property="article:published_time" content={publishedTime} />
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      <meta property="article:author" content={author.name} />
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="de" />
      <meta name="author" content={author.name} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </Head>
  );
}
