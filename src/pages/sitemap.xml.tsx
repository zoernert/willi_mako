import { GetServerSideProps } from 'next';
import { getAllPublicFAQs, getAllTags } from '../../lib/faq-api';
import { loadDatasets } from '../../lib/datasets';
import { getAllWhitepapers } from '../../lib/content/whitepapers';
import { getAllArticles } from '../../lib/content/articles';
import { calculateSitemapPriority, calculateChangeFreq } from '../../lib/seo-utils';
import { parseManualSections, getManualMarkdown } from '../../lib/content/manual';
import { getAtlasDiagrams, getAtlasElements, getAtlasProcesses } from '../../lib/atlas/data';

// Hilfsfunktion zur sicheren Datumsformatierung für Sitemap
const formatDateForSitemap = (value: Date | string | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  try {
  const internalBase = process.env.INTERNAL_API_BASE_URL || '';
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  const origin = internalBase || `${protocol}://${host}`;
  const [faqs, tags, whitepapers, articles, submissions, publicThreads] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags(),
      Promise.resolve(getAllWhitepapers()),
      Promise.resolve(getAllArticles()),
      // Fetch published submissions for mitteilung-53 (extend if more slugs later)
  fetch(`${origin}/api/public/community/consultations/mitteilung-53/submissions?fast=1&t=${Date.now()}`).then(r => r.ok ? r.json() : { data: [] }).then(j => j.data || []).catch(() => []),
      // Fetch public community thread publications
      fetch(`${origin}/api/public/community/threads?t=${Date.now()}`).then(r => r.ok ? r.json() : { data: [] }).then(j => j.data || []).catch(() => []),
    ]);
  const datasets = loadDatasets();
  const manualSections = parseManualSections(getManualMarkdown());

    let atlasElements: ReturnType<typeof getAtlasElements> = [];
    let atlasProcesses: ReturnType<typeof getAtlasProcesses> = [];
    let atlasDiagrams: ReturnType<typeof getAtlasDiagrams> = [];

    try {
      atlasElements = getAtlasElements();
      atlasProcesses = getAtlasProcesses();
      atlasDiagrams = getAtlasDiagrams();
    } catch (atlasError) {
      console.warn('⚠️  Atlas data unavailable for sitemap:', atlasError instanceof Error ? atlasError.message : atlasError);
    }

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

  <!-- Daten Atlas Overview -->
  <url>
    <loc>https://stromhaltig.de/daten-atlas</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
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
    <priority>0.8</priority>
  </url>

  <!-- Benutzerhandbuch -->
  <url>
    <loc>https://stromhaltig.de/benutzerhandbuch</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Karriere -->
  <url>
    <loc>https://stromhaltig.de/karriere</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Training -->
  <url>
    <loc>https://stromhaltig.de/training</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>

  <!-- Benutzerhandbuch Kapitel -->
  ${manualSections.map(s => `
  <url>
    <loc>https://stromhaltig.de/benutzerhandbuch/${s.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}

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
    <lastmod>${formatDateForSitemap(faq.updated_at)}</lastmod>
    <changefreq>${calculateChangeFreq(faq.view_count)}</changefreq>
    <priority>${calculateSitemapPriority(faq.view_count, faq.tags)}</priority>
  </url>`).join('')}

  <!-- Daten Atlas Elemente -->
  ${atlasElements.map(element => `
  <url>
    <loc>https://stromhaltig.de/daten-atlas/datenelemente/${element.slug}</loc>
    <lastmod>${formatDateForSitemap(element.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}

  <!-- Daten Atlas Prozesse -->
  ${atlasProcesses.map(process => `
  <url>
    <loc>https://stromhaltig.de/daten-atlas/prozesse/${process.slug}</loc>
    <lastmod>${formatDateForSitemap(process.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}

  <!-- Daten Atlas Visualisierungen -->
  ${atlasDiagrams.map(diagram => `
  <url>
    <loc>https://stromhaltig.de/daten-atlas/visualisierungen/${diagram.slug}</loc>
    <lastmod>${formatDateForSitemap(diagram.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}

  <!-- Whitepaper Pages -->
  ${whitepapers.map(wp => `
  <url>
    <loc>https://stromhaltig.de/whitepaper/${wp.slug}</loc>
    <lastmod>${formatDateForSitemap(wp.publishedDate)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}

  <!-- Artikel Pages -->
  ${articles.map(a => {
    const lastmod = formatDateForSitemap((a as any).date || a.publishedDate);
    const priority = a.tags && a.tags.length > 3 ? 0.75 : 0.7; // Higher priority for comprehensive articles
    return `
  <url>
    <loc>https://stromhaltig.de/wissen/artikel/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('')}

  <!-- Dataset Pages -->
  ${datasets.map(d => {
    const url = d.url || '';
    const lastmod = formatDateForSitemap(d.dateModified || d.datePublished);
    return `\n  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
  }).join('')}

  <!-- Konsultation: Mitteilung 53 -->
  <url>
    <loc>https://stromhaltig.de/konsultation/mitteilung-53</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Community Threads (Öffentlich veröffentlichte Stände) -->
  ${publicThreads.map((t: any) => `
  <url>
    <loc>https://stromhaltig.de/community/public/${t.slug}</loc>
    <lastmod>${formatDateForSitemap(t.published_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}

  <!-- Eingereichte öffentliche Rückmeldungen (Mitteilung 53) -->
  ${submissions.map((s: any) => `
  <url>
    <loc>https://stromhaltig.de/konsultation/mitteilung-53/rueckmeldung/${s.id}</loc>
    <lastmod>${formatDateForSitemap(s.createdAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
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
  // Reflect new publications immediately; adjust if needed later
  res.setHeader('Cache-Control', 'no-store');
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
