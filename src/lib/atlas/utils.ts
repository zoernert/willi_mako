const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');

const MAX_SLUG_LENGTH = 120;

const hashString = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
};

const shortenSlug = (slug: string, reference: string) => {
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  const hash = hashString(reference).slice(0, 8);
  const prefixLength = Math.max(MAX_SLUG_LENGTH - hash.length - 1, 16);
  const trimmed = slug.slice(0, prefixLength).replace(/-+$/g, '');

  return `${trimmed}-${hash}`;
};

export const slugify = (value: string): string =>
  normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const createElementSlug = (edifactId: string, elementName?: string): string => {
  const base = slugify(edifactId.replace(/[:]/g, '-'));
  const namePart = elementName ? slugify(elementName) : '';
  const combined = [base, namePart].filter(Boolean).join('-');
  return shortenSlug(combined, `${edifactId}|${elementName ?? ''}`);
};

export const createProcessSlug = (processName: string): string =>
  shortenSlug(slugify(processName), processName);

export const createDiagramSlug = (diagramId: string): string =>
  shortenSlug(slugify(diagramId), diagramId);

export const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const sortAlpha = (values: string[]): string[] => [...values].sort((a, b) => a.localeCompare(b, 'de'));