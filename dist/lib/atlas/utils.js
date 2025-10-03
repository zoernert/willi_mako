"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortAlpha = exports.unique = exports.createDiagramSlug = exports.createProcessSlug = exports.createElementSlug = exports.slugify = void 0;
const normalize = (value) => value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');
const slugify = (value) => normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
exports.slugify = slugify;
const createElementSlug = (edifactId, elementName) => {
    const base = (0, exports.slugify)(edifactId.replace(/[:]/g, '-'));
    const namePart = elementName ? (0, exports.slugify)(elementName) : '';
    return [base, namePart].filter(Boolean).join('-');
};
exports.createElementSlug = createElementSlug;
const createProcessSlug = (processName) => (0, exports.slugify)(processName);
exports.createProcessSlug = createProcessSlug;
const createDiagramSlug = (diagramId) => (0, exports.slugify)(diagramId);
exports.createDiagramSlug = createDiagramSlug;
const unique = (values) => Array.from(new Set(values));
exports.unique = unique;
const sortAlpha = (values) => [...values].sort((a, b) => a.localeCompare(b, 'de'));
exports.sortAlpha = sortAlpha;
//# sourceMappingURL=utils.js.map