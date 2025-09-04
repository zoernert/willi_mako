"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhitepaperSlugs = getWhitepaperSlugs;
exports.getWhitepaperBySlug = getWhitepaperBySlug;
exports.getAllWhitepapers = getAllWhitepapers;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Use require to avoid TS type declaration requirement for gray-matter
// eslint-disable-next-line @typescript-eslint/no-var-requires
const matter = require('gray-matter');
const CONTENT_DIR = path_1.default.join(process.cwd(), 'content', 'whitepapers');
function isDir(p) {
    try {
        return fs_1.default.statSync(p).isDirectory();
    }
    catch (_a) {
        return false;
    }
}
function getWhitepaperSlugs() {
    if (!fs_1.default.existsSync(CONTENT_DIR))
        return [];
    return fs_1.default
        .readdirSync(CONTENT_DIR)
        .filter((name) => isDir(path_1.default.join(CONTENT_DIR, name)));
}
function getWhitepaperBySlug(slug) {
    const dir = path_1.default.join(CONTENT_DIR, slug);
    const file = path_1.default.join(dir, 'index.mdx');
    if (!fs_1.default.existsSync(file))
        return null;
    const raw = fs_1.default.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    // Basic validation and normalization
    const fm = data;
    if (!fm.title || !fm.slug)
        return null;
    return {
        title: fm.title,
        slug: fm.slug,
        description: fm.description || '',
        publishedDate: fm.publishedDate || new Date().toISOString(),
        pdfPath: fm.pdfPath || '',
        status: fm.status || 'draft',
        seoTitle: fm.seoTitle,
        seoDescription: fm.seoDescription,
        canonicalUrl: fm.canonicalUrl,
        content,
    };
}
function getAllWhitepapers() {
    const slugs = getWhitepaperSlugs();
    const all = slugs
        .map((slug) => getWhitepaperBySlug(slug))
        .filter((w) => !!w);
    // Only published by default
    return all
        .filter((w) => (w.status || 'draft') === 'published')
        .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}
//# sourceMappingURL=whitepapers.js.map