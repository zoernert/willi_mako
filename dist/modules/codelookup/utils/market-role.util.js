"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMarketRoleRegex = exports.getMarketRoleVariants = exports.escapeRegex = void 0;
const ROLE_GROUPS = [
    ['VNB', 'Verteilnetzbetreiber', 'Netzbetreiber'],
    ['NB', 'Netzbetreiber', 'Verteilnetzbetreiber'],
    ['LF', 'Lieferant', 'Lieferanten'],
    ['MSB', 'Messstellenbetreiber'],
    ['UNB', 'ÜNB', 'Übertragungsnetzbetreiber', 'Uebertragungsnetzbetreiber', 'Ubertragungsnetzbetreiber'],
    ['BKV', 'Bilanzkreisverantwortlicher', 'Bilanzkreisverantwortliche'],
    ['BKO', 'Bilanzkoordinator', 'Bilanzkoordinatorin'],
    ['EIV', 'Einsatzverantwortlicher', 'Einsatzverantwortliche'],
    ['BTR', 'Betreiber einer technischen Ressource'],
];
const ROLE_LOOKUP = new Map();
const normalizeRoleValue = (value) => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
};
ROLE_GROUPS.forEach(group => {
    const uniqueGroup = Array.from(new Set(group.map(label => label.trim())));
    uniqueGroup.forEach(label => {
        const normalized = normalizeRoleValue(label);
        if (normalized) {
            ROLE_LOOKUP.set(normalized, uniqueGroup);
        }
    });
});
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.escapeRegex = escapeRegex;
const getMarketRoleVariants = (value) => {
    if (!value || typeof value !== 'string') {
        return [];
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    const normalized = normalizeRoleValue(trimmed);
    const synonyms = normalized ? ROLE_LOOKUP.get(normalized) : undefined;
    if (synonyms && synonyms.length > 0) {
        return Array.from(new Set([...synonyms, trimmed]));
    }
    return [trimmed];
};
exports.getMarketRoleVariants = getMarketRoleVariants;
const buildMarketRoleRegex = (value) => {
    const variants = (0, exports.getMarketRoleVariants)(value);
    if (variants.length === 0) {
        return null;
    }
    const pattern = variants.map(exports.escapeRegex).join('|');
    return new RegExp(pattern, 'i');
};
exports.buildMarketRoleRegex = buildMarketRoleRegex;
//# sourceMappingURL=market-role.util.js.map