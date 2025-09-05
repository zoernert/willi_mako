"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDatasets = loadDatasets;
exports.getAllDatasetSlugs = getAllDatasetSlugs;
exports.findDatasetBySlug = findDatasetBySlug;
exports.loadTablesManifest = loadTablesManifest;
exports.getSampleTableJsonPath = getSampleTableJsonPath;
exports.loadFirstTableData = loadFirstTableData;
exports.suggestDatasetsByKeywords = suggestDatasetsByKeywords;
exports.suggestDatasetsFromText = suggestDatasetsFromText;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const datasetsRoot = path_1.default.join(process.cwd(), 'public', 'datasets');
const datasetsJsonPath = path_1.default.join(datasetsRoot, 'datasets.jsonld');
const datasetsDataDir = path_1.default.join(datasetsRoot, 'data');
function readJSON(file) {
    try {
        const raw = fs_1.default.readFileSync(file, 'utf8');
        return JSON.parse(raw);
    }
    catch (_a) {
        return null;
    }
}
function loadDatasets() {
    const graph = readJSON(datasetsJsonPath);
    if (graph && Array.isArray(graph['@graph'])) {
        return graph['@graph'];
    }
    return [];
}
function getAllDatasetSlugs() {
    // Prefer slugs from URLs in JSON-LD
    const ds = loadDatasets();
    const fromUrls = ds
        .map((d) => d.url || '')
        .filter(Boolean)
        .map((u) => {
        try {
            const urlObj = new URL(u);
            const parts = urlObj.pathname.replace(/\/$/, '').split('/');
            return parts[parts.length - 1];
        }
        catch (_a) {
            return '';
        }
    })
        .filter(Boolean);
    // Fallback: directory listing under public/datasets/data
    let fromDirs = [];
    try {
        fromDirs = fs_1.default
            .readdirSync(datasetsDataDir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);
    }
    catch (_a) {
        // ignore
    }
    return Array.from(new Set([...fromUrls, ...fromDirs]));
}
function findDatasetBySlug(slug) {
    const ds = loadDatasets();
    // Match by URL ending in /data/<slug>
    const match = ds.find((d) => {
        if (!d.url)
            return false;
        try {
            const u = new URL(d.url);
            const pathname = u.pathname.replace(/\/$/, '');
            return pathname.endsWith(`/data/${slug}`);
        }
        catch (_a) {
            return false;
        }
    });
    return match || null;
}
function loadTablesManifest(slug) {
    const file = path_1.default.join(datasetsDataDir, slug, 'tables.json');
    return readJSON(file);
}
function getSampleTableJsonPath(slug, manifest) {
    var _a;
    if (!manifest || !Array.isArray(manifest.tables) || manifest.tables.length === 0)
        return null;
    const first = manifest.tables[0];
    const rel = ((_a = first.files) === null || _a === void 0 ? void 0 : _a.json) || `${first.id}.json`;
    // Serve path under public via our /data rewrite: /data/<slug>/<file>
    return `/data/${slug}/${rel}`;
}
function loadFirstTableData(slug) {
    var _a, _b;
    const manifest = loadTablesManifest(slug);
    if (!manifest || !((_a = manifest.tables) === null || _a === void 0 ? void 0 : _a.length))
        return null;
    const first = manifest.tables[0];
    const jsonRel = ((_b = first.files) === null || _b === void 0 ? void 0 : _b.json) || `${first.id}.json`;
    const file = path_1.default.join(datasetsDataDir, slug, jsonRel);
    const data = readJSON(file);
    if (!data || !Array.isArray(data.headers) || !Array.isArray(data.rows))
        return null;
    return data;
}
function tokenize(input) {
    return (input || '')
        .toLowerCase()
        .replace(/[^a-z0-9äöüß\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}
function suggestDatasetsByKeywords(keywords, limit = 5) {
    const ds = loadDatasets();
    if (!ds.length || !keywords.length)
        return [];
    const keys = Array.from(new Set(keywords.map((k) => k.toLowerCase())));
    const scored = ds.map((d) => {
        const hay = `${d.name || ''} ${d.description || ''} ${d.url || ''}`.toLowerCase();
        let score = 0;
        keys.forEach((k) => {
            if (hay.includes(k))
                score += 2;
        });
        // small bonus for exact hyphenated slug hits
        const slug = (() => {
            try {
                const u = new URL(d.url || '');
                const parts = u.pathname.replace(/\/$/, '').split('/');
                return parts[parts.length - 1];
            }
            catch (_a) {
                return '';
            }
        })();
        keys.forEach((k) => { if (slug.includes(k))
            score += 1; });
        return { d, score };
    });
    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.d);
}
function suggestDatasetsFromText(text, extraKeywords = [], limit = 5) {
    const tokens = tokenize(text);
    const top = Array.from(new Set([...extraKeywords, ...tokens])).slice(0, 20);
    return suggestDatasetsByKeywords(top, limit);
}
//# sourceMappingURL=datasets.js.map