const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');

export const slugify = (value: string): string =>
  normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const createElementSlug = (edifactId: string, elementName?: string): string => {
  const base = slugify(edifactId.replace(/[:]/g, '-'));
  const namePart = elementName ? slugify(elementName) : '';
  return [base, namePart].filter(Boolean).join('-');
};

export const createProcessSlug = (processName: string): string => slugify(processName);

export const createDiagramSlug = (diagramId: string): string => slugify(diagramId);

export const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const sortAlpha = (values: string[]): string[] => [...values].sort((a, b) => a.localeCompare(b, 'de'));