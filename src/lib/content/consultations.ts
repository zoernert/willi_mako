import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export interface ConsultationSection {
  key: string;
  title: string;
  markdown: string;
  html: string;
}

export interface ConsultationPayload {
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'final';
  updated_at: string;
  tags: string[];
  executiveSummary?: string;
  sections: ConsultationSection[];
  downloads?: { pdf?: string; docx?: string };
}

const CONFIG_FILE = path.join(process.cwd(), 'content', 'consultations.config.json');
const DEFAULT_MD_SOURCE = path.join(process.cwd(), 'docs', 'konsultation.md');

type ConsultationConfig = Record<string, { md: string; repo?: string; title?: string; tags?: string[] }>;

function loadConfig(): ConsultationConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as ConsultationConfig;
  } catch (e) {
    console.error('Failed to read consultations.config.json:', e);
    return {};
  }
}

function renderMarkdownToHtml(md: string): string {
  // Replace custom citation markers:
  // - [cite_start] / [cite_end] → historical markers; strip to avoid artifacts in output
  // - [cite: N] → <sup class="citation">(N)</sup>
  // - [cite: Label|URL] → <sup class="citation"><a href="URL">Label</a></sup>
  let normalized = md
    // plain underscore variants
    .replace(/\[cite_start\]/gi, '')
    .replace(/\[cite_end\]/gi, '')
    // escaped underscore variants as seen in some markdown exports
    .replace(/\[cite\\_start\]/gi, '')
    .replace(/\[cite\\_end\]/gi, '')
    .replace(/\[cite:\s*([0-9,\s]+)\]/gi, (_m, p1) => ` <sup class=\"citation\">(${String(p1).trim()})</sup>`);
  normalized = normalized.replace(/\[cite:\s*([^\]]+)\]/gi, (_m, inner) => {
    const parts = String(inner).split('|').map((s) => s.trim());
    let label = 'Quelle';
    let href = '';
    if (parts.length === 1) {
      if (/^https?:\/\//i.test(parts[0])) { href = parts[0]; }
      else { label = parts[0]; }
    } else {
      label = parts[0] || label;
      href = parts[1] || '';
    }
    if (!href && /^https?:\/\//i.test(label)) { href = label; label = 'Quelle'; }
    return href
      ? `<sup class=\"citation\"><a href=\"${href}\" target=\"_blank\" rel=\"noopener noreferrer\">${label}</a></sup>`
      : `<sup class=\"citation\">${label}</sup>`;
  });

  const element = React.createElement(ReactMarkdown as any, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeRaw],
  children: normalized,
  });
  return ReactDOMServer.renderToStaticMarkup(element);
}

function splitByHeadings(md: string): Array<{ level: number; title: string; content: string }>{
  const lines = md.split(/\r?\n/);
  const sections: Array<{ level: number; title: string; content: string }> = [];
  let current: { level: number; title: string; content: string } | null = null;
  const headingRegex = /^(#{2,4})\s+(.*)$/; // ##, ###, ####

  for (const line of lines) {
    const m = line.match(headingRegex);
    if (m) {
      if (current) sections.push(current);
      const level = m[1].length;
      const title = m[2].trim();
      current = { level, title, content: '' };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  return sections;
}

// Map German chapter titles to keys
function mapTitleToKey(title: string): string {
  const t = title.toLowerCase();
  const map: Array<{ re: RegExp; key: string }> = [
    { re: /^1\s+warum/, key: 'ch1' },
    { re: /^2\s+einleitung/, key: 'ch2' },
    { re: /^3\s+veröffentlichung auf github/, key: 'ch3' },
    { re: /^3\.1\s+versionierung/, key: 'ch3_1' },
    { re: /^3\.2\s+änderungsmanagement/, key: 'ch3_2' },
    { re: /^3\.3\s+änderungshistorie/, key: 'ch3_3' },
    { re: /^3\.3\.1\s+änderungshistorie eines repository/, key: 'ch3_3_1' },
    { re: /^3\.3\.2\s+änderungshistorie eines api-webdienstes/, key: 'ch3_3_2' },
    { re: /^4\s+umgang/, key: 'ch4' },
    { re: /^5\s+fehler/, key: 'ch5' },
    { re: /^6\s+aufbau der api-webdienste/, key: 'ch6' },
    { re: /^6\.1\s+aufbau von api-webdiensten/, key: 'ch6_1' },
    { re: /^6\.2\s+namenskonventionen der api-webdienste/, key: 'ch6_2' },
    { re: /^6\.3\s+namenskonventionen der yaml-dateien der api-webdienste/, key: 'ch6_3' },
    { re: /^6\.4\s+namenskonventionen der schemas/, key: 'ch6_4' },
    { re: /^6\.5\s+namenskonventionen der yaml-dateien der schemas/, key: 'ch6_5' },
    { re: /^6\.6\s+kombinationen von schemas/, key: 'ch6_6' },
    { re: /^7\s+visualisierung/, key: 'ch7' },
    { re: /^8\s+zeitplan/, key: 'ch8' },
    { re: /^8\.1\s+zeitplan f/, key: 'ch8_1' },
    { re: /^8\.2\s+zeitplan f/, key: 'ch8_2' },
    { re: /^9\s+ausgestaltung/, key: 'ch9' },
    { re: /^9\.1\s+hinweise zu den api-webdiensten zur messwertübermittlung/, key: 'ch9_1' },
    { re: /^9\.1\.1\s+ausprägung/, key: 'ch9_1_1' },
    { re: /^9\.1\.2\s+obis-kennzahlen/, key: 'ch9_1_2' },
    { re: /^10\s+rückmeldung/, key: 'ch10' },
    { re: /^10\.1\s+rückmeldung zu kapitel 1 bis 8/, key: 'ch10_1' },
    { re: /^10\.2\s+rückmeldung zu kapitel 9/, key: 'ch10_2' },
  ];
  for (const m of map) if (m.re.test(t)) return m.key;
  // fallback: slugify first word/number
  return 'sec_' + t.replace(/\s+/g, '_').replace(/[^a-z0-9_\.]/g, '').slice(0, 40);
}

export function parseConsultationMarkdown(filePath: string, slug: string, opts?: { title?: string; tags?: string[] }): ConsultationPayload | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const sectionsRaw = splitByHeadings(raw);

    const sections: ConsultationSection[] = sectionsRaw.map((s) => ({
      key: mapTitleToKey(s.title),
      title: s.title,
      markdown: s.content.trim(),
      html: renderMarkdownToHtml(s.content.trim()),
    }));

    const payload: ConsultationPayload = {
      slug,
      title: opts?.title || 'Konsultation',
      status: 'published',
      updated_at: new Date().toISOString(),
      tags: opts?.tags || ['Konsultation'],
      sections,
      downloads: {
        pdf: `/api/public/community/consultations/${slug}/export.pdf`,
        docx: `/api/public/community/consultations/${slug}/export.docx`,
      },
    };

    return payload;
  } catch (e) {
    console.error('Failed to parse consultation markdown:', e);
    return null;
  }
}

export function getConsultationBySlug(slug: string): ConsultationPayload | null {
  const cfg = loadConfig();
  const entry = cfg[slug];
  if (!entry) {
    // Backward compatibility for mitteilung-53 default seed
    if (slug === 'mitteilung-53') {
      return parseConsultationMarkdown(DEFAULT_MD_SOURCE, slug, {
        title: 'Mitteilung Nr. 53 – Konsultation API‑Webdienste',
        tags: ['BNetzA', 'EDI@Energy', 'MaBiS-Hub', 'API', 'Marktkommunikation'],
      });
    }
    return null;
  }
  const mdPath = path.isAbsolute(entry.md) ? entry.md : path.join(process.cwd(), entry.md);
  return parseConsultationMarkdown(mdPath, slug, { title: entry.title, tags: entry.tags });
}
