import Head from 'next/head';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  url: string;
  type?: 'website' | 'article';
  image?: string;
  noindex?: boolean;
}

export default function SEOHead({ 
  title, 
  description, 
  keywords, 
  url, 
  type = 'article',
  image,
  noindex = false 
}: SEOHeadProps) {
  const siteName = 'Willi-Mako';
  const defaultImage = 'https://stromhaltig.de/logo.png'; // Fallback image

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
  {/* Hreflang alternates (single-language site) */}
  <link rel="alternate" hrefLang="de" href={url} />
  <link rel="alternate" hrefLang="x-default" href={url} />
      
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={image || defaultImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />
      
      {/* Additional meta for better crawling */}
      <meta name="author" content="Willi-Mako Expertensystem" />
      <meta name="publisher" content="STROMDAO GmbH" />
      <meta name="language" content="de" />
      <meta name="content-language" content="de" />
      
  {/* Favicon and app icons */}
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
    </Head>
  );
}
