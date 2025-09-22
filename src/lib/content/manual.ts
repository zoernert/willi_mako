import fs from 'fs';
import path from 'path';

export type ManualSection = {
  slug: string;
  title: string;
  level: number;
  content: string;
};

const MANUAL_PATH = path.join(process.cwd(), 'docs', 'benutzerhandbuch.md');

export function getManualMarkdown(): string {
  if (!fs.existsSync(MANUAL_PATH)) return '# Benutzerhandbuch';
  return fs.readFileSync(MANUAL_PATH, 'utf8');
}

function slugify(input: string): string {
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

export function parseManualSections(markdown?: string): ManualSection[] {
  const md = markdown ?? getManualMarkdown();
  const lines = md.split(/\r?\n/);
  const sections: ManualSection[] = [];
  let current: ManualSection | null = null;
  const headingRe = /^(#{2,3})\s+(.+?)\s*$/; // ## or ###

  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      if (current) sections.push({ ...current, content: current.content.trim() });
      const level = m[1].length;
      const title = m[2].trim();
      const slug = slugify(title);
      current = { slug, title, level, content: '' };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  if (current) sections.push({ ...current, content: current.content.trim() });

  // Filter to top-level chapters only (##)
  return sections.filter((s) => s.level === 2);
}

export function getManualSectionBySlug(slug: string): ManualSection | null {
  const sections = parseManualSections();
  return sections.find((s) => s.slug === slug) || null;
}
