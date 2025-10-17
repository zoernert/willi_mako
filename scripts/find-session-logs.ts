import { promises as fs } from 'fs';
import path from 'path';

interface LogEntry {
  timestamp?: string;
  type?: string;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

const LOG_DIR = path.resolve(__dirname, '..', 'logs');

async function main() {
  const sessionId = process.argv[2];

  if (!sessionId) {
    console.error('Bitte eine Session-ID übergeben. Beispiel:');
    console.error('  npm run logs:session -- <session-id>');
    process.exit(1);
  }

  const files = await readLogFiles(LOG_DIR);

  if (!files.length) {
    console.log('Keine Logdateien gefunden.');
    process.exit(0);
  }

  let matches = 0;

  for (const file of files) {
    const entries = await parseLogFile(file);

    entries.forEach((entry, index) => {
      if (entry && containsSessionId(entry, sessionId)) {
        matches++;
        const info = buildLogSummary(entry);
        console.log(`\n${path.basename(file)} #${index + 1}`);
        console.log(`  timestamp: ${info.timestamp}`);
        console.log(`  type: ${info.type}`);
        console.log(`  message: ${info.message}`);
        if (info.dataPreview) {
          console.log(`  data: ${info.dataPreview}`);
        }
      }
    });
  }

  if (matches === 0) {
    console.log(`Keine Einträge mit Session-ID "${sessionId}" gefunden.`);
  } else {
    console.log(`\nGefundene Einträge gesamt: ${matches}`);
  }
}

async function readLogFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((name) => name.endsWith('.log') || name.endsWith('.log.json') || name.endsWith('.jsonl'))
      .map((name) => path.join(dir, name))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function parseLogFile(file: string): Promise<LogEntry[]> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const trimmed = raw.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as LogEntry[];
    }

    // Support JSONL
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LogEntry);
  } catch (error) {
    console.warn(`Warnung: Datei ${path.basename(file)} konnte nicht gelesen werden: ${(error as Error).message}`);
    return [];
  }
}

function containsSessionId(entry: unknown, sessionId: string): boolean {
  if (!entry) {
    return false;
  }

  if (typeof entry === 'string') {
    return entry.includes(sessionId);
  }

  if (typeof entry === 'number' || typeof entry === 'boolean') {
    return false;
  }

  if (Array.isArray(entry)) {
    return entry.some((value) => containsSessionId(value, sessionId));
  }

  if (typeof entry === 'object') {
    return Object.values(entry as Record<string, unknown>).some((value) => containsSessionId(value, sessionId));
  }

  return false;
}

function buildLogSummary(entry: LogEntry) {
  const timestamp = entry.timestamp || 'unbekannt';
  const type = entry.type || 'n/a';
  const message = entry.message || 'n/a';
  const dataPreview = entry.data ? truncate(JSON.stringify(entry.data)) : undefined;

  return { timestamp, type, message, dataPreview };
}

function truncate(value: string, max = 200): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

main().catch((error) => {
  console.error('Fehler beim Lesen der Logs:', error);
  process.exit(1);
});
