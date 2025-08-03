import { GetServerSideProps } from 'next';
import { getLatestFAQs } from '../../lib/faq-api';
import { generateRSSItem } from '../../lib/seo-utils';

export default function RSSFeed() {
  // This component will never actually render
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const latestFAQs = await getLatestFAQs(20);
    
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Willi-Mako FAQ Updates - Energiewirtschaft Wissen</title>
    <description>Neueste FAQ-Beiträge zur Marktkommunikation in der Energiewirtschaft</description>
    <link>https://stromhaltig.de/wissen</link>
    <language>de</language>
    <managingEditor>info@stromhaltig.de (Willi-Mako Team)</managingEditor>
    <webMaster>info@stromhaltig.de (Willi-Mako Team)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Willi-Mako FAQ System</generator>
    <image>
      <url>https://stromhaltig.de/logo.png</url>
      <title>Willi-Mako</title>
      <link>https://stromhaltig.de</link>
    </image>
    <atom:link href="https://stromhaltig.de/feed.xml" rel="self" type="application/rss+xml" />
    ${latestFAQs.map(faq => generateRSSItem(faq)).join('\n')}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(rss);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.statusCode = 500;
    res.write(`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>RSS Feed Error</title>
    <description>Error generating RSS feed</description>
  </channel>
</rss>`);
    res.end();

    return {
      props: {},
    };
  }
};
