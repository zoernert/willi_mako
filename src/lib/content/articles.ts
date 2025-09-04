import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter') as (input: string) => { data: any; content: string };

export type ArticleFrontmatter = {
  title: string;
  slug?: string; // may be inferred from path
  shortDescription?: string;
  whitepaperSlug?: string; // may be inferred from path when nested
  publishedDate?: string; // ISO date
  status?: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
};

export type Article = Required<Omit<ArticleFrontmatter, 'seoTitle' | 'seoDescription' | 'canonicalUrl'>> & {
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  content: string;
};

const FLAT_DIR = path.join(process.cwd(), 'content', 'articles');
const NESTED_WP_DIR = path.join(process.cwd(), 'content', 'whitepapers');

function isDir(p: string) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readFileSafe(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  } catch {}
  return null;
}

function parseArticleFromFile(filePath: string, inferred: { slug?: string; whitepaperSlug?: string } = {}): Article | null {
  const raw = readFileSafe(filePath);
  if (!raw) return null;
  const { data, content } = matter(raw);
  const fm = (data || {}) as Partial<ArticleFrontmatter>;
  const slug = (fm.slug || inferred.slug || '').trim();
  const whitepaperSlug = (fm.whitepaperSlug || inferred.whitepaperSlug || '').trim();
  const title = (fm.title || '').trim();
  if (!title) return null;
  const publishedDate = (fm.publishedDate || new Date().toISOString()).toString();
  const status = (fm.status as 'draft' | 'published') || 'draft';
  return {
    title,
    slug,
    shortDescription: fm.shortDescription || '',
    whitepaperSlug,
    publishedDate,
    status,
    seoTitle: fm.seoTitle,
    seoDescription: fm.seoDescription,
    canonicalUrl: fm.canonicalUrl,
    content,
  };
}

function collectFlatArticles(): Article[] {
  if (!fs.existsSync(FLAT_DIR)) return [];
  return fs
    .readdirSync(FLAT_DIR)
    .filter((name) => isDir(path.join(FLAT_DIR, name)))
    .map((slug) => parseArticleFromFile(path.join(FLAT_DIR, slug, 'index.mdx'), { slug }))
    .filter((a): a is Article => !!a);
}

function collectNestedArticles(): Article[] {
  if (!fs.existsSync(NESTED_WP_DIR)) return [];
  const result: Article[] = [];
  const wpSlugs = fs.readdirSync(NESTED_WP_DIR).filter((name) => isDir(path.join(NESTED_WP_DIR, name)));
  for (const wpSlug of wpSlugs) {
    const articlesDir = path.join(NESTED_WP_DIR, wpSlug, 'articles');
    if (!isDir(articlesDir)) continue;
    const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx'));
    for (const file of files) {
      const articleSlug = path.basename(file, '.mdx');
      const full = path.join(articlesDir, file);
      const a = parseArticleFromFile(full, { slug: articleSlug, whitepaperSlug: wpSlug });
      if (a) result.push(a);
    }
  }
  return result;
}

export function getArticleSlugs(): string[] {
  const flat = collectFlatArticles().map((a) => a.slug).filter(Boolean);
  const nested = collectNestedArticles().map((a) => a.slug).filter(Boolean);
  return Array.from(new Set([...flat, ...nested]));
}

export function getArticleBySlug(slug: string): Article | null {
  const flatPath = path.join(FLAT_DIR, slug, 'index.mdx');
  const flat = parseArticleFromFile(flatPath, { slug });
  if (flat) return flat;
  // search nested
  if (fs.existsSync(NESTED_WP_DIR)) {
    const wpSlugs = fs.readdirSync(NESTED_WP_DIR).filter((name) => isDir(path.join(NESTED_WP_DIR, name)));
    for (const wpSlug of wpSlugs) {
      const nestedFile = path.join(NESTED_WP_DIR, wpSlug, 'articles', `${slug}.mdx`);
      const art = parseArticleFromFile(nestedFile, { slug, whitepaperSlug: wpSlug });
      if (art) return art;
    }
  }
  return null;
}

export function getAllArticles(): Article[] {
  const combined = [...collectFlatArticles(), ...collectNestedArticles()];
  const deduped = new Map<string, Article>();
  for (const a of combined) {
    if (!a.slug) continue; // skip invalid
    if (!deduped.has(a.slug)) deduped.set(a.slug, a);
  }
  return Array.from(deduped.values())
    .filter((a) => (a.status || 'draft') === 'published')
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}

export function getArticlesByWhitepaperSlug(whitepaperSlug: string): Article[] {
  return getAllArticles().filter((a) => a.whitepaperSlug === whitepaperSlug);
}
