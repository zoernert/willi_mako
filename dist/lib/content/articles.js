"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArticleSlugs = getArticleSlugs;
exports.getArticleBySlug = getArticleBySlug;
exports.getAllArticles = getAllArticles;
exports.getArticlesByWhitepaperSlug = getArticlesByWhitepaperSlug;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter');
const FLAT_DIR = path_1.default.join(process.cwd(), 'content', 'articles');
const NESTED_WP_DIR = path_1.default.join(process.cwd(), 'content', 'whitepapers');
function isDir(p) {
    try {
        return fs_1.default.statSync(p).isDirectory();
    }
    catch (_a) {
        return false;
    }
}
function readFileSafe(filePath) {
    try {
        if (fs_1.default.existsSync(filePath))
            return fs_1.default.readFileSync(filePath, 'utf8');
    }
    catch (_a) { }
    return null;
}
function parseArticleFromFile(filePath, inferred = {}) {
    const raw = readFileSafe(filePath);
    if (!raw)
        return null;
    const { data, content } = matter(raw);
    const fm = (data || {});
    const slug = (fm.slug || inferred.slug || '').trim();
    const whitepaperSlug = (fm.whitepaperSlug || inferred.whitepaperSlug || '').trim();
    const title = (fm.title || '').trim();
    if (!title)
        return null;
    const publishedDate = (fm.publishedDate || new Date().toISOString()).toString();
    const status = fm.status || 'draft';
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
function collectFlatArticles() {
    if (!fs_1.default.existsSync(FLAT_DIR))
        return [];
    return fs_1.default
        .readdirSync(FLAT_DIR)
        .filter((name) => isDir(path_1.default.join(FLAT_DIR, name)))
        .map((slug) => parseArticleFromFile(path_1.default.join(FLAT_DIR, slug, 'index.mdx'), { slug }))
        .filter((a) => !!a);
}
function collectNestedArticles() {
    if (!fs_1.default.existsSync(NESTED_WP_DIR))
        return [];
    const result = [];
    const wpSlugs = fs_1.default.readdirSync(NESTED_WP_DIR).filter((name) => isDir(path_1.default.join(NESTED_WP_DIR, name)));
    for (const wpSlug of wpSlugs) {
        const articlesDir = path_1.default.join(NESTED_WP_DIR, wpSlug, 'articles');
        if (!isDir(articlesDir))
            continue;
        const files = fs_1.default.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx'));
        for (const file of files) {
            const articleSlug = path_1.default.basename(file, '.mdx');
            const full = path_1.default.join(articlesDir, file);
            const a = parseArticleFromFile(full, { slug: articleSlug, whitepaperSlug: wpSlug });
            if (a)
                result.push(a);
        }
    }
    return result;
}
function getArticleSlugs() {
    const flat = collectFlatArticles().map((a) => a.slug).filter(Boolean);
    const nested = collectNestedArticles().map((a) => a.slug).filter(Boolean);
    return Array.from(new Set([...flat, ...nested]));
}
function getArticleBySlug(slug) {
    const flatPath = path_1.default.join(FLAT_DIR, slug, 'index.mdx');
    const flat = parseArticleFromFile(flatPath, { slug });
    if (flat)
        return flat;
    // search nested
    if (fs_1.default.existsSync(NESTED_WP_DIR)) {
        const wpSlugs = fs_1.default.readdirSync(NESTED_WP_DIR).filter((name) => isDir(path_1.default.join(NESTED_WP_DIR, name)));
        for (const wpSlug of wpSlugs) {
            const nestedFile = path_1.default.join(NESTED_WP_DIR, wpSlug, 'articles', `${slug}.mdx`);
            const art = parseArticleFromFile(nestedFile, { slug, whitepaperSlug: wpSlug });
            if (art)
                return art;
        }
    }
    return null;
}
function getAllArticles() {
    const combined = [...collectFlatArticles(), ...collectNestedArticles()];
    const deduped = new Map();
    for (const a of combined) {
        if (!a.slug)
            continue; // skip invalid
        if (!deduped.has(a.slug))
            deduped.set(a.slug, a);
    }
    return Array.from(deduped.values())
        .filter((a) => (a.status || 'draft') === 'published')
        .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}
function getArticlesByWhitepaperSlug(whitepaperSlug) {
    return getAllArticles().filter((a) => a.whitepaperSlug === whitepaperSlug);
}
//# sourceMappingURL=articles.js.map