import { GetServerSideProps } from 'next';
import { getAllPublicFAQs, getAllTags } from '../../lib/faq-api';
import { loadDatasets } from '../../lib/datasets';
import { getAllWhitepapers } from '../../lib/content/whitepapers';
import { getAllArticles } from '../../lib/content/articles';
import { calculateSitemapPriority, calculateChangeFreq } from '../../lib/seo-utils';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
  const [faqs, tags, whitepapers, articles] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags(),
      Promise.resolve(getAllWhitepapers()),
      Promise.resolve(getAllArticles()),
    ]);
  const datasets = loadDatasets();

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

  <!-- Whitepaper Overview -->
  <url>
    <loc>https://stromhaltig.de/whitepaper</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Artikel Overview -->
  <url>
    <loc>https://stromhaltig.de/wissen/artikel</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Tag Pages -->
  ${tags.slice(0, 20).map(tag => `
  <url>
    <loc>https://stromhaltig.de/wissen/thema/${tag.tag.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')}</loc>
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

  <!-- Whitepaper Pages -->
  ${whitepapers.map(wp => `
  <url>
    <loc>https://stromhaltig.de/whitepaper/${wp.slug}</loc>
    <lastmod>${wp.publishedDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}

  <!-- Artikel Pages -->
  ${articles.map(a => `
  <url>
    <loc>https://stromhaltig.de/wissen/artikel/${a.slug}</loc>
    <lastmod>${a.publishedDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}

  <!-- Dataset Pages -->
  ${datasets.map(d => {
    const url = d.url || '';
    const lastmod = d.dateModified || d.datePublished || new Date().toISOString();
    return `\n  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
  }).join('')}

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
