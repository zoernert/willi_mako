"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter');
const auth_1 = require("../../middleware/auth");
const errorHandler_1 = require("../../middleware/errorHandler");
const errors_1 = require("../../utils/errors");
const response_1 = require("../../utils/response");
const whitepapers_1 = require("../../lib/content/whitepapers");
const articles_1 = require("../../lib/content/articles");
const router = (0, express_1.Router)();
// Require auth and admin; the parent admin router already applies these, but keep auth here for safety if mounted elsewhere
router.use(auth_1.authenticateToken);
// Helpers
const CONTENT_ROOT = path_1.default.join(process.cwd(), 'content');
function ensureDir(p) {
    if (!fs_1.default.existsSync(p))
        fs_1.default.mkdirSync(p, { recursive: true });
}
function isProduction() {
    return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}
// GET /admin/content/whitepapers - list all whitepapers (incl. drafts)
router.get('/whitepapers', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const slugs = (0, whitepapers_1.getWhitepaperSlugs)();
    const list = slugs
        .map((slug) => (0, whitepapers_1.getWhitepaperBySlug)(slug))
        .filter((w) => !!w)
        .map((w) => ({ slug: w.slug, title: w.title, status: w.status || 'draft', publishedDate: w.publishedDate }));
    response_1.ResponseUtils.success(res, list);
}));
// GET /admin/content/articles - list all articles (incl. drafts)
router.get('/articles', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const slugs = (0, articles_1.getArticleSlugs)();
    const items = slugs
        .map((slug) => (0, articles_1.getArticleBySlug)(slug))
        .filter((a) => !!a)
        .map((a) => ({
        slug: a.slug,
        title: a.title,
        whitepaperSlug: a.whitepaperSlug || '',
        status: a.status || 'draft',
        publishedDate: a.publishedDate,
        shortDescription: a.shortDescription || ''
    }));
    response_1.ResponseUtils.success(res, items);
}));
// GET /admin/content/articles/:slug - load full article (frontmatter + content)
router.get('/articles/:slug', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { slug } = req.params;
    const art = (0, articles_1.getArticleBySlug)(slug);
    if (!art)
        throw new errors_1.AppError('Article not found', 404);
    response_1.ResponseUtils.success(res, art);
}));
// POST /admin/content/articles - create/update article file
router.post('/articles', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    // Basic validation
    if (!body.title || !body.slug)
        throw new errors_1.AppError('Missing title or slug', 400);
    if (!/^[a-z0-9-]+$/.test(body.slug))
        throw new errors_1.AppError('Invalid slug. Use lowercase letters, numbers, and hyphens only.', 400);
    if (body.whitepaperSlug && !/^[a-z0-9-]+$/.test(body.whitepaperSlug))
        throw new errors_1.AppError('Invalid whitepaperSlug', 400);
    // Compute file path
    let filePath;
    if (body.whitepaperSlug) {
        filePath = path_1.default.join(CONTENT_ROOT, 'whitepapers', body.whitepaperSlug, 'articles', `${body.slug}.mdx`);
        ensureDir(path_1.default.dirname(filePath));
    }
    else {
        filePath = path_1.default.join(CONTENT_ROOT, 'articles', body.slug, 'index.mdx');
        ensureDir(path_1.default.dirname(filePath));
    }
    // Compose frontmatter
    const frontmatterRaw = {
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
    const frontmatter = Object.fromEntries(Object.entries(frontmatterRaw).filter(([_, v]) => v !== undefined && v !== null));
    // Use gray-matter to stringify
    let fileContent;
    try {
        fileContent = matter.stringify(body.content || '', frontmatter);
    }
    catch (e) {
        // Map common js-yaml error into a 400 with context
        const msg = ((e === null || e === void 0 ? void 0 : e.message) || '').includes('unacceptable kind of an object')
            ? 'Ungültige Frontmatter: Bitte prüfen Sie leere/undefinierte Felder (SEO/Canoical) und versuchen Sie es erneut.'
            : `Fehler beim Serialisieren der Frontmatter: ${(e === null || e === void 0 ? void 0 : e.message) || 'unknown error'}`;
        throw new errors_1.AppError(msg, 400);
    }
    fs_1.default.writeFileSync(filePath, fileContent, 'utf8');
    // Optional git commit (dev only)
    if (body.commit && !isProduction()) {
        try {
            const { execSync } = require('child_process');
            const rel = path_1.default.relative(process.cwd(), filePath);
            execSync(`git add ${JSON.stringify(rel)} && git commit -m "content: update article ${body.slug}"`, { stdio: 'ignore' });
        }
        catch (e) {
            // Non-fatal
            console.warn('Git commit failed:', e.message);
        }
    }
    response_1.ResponseUtils.success(res, { filePath }, 'Article saved');
}));
exports.default = router;
//# sourceMappingURL=content.js.map