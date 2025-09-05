import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter') as any;

import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { AppError } from '../../utils/errors';
import { ResponseUtils } from '../../utils/response';
import { getWhitepaperSlugs, getWhitepaperBySlug } from '../../lib/content/whitepapers';
import { getArticleSlugs, getArticleBySlug } from '../../lib/content/articles';

const router = Router();

// Require auth and admin; the parent admin router already applies these, but keep auth here for safety if mounted elsewhere
router.use(authenticateToken);

// Helpers
const CONTENT_ROOT = path.join(process.cwd(), 'content');

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function isProduction() {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

// GET /admin/content/whitepapers - list all whitepapers (incl. drafts)
router.get('/whitepapers', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const slugs = getWhitepaperSlugs();
  const list = slugs
    .map((slug) => getWhitepaperBySlug(slug))
    .filter((w): w is NonNullable<ReturnType<typeof getWhitepaperBySlug>> => !!w)
    .map((w) => ({ slug: w.slug, title: w.title, status: w.status || 'draft', publishedDate: w.publishedDate }));
  ResponseUtils.success(res, list);
}));

// GET /admin/content/articles - list all articles (incl. drafts)
router.get('/articles', asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const slugs = getArticleSlugs();
  const items = slugs
    .map((slug) => getArticleBySlug(slug))
    .filter((a): a is NonNullable<ReturnType<typeof getArticleBySlug>> => !!a)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      whitepaperSlug: a.whitepaperSlug || '',
      status: a.status || 'draft',
      publishedDate: a.publishedDate,
      shortDescription: a.shortDescription || ''
    }));
  ResponseUtils.success(res, items);
}));

// GET /admin/content/articles/:slug - load full article (frontmatter + content)
router.get('/articles/:slug', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { slug } = req.params;
  const art = getArticleBySlug(slug);
  if (!art) throw new AppError('Article not found', 404);

  ResponseUtils.success(res, art);
}));

type SaveArticleBody = {
  title: string;
  slug: string;
  whitepaperSlug?: string;
  shortDescription?: string;
  publishedDate?: string;
  status?: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  content: string;
  commit?: boolean;
};

// POST /admin/content/articles - create/update article file
router.post('/articles', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as SaveArticleBody;

  // Basic validation
  if (!body.title || !body.slug) throw new AppError('Missing title or slug', 400);
  if (!/^[a-z0-9-]+$/.test(body.slug)) throw new AppError('Invalid slug. Use lowercase letters, numbers, and hyphens only.', 400);
  if (body.whitepaperSlug && !/^[a-z0-9-]+$/.test(body.whitepaperSlug)) throw new AppError('Invalid whitepaperSlug', 400);

  // Compute file path
  let filePath: string;
  if (body.whitepaperSlug) {
    filePath = path.join(CONTENT_ROOT, 'whitepapers', body.whitepaperSlug, 'articles', `${body.slug}.mdx`);
    ensureDir(path.dirname(filePath));
  } else {
    filePath = path.join(CONTENT_ROOT, 'articles', body.slug, 'index.mdx');
    ensureDir(path.dirname(filePath));
  }

  // Compose frontmatter
  const frontmatterRaw: Record<string, any> = {
    title: body.title,
    slug: body.slug,
    // Only include optional fields if they are non-empty strings
    ...(body.shortDescription ? { shortDescription: body.shortDescription } : {}),
    ...(body.whitepaperSlug ? { whitepaperSlug: body.whitepaperSlug } : {}),
    publishedDate: body.publishedDate || new Date().toISOString(),
    status: body.status || 'draft',
    ...(body.seoTitle ? { seoTitle: body.seoTitle } : {}),
    ...(body.seoDescription ? { seoDescription: body.seoDescription } : {}),
    ...(body.canonicalUrl ? { canonicalUrl: body.canonicalUrl } : {}),
  };

  // Remove any keys with undefined/null just in case
  const frontmatter: Record<string, any> = Object.fromEntries(
    Object.entries(frontmatterRaw).filter(([_, v]) => v !== undefined && v !== null)
  );

  // Use gray-matter to stringify
  let fileContent: string;
  try {
    fileContent = matter.stringify(body.content || '', frontmatter);
  } catch (e: any) {
    // Map common js-yaml error into a 400 with context
    const msg = (e?.message || '').includes('unacceptable kind of an object')
      ? 'Ungültige Frontmatter: Bitte prüfen Sie leere/undefinierte Felder (SEO/Canoical) und versuchen Sie es erneut.'
      : `Fehler beim Serialisieren der Frontmatter: ${e?.message || 'unknown error'}`;
    throw new AppError(msg, 400);
  }
  fs.writeFileSync(filePath, fileContent, 'utf8');

  // Optional git commit (dev only)
  if (body.commit && !isProduction()) {
    try {
      const { execSync } = require('child_process');
      const rel = path.relative(process.cwd(), filePath);
      execSync(`git add ${JSON.stringify(rel)} && git commit -m "content: update article ${body.slug}"`, { stdio: 'ignore' });
    } catch (e) {
      // Non-fatal
      console.warn('Git commit failed:', (e as Error).message);
    }
  }

  ResponseUtils.success(res, { filePath }, 'Article saved');
}));

export default router;
