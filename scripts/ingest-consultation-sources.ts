/*
 Ingest prior consultation submissions and public sources into a dedicated Qdrant collection to enrich context for the current consultation.
 Usage:
   QDRANT_URL=... QDRANT_API_KEY=... npx tsx scripts/ingest-consultation-sources.ts \
     --collection consultations-m53 \
     --pdf ./data/submissions_230pages.pdf \
     --url https://www.bundesnetzagentur.de/DE/Beschlusskammern/1_GZ/BK6-GZ/2024/BK6-24-210/InfoVorgehen/BK6-24-210_Verfahrensstand.html?nn=1029832 \
     --url https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_83_Zug_Mess/845_MaBiS_Hub/BK6_MaBiS_Hub_node.html
*/

import { ConsultationIngestService } from '../src/services/ConsultationIngestService';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env by default (or custom path via DOTENV_CONFIG_PATH)
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(process.cwd(), '.env') });

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const html = await res.text();
    // Minimal text extraction (can be replaced with a proper parser later)
    return html.replace(/<script[\s\S]*?<\/script>/g, '')
               .replace(/<style[\s\S]*?<\/style>/g, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  } catch {
    return '';
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: any = { urls: [] as string[] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--collection') opts.collection = args[++i];
    else if (a === '--pdf') opts.pdf = args[++i];
    else if (a === '--url') opts.urls.push(args[++i]);
  }
  return opts;
}

(async () => {
  const { collection = 'consultations-m53', pdf, urls } = parseArgs();
  const ingest = new ConsultationIngestService(collection);

  if (pdf) {
    console.log('Ingesting PDF:', pdf);
    await ingest.ingestPdf(pdf, 'pdf:'+pdf);
  }

  if (urls && urls.length) {
    console.log('Ingesting URLs:', urls.length);
    await ingest.ingestUrls(urls, fetchPage);
  }

  console.log('Done.');
})();
