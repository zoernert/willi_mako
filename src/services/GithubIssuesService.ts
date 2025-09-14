import fs from 'fs';
import path from 'path';

export interface IssueRef {
  number: number;
  title: string;
  labels: string[];
  url: string;
  state: 'open' | 'closed';
  updated_at: string;
  chapterKey?: string | null;
}

type CacheFile = { fetchedAt: string; issues: IssueRef[] };

const CACHE_DIR = path.join(process.cwd(), '.cache', 'github', 'consultations');
const DEFAULT_CACHE_FILE = path.join(CACHE_DIR, 'mitteilung-53.json');
const DEFAULT_MAPPING_FILE = path.join(process.cwd(), 'content', 'github-mapping.json');
const DEFAULT_REPO = 'EDI-Energy/Konzept_API_Strom';
const CONFIG_FILE = path.join(process.cwd(), 'content', 'consultations.config.json');

type ConsultationConfig = Record<string, { md: string; repo?: string; title?: string; tags?: string[] }>;

function loadConfig(): ConsultationConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as ConsultationConfig;
  } catch {
    return {};
  }
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonSafe(file: string, data: any) {
  try {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write cache file:', e);
  }
}

function loadMappingOverrides(mappingFile: string): Record<string, string> {
  const data = readJsonSafe<{ overrides?: Record<string, string> }>(mappingFile);
  return data?.overrides || {};
}

function mapChapterFromTitleOrLabels(title: string, labels: string[]): string | null {
  const t = title.toLowerCase();
  const joined = labels.map((l) => l.toLowerCase()).join(' ');
  const hay = `${t} ${joined}`;
  const patterns: Array<{ re: RegExp; key: string }> = [
    { re: /\b10\.2\b|kap(itel)?\s*10\.?2/i, key: 'ch10_2' },
    { re: /\b10\.1\b|kap(itel)?\s*10\.?1/i, key: 'ch10_1' },
    { re: /\b10\b|kap(itel)?\s*10\b/i, key: 'ch10' },
    { re: /\b9\.1\.2\b|kap(itel)?\s*9\.?1\.?2/i, key: 'ch9_1_2' },
    { re: /\b9\.1\.1\b|kap(itel)?\s*9\.?1\.?1/i, key: 'ch9_1_1' },
    { re: /\b9\.1\b|kap(itel)?\s*9\.?1\b/i, key: 'ch9_1' },
    { re: /\b9\b|kap(itel)?\s*9\b/i, key: 'ch9' },
    { re: /\b8\.2\b|kap(itel)?\s*8\.?2/i, key: 'ch8_2' },
    { re: /\b8\.1\b|kap(itel)?\s*8\.?1/i, key: 'ch8_1' },
    { re: /\b8\b|kap(itel)?\s*8\b/i, key: 'ch8' },
    { re: /\b7\b|kap(itel)?\s*7\b/i, key: 'ch7' },
    { re: /\b6\.6\b|kap(itel)?\s*6\.?6/i, key: 'ch6_6' },
    { re: /\b6\.5\b|kap(itel)?\s*6\.?5/i, key: 'ch6_5' },
    { re: /\b6\.4\b|kap(itel)?\s*6\.?4/i, key: 'ch6_4' },
    { re: /\b6\.3\b|kap(itel)?\s*6\.?3/i, key: 'ch6_3' },
    { re: /\b6\.2\b|kap(itel)?\s*6\.?2/i, key: 'ch6_2' },
    { re: /\b6\.1\b|kap(itel)?\s*6\.?1/i, key: 'ch6_1' },
    { re: /\b6\b|kap(itel)?\s*6\b/i, key: 'ch6' },
    { re: /\b5\b|kap(itel)?\s*5\b/i, key: 'ch5' },
    { re: /\b4\b|kap(itel)?\s*4\b/i, key: 'ch4' },
    { re: /\b3\.3\.2\b|kap(itel)?\s*3\.?3\.?2/i, key: 'ch3_3_2' },
    { re: /\b3\.3\.1\b|kap(itel)?\s*3\.?3\.?1/i, key: 'ch3_3_1' },
    { re: /\b3\.3\b|kap(itel)?\s*3\.?3\b/i, key: 'ch3_3' },
    { re: /\b3\.2\b|kap(itel)?\s*3\.?2/i, key: 'ch3_2' },
    { re: /\b3\.1\b|kap(itel)?\s*3\.?1/i, key: 'ch3_1' },
    { re: /\b3\b|kap(itel)?\s*3\b/i, key: 'ch3' },
    { re: /\b2\b|kap(itel)?\s*2\b/i, key: 'ch2' },
    { re: /\b1\b|kap(itel)?\s*1\b/i, key: 'ch1' },
  ];
  for (const p of patterns) if (p.re.test(hay)) return p.key;
  return null;
}

async function fetchFromGithub(repo: string, mappingFile: string): Promise<IssueRef[]> {
  const url = `https://api.github.com/repos/${repo}/issues?per_page=100&state=open`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'willi-mako-consultation'
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const overrides = loadMappingOverrides(mappingFile);

  const issues: IssueRef[] = (data as any[])
    .filter((it) => !it.pull_request) // ignore PRs
    .map((it) => {
      const labels = Array.isArray(it.labels) ? it.labels.map((l: any) => (typeof l === 'string' ? l : l.name)) : [];
      const number = it.number as number;
      const keyFromOverride = overrides[String(number)] || null;
      const key = keyFromOverride || mapChapterFromTitleOrLabels(it.title || '', labels);
      return {
        number,
        title: it.title || '',
        labels,
        url: it.html_url,
        state: (it.state || 'open') as 'open' | 'closed',
        updated_at: it.updated_at || it.created_at || new Date().toISOString(),
        chapterKey: key,
      } as IssueRef;
    });
  return issues;
}

export class GithubIssuesService {
  /** Resolve the GitHub repo for a consultation slug */
  static resolveRepoForSlug(slug: string = 'mitteilung-53'): string {
    const cfg = loadConfig();
    const repo = (cfg[slug] as any)?.submissionRepo || (cfg[slug] as any)?.repo || DEFAULT_REPO;
    return repo;
  }

  /** Create a GitHub issue in the repo tied to the consultation slug */
  static async createIssueForConsultation(slug: string, title: string, body: string, labels?: string[]): Promise<{ url: string; number: number }> {
    const repo = GithubIssuesService.resolveRepoForSlug(slug);
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('Missing GITHUB_TOKEN');

    const url = `https://api.github.com/repos/${repo}/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'willi-mako-consultation',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels: labels && labels.length ? labels : undefined }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`GitHub issue create failed: ${res.status} ${res.statusText} ${t}`);
    }
  const data: any = await res.json();
  return { url: data.html_url as string, number: data.number as number };
  }

  static async getIssues(forceRefresh = false, slug: string = 'mitteilung-53'): Promise<IssueRef[]> {
    // 1) Memory/File cache
    const ttlMs = 60 * 60 * 1000; // 1h
    const cfg = loadConfig();
    const repo = cfg[slug]?.repo || DEFAULT_REPO;
    const cacheFile = path.join(CACHE_DIR, `${slug}.json`);
    const mappingFile = cfg[slug] ? path.join(process.cwd(), 'content', `github-mapping-${slug}.json`) : DEFAULT_MAPPING_FILE;

    const cached = readJsonSafe<CacheFile>(fs.existsSync(cacheFile) ? cacheFile : DEFAULT_CACHE_FILE);
    if (!forceRefresh && cached && Date.now() - Date.parse(cached.fetchedAt) < ttlMs) {
      return cached.issues;
    }

    // 2) Fetch
    try {
      const issues = await fetchFromGithub(repo, mappingFile);
      writeJsonSafe(cacheFile, { fetchedAt: new Date().toISOString(), issues });
      return issues;
    } catch (e) {
      console.error('GitHub issues fetch failed:', e);
      // fallback to cache
      return cached?.issues || [];
    }
  }

  static async getIssuesByChapter(chapterKey: string, slug: string = 'mitteilung-53'): Promise<IssueRef[]> {
    const issues = await GithubIssuesService.getIssues(false, slug);
    return issues.filter((i) => i.chapterKey === chapterKey);
  }
}
