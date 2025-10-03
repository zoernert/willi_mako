"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAtlasCache = exports.getAtlasDiagramById = exports.getAtlasDiagramBySlug = exports.getAtlasProcessBySlug = exports.getAtlasElementBySlug = exports.getAtlasDiagrams = exports.getAtlasProcesses = exports.getAtlasElements = exports.loadAtlasSearchIndex = exports.loadAtlasData = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const atlasDataFile = node_path_1.default.join(process.cwd(), 'public', 'atlas', 'atlas-data.json');
const atlasSearchFile = node_path_1.default.join(process.cwd(), 'public', 'atlas', 'search-index.json');
let atlasCache = null;
let atlasSearchCache = null;
const readJson = (filePath) => {
    const data = node_fs_1.default.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
};
const loadAtlasData = () => {
    if (atlasCache) {
        return atlasCache;
    }
    if (!node_fs_1.default.existsSync(atlasDataFile)) {
        throw new Error(`Atlas dataset not found. Expected: ${atlasDataFile}. Run \"npm run atlas:build\" first.`);
    }
    atlasCache = readJson(atlasDataFile);
    return atlasCache;
};
exports.loadAtlasData = loadAtlasData;
const loadAtlasSearchIndex = () => {
    if (atlasSearchCache) {
        return atlasSearchCache;
    }
    if (!node_fs_1.default.existsSync(atlasSearchFile)) {
        throw new Error(`Atlas search index missing. Expected: ${atlasSearchFile}. Run \"npm run atlas:build\" first.`);
    }
    atlasSearchCache = readJson(atlasSearchFile);
    return atlasSearchCache;
};
exports.loadAtlasSearchIndex = loadAtlasSearchIndex;
const getAtlasElements = () => (0, exports.loadAtlasData)().elements;
exports.getAtlasElements = getAtlasElements;
const getAtlasProcesses = () => (0, exports.loadAtlasData)().processes;
exports.getAtlasProcesses = getAtlasProcesses;
const getAtlasDiagrams = () => (0, exports.loadAtlasData)().diagrams;
exports.getAtlasDiagrams = getAtlasDiagrams;
const getAtlasElementBySlug = (slug) => (0, exports.getAtlasElements)().find((element) => element.slug === slug);
exports.getAtlasElementBySlug = getAtlasElementBySlug;
const getAtlasProcessBySlug = (slug) => (0, exports.getAtlasProcesses)().find((process) => process.slug === slug);
exports.getAtlasProcessBySlug = getAtlasProcessBySlug;
const getAtlasDiagramBySlug = (slug) => (0, exports.getAtlasDiagrams)().find((diagram) => diagram.slug === slug);
exports.getAtlasDiagramBySlug = getAtlasDiagramBySlug;
const getAtlasDiagramById = (id) => (0, exports.getAtlasDiagrams)().find((diagram) => diagram.id === id);
exports.getAtlasDiagramById = getAtlasDiagramById;
const resetAtlasCache = () => {
    atlasCache = null;
    atlasSearchCache = null;
};
exports.resetAtlasCache = resetAtlasCache;
//# sourceMappingURL=data.js.map