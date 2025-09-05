#!/usr/bin/env tsx
/**
 * One-off exporter for Marktpartnersuche dataset
 * Exports only: BDEW Code, Market Roles, Software Products
 * Output structure:
 *   public/datasets/data/marktpartnersuche-export-YYYYMMDD/
 *     - tables.json
 *     - table-001.json
 *     - table-001.csv
 * Also appends a Dataset entry to public/datasets/datasets.jsonld
 */

import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment from .env (or custom path via DOTENV_CONFIG_PATH)
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(process.cwd(), '.env') });

type Doc = any;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function writeCSV(file: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

function normalizeRole(role?: string) {
  if (!role) return '';
  return role.trim();
}

function extractBdewCodes(doc: Doc): string[] {
  const codes: string[] = [];
  // From doc.bdewCodes
  if (Array.isArray(doc.bdewCodes)) {
    doc.bdewCodes.filter(Boolean).forEach((c: string) => codes.push(String(c)));
  }
  // From contacts[].BdewCode
  if (Array.isArray(doc.contacts)) {
    doc.contacts.forEach((c: any) => {
      if (c && c.BdewCode) codes.push(String(c.BdewCode));
    });
  }
  // Legacy partner fields
  const partner = doc.partner || {};
  const raw = partner['\uFEFFBdewCode'] || partner['﻿BdewCode'] || partner['BdewCode'];
  if (raw) codes.push(String(raw));
  return unique(codes).filter(Boolean);
}

function extractRoles(doc: Doc): string[] {
  const roles: string[] = [];
  if (Array.isArray(doc.contacts)) {
    doc.contacts.forEach((c: any) => {
      const r = normalizeRole(c?.BdewCodeFunction);
      if (r) roles.push(r);
    });
  }
  if (!roles.length && doc.partner?.BdewCodeFunction) {
    roles.push(normalizeRole(doc.partner.BdewCodeFunction));
  }
  return unique(roles).filter(Boolean);
}

function extractSoftware(doc: Doc): string[] {
  const names: string[] = [];
  if (Array.isArray(doc.findings)) {
    doc.findings.forEach((f: any) => {
      if (Array.isArray(f.software_systems)) {
        f.software_systems.forEach((s: any) => {
          const n = (s?.name || '').trim();
          if (n) names.push(n);
        });
      }
    });
  }
  // Also collect any aggregated property if present
  if (Array.isArray(doc.allSoftwareSystems)) {
    doc.allSoftwareSystems.forEach((s: any) => {
      const n = (s?.name || '').trim();
      if (n) names.push(n);
    });
  }
  return unique(names).filter(Boolean);
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI env var. Aborting.');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('quitus');
  const col = db.collection('discovery_results');

  // Pull only fields we need
  const cursor = col.find({}, { projection: { contacts: 1, findings: 1, companyName: 1 } });

  // Prepare headers as requested + extras from findings
  const headers = [
    'BdewCode',
    'BdewCodeFunction',
    'CompanyName',
    'EIC_Code',
    'EIC_Display_Name',
    'EstimatedSoftwareProducts',
    'SoftwareSources'
  ];
  const rows: string[][] = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;

    // From findings: aggregate software names and source URLs
    const software = extractSoftware(doc);
    const sources = Array.isArray(doc.findings)
      ? unique(doc.findings.map((f: any) => (f?.source_url || '').trim()).filter(Boolean))
      : [];

    const contacts: any[] = Array.isArray(doc.contacts) ? doc.contacts : [];
    if (!contacts.length) continue; // Only contacts are rows

    contacts.forEach((c: any) => {
      const bdew = (c?.BdewCode || '').trim();
      if (!bdew) return; // require BdewCode per row
      const role = (c?.BdewCodeFunction || '').trim();
      const name = (c?.CompanyName || doc.companyName || '').toString();
      const eic = (c?.EIC_Code || '').trim();
      const eicName = (c?.EIC_Display_Name || '').trim();

      rows.push([
        bdew,
        role,
        name,
        eic,
        eicName,
        software.join('; '),
        sources.join('; '),
      ]);
    });
  }

  // Sort rows by BdewCode, then CompanyName
  rows.sort((a, b) => (a[0] === b[0] ? a[2].localeCompare(b[2]) : a[0].localeCompare(b[0])));

  const datasetsRoot = path.join(process.cwd(), 'public', 'datasets');
  const dataDir = path.join(datasetsRoot, 'data');
  ensureDir(dataDir);
  const date = todayYMD();
  const slug = `marktpartnersuche-export-${date}`;
  const targetDir = path.join(dataDir, slug);
  ensureDir(targetDir);

  // Write JSON table
  const tableJson = { headers, rows };
  const tableJsonName = 'table-001.json';
  writeJSON(path.join(targetDir, tableJsonName), tableJson);

  // Write CSV table
  const tableCsvName = 'table-001.csv';
  writeCSV(path.join(targetDir, tableCsvName), headers, rows);

  // Write tables manifest
  const manifest = {
    tablesCount: 1,
    tables: [
      {
        id: 'table-001',
        files: { json: tableJsonName, csv: tableCsvName },
        headersCount: headers.length,
        rowsCount: rows.length,
      }
    ]
  };
  writeJSON(path.join(targetDir, 'tables.json'), manifest);

  // Append Dataset entry
  const datasetsFile = path.join(datasetsRoot, 'datasets.jsonld');
  let datasets: any = { '@context': 'https://schema.org', '@graph': [] };
  if (fs.existsSync(datasetsFile)) {
    try { datasets = JSON.parse(fs.readFileSync(datasetsFile, 'utf8')); } catch {}
  }
  if (!datasets['@graph']) datasets['@graph'] = [];

  const publishDate = new Date();
  const dateISO = publishDate.toISOString().slice(0, 10);
  const host = 'https://stromhaltig.de';
  const pageUrl = `${host}/data/${slug}`;

  const datasetEntry = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Marktpartnersuche (Kontakte) ${dateISO}`,
    alternateName: `Marktpartnersuche_Kontakte_${dateISO}.csv`,
    identifier: `marktpartnersuche_export_${dateISO}`,
    description: 'Export der Marktpartnersuche je Kontakt (Marktpartner): BdewCode, BdewCodeFunction, CompanyName, EIC_Code, EIC_Display_Name, ergänzt um Software-Produkte und Quellen aus Findings',
    inLanguage: 'de',
    isAccessibleForFree: true,
    url: pageUrl,
    datePublished: dateISO,
    keywords: [ 'Marktpartnersuche', 'BDEW', 'Marktrollen', 'Software', 'EIC' ],
    distribution: [
      {
        '@type': 'DataDownload',
        name: 'tables.json',
        contentUrl: `${host}/data/${slug}/tables.json`,
        encodingFormat: 'application/json'
      },
      {
        '@type': 'DataDownload',
        name: 'table-001.csv',
        contentUrl: `${host}/data/${slug}/table-001.csv`,
        encodingFormat: 'text/csv'
      },
      {
        '@type': 'DataDownload',
        name: 'table-001.json',
        contentUrl: `${host}/data/${slug}/table-001.json`,
        encodingFormat: 'application/json'
      }
    ],
    _source: { type: 'mongo', collection: 'discovery_results' }
  };

  // Avoid duplicate if same identifier exists
  const exists = (datasets['@graph'] as any[]).some((d) => d.identifier === datasetEntry.identifier);
  if (!exists) {
    datasets['@graph'].push(datasetEntry);
    writeJSON(datasetsFile, datasets);
  }

  await client.close();
  console.log(`Export complete. Files written to ${targetDir}`);
  console.log(`Dataset page URL: ${pageUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
