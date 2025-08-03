import { GetServerSideProps } from 'next';
import { getAllPublicFAQs, getAllTags } from '../../lib/faq-api';
import { calculateSitemapPriority, calculateChangeFreq } from '../../lib/seo-utils';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const [faqs, tags] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags()
    ]);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://stromhaltig.de</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Wissensdatenbank Overview -->
  <url>
    <loc>https://stromhaltig.de/wissen</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Tag Pages -->
  ${tags.slice(0, 20).map(tag => `
  <url>
    <loc>https://stromhaltig.de/wissen/thema/${tag.tag.toLowerCase()}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}

  <!-- FAQ Pages -->
  ${faqs.map(faq => `
  <url>
    <loc>https://stromhaltig.de/wissen/${faq.slug}</loc>
    <lastmod>${faq.updated_at}</lastmod>
    <changefreq>${calculateChangeFreq(faq.view_count)}</changefreq>
    <priority>${calculateSitemapPriority(faq.view_count, faq.tags)}</priority>
  </url>`).join('')}

  <!-- RSS/Atom Feeds -->
  <url>
    <loc>https://stromhaltig.de/feed.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://stromhaltig.de/atom.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.statusCode = 500;
    res.write(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://stromhaltig.de</loc>
  </url>
</urlset>`);
    res.end();

    return {
      props: {},
    };
  }
};
