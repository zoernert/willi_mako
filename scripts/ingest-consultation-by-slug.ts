/*
 Ingest the consultation sections (from Markdown seed) into a Qdrant collection.
 Usage:
   QDRANT_URL=... QDRANT_API_KEY=... npx tsx scripts/ingest-consultation-by-slug.ts --slug mitteilung-53
   # Optional: override collection base or provider-related envs
   EMBEDDING_PROVIDER=mistral MISTRAL_API_KEY=... npx tsx scripts/ingest-consultation-by-slug.ts --slug mitteilung-53 --collection-base consultations-m53
*/

import { ConsultationIngestService } from '../src/services/ConsultationIngestService';
import { getConsultationBySlug } from '../src/lib/content/consultations';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables from .env are loaded when running as a script
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(process.cwd(), '.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: any = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--slug') opts.slug = args[++i];
    else if (a === '--collection-base') opts.collectionBase = args[++i];
  }
  return opts;
}

(async () => {
  const { slug = 'mitteilung-53', collectionBase } = parseArgs();
  const payload = getConsultationBySlug(slug);
  if (!payload) {
    console.error('Consultation not found for slug:', slug);
    process.exit(1);
  }

  const base = (collectionBase || `consultations-${slug.replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/^mitteilung-/, 'm')}`);
  const svc = new ConsultationIngestService(base);

  const items = payload.sections.map((s, idx) => ({
    id: `${s.key}_${idx}`,
    text: `${s.title}\n\n${s.markdown}`.slice(0, 10000),
    source: `https://stromhaltig.de/konsultation/${slug}#${s.key}`,
    meta: { chapterKey: s.key, title: s.title, slug }
  }));

  console.log(`Ingesting ${items.length} sections into collection base: ${base}`);
  try {
    await svc.ingestText(items);
    console.log('Success. Count:', items.length);
  } catch (e: any) {
    console.error('Ingestion failed:', e?.message || e);
    process.exit(2);
  }
})();
