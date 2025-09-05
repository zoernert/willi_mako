import fs from 'fs';
import path from 'path';
// Use require to avoid TS type declaration requirement for gray-matter
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter') as (input: string) => { data: any; content: string };

export type WhitepaperFrontmatter = {
  title: string;
  slug: string;
  description: string;
  publishedDate: string; // ISO date
  pdfPath: string; // public path like /whitepapers/.../file.pdf
  status?: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
};

export type Whitepaper = WhitepaperFrontmatter & {
  content: string; // markdown/mdx content body
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'whitepapers');

function isDir(p: string) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function getWhitepaperSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => isDir(path.join(CONTENT_DIR, name)));
}

export function getWhitepaperBySlug(slug: string): Whitepaper | null {
  const dir = path.join(CONTENT_DIR, slug);
  const file = path.join(dir, 'index.mdx');
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);

  // Basic validation and normalization
  const fm = data as Partial<WhitepaperFrontmatter>;
  if (!fm.title || !fm.slug) return null;

  const wp: any = {
    title: fm.title,
    slug: fm.slug,
    description: fm.description || '',
    publishedDate: fm.publishedDate || new Date().toISOString(),
    pdfPath: fm.pdfPath || '',
    status: (fm.status as 'draft' | 'published') || 'draft',
    content,
  };
  if (fm.seoTitle) wp.seoTitle = fm.seoTitle;
  if (fm.seoDescription) wp.seoDescription = fm.seoDescription;
  if (fm.canonicalUrl) wp.canonicalUrl = fm.canonicalUrl;
  return wp as any;
}

export function getAllWhitepapers(): Whitepaper[] {
  const slugs = getWhitepaperSlugs();
  const all = slugs
    .map((slug) => getWhitepaperBySlug(slug))
    .filter((w): w is Whitepaper => !!w);

  // Only published by default
  return all
    .filter((w) => (w.status || 'draft') === 'published')
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}
