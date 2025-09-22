"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManualMarkdown = getManualMarkdown;
exports.parseManualSections = parseManualSections;
exports.getManualSectionBySlug = getManualSectionBySlug;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MANUAL_PATH = path_1.default.join(process.cwd(), 'docs', 'benutzerhandbuch.md');
function getManualMarkdown() {
    if (!fs_1.default.existsSync(MANUAL_PATH))
        return '# Benutzerhandbuch';
    return fs_1.default.readFileSync(MANUAL_PATH, 'utf8');
}
function slugify(input) {
    return input
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s\-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function parseManualSections(markdown) {
    const md = markdown !== null && markdown !== void 0 ? markdown : getManualMarkdown();
    const lines = md.split(/\r?\n/);
    const sections = [];
    let current = null;
    const headingRe = /^(#{2,3})\s+(.+?)\s*$/; // ## or ###
    for (const line of lines) {
        const m = line.match(headingRe);
        if (m) {
            if (current)
                sections.push({ ...current, content: current.content.trim() });
            const level = m[1].length;
            const title = m[2].trim();
            const slug = slugify(title);
            current = { slug, title, level, content: '' };
        }
        else if (current) {
            current.content += (current.content ? '\n' : '') + line;
        }
    }
    if (current)
        sections.push({ ...current, content: current.content.trim() });
    // Filter to top-level chapters only (##)
    return sections.filter((s) => s.level === 2);
}
function getManualSectionBySlug(slug) {
    const sections = parseManualSections();
    return sections.find((s) => s.slug === slug) || null;
}
//# sourceMappingURL=manual.js.map