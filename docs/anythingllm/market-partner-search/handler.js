// AnythingLLM Custom Agent Skill: Market Partner Search
// Requirements from docs:
// - JavaScript, Node 18+
// - Exports an async function that returns a STRING
// - Folder name must match plugin.json hubId

const https = require('https');
const http = require('http');

function doFetch(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    const req = lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON', raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Handler signature per AnythingLLM docs
module.exports = async function handler(input, variables) {
  const query = (typeof input === 'string' ? input : (input && input.query) || '').trim();
  const base = (variables && variables.API_BASE_URL) || '';
  if (!base) return 'Fehler: API_BASE_URL ist nicht gesetzt.';
  if (!query) return 'Bitte Suchbegriff angeben, z. B. Firmenname oder BDEW/EIC‑Code.';

  const url = `${base.replace(/\/$/, '')}/api/public/market-partners/search?q=${encodeURIComponent(query)}&limit=5`;

  try {
    const res = await doFetch(url);
    if (!res || res.success === false) {
      return `Keine Ergebnisse oder Fehler bei der Suche. (${res && res.error ? res.error : 'unbekannter Fehler'})`;
    }
    const items = (res.data && res.data.results) || [];
    if (!items.length) return 'Keine Marktpartner gefunden.';
    const lines = items.map((r, i) => `${i + 1}. ${r.companyName} — ${r.code} (${r.codeType || r.source})`);
    return `Top Ergebnisse zur Marktpartnersuche für "${query}":\n` + lines.join('\n');
  } catch (e) {
    return `Fehler bei der API‑Abfrage: ${e.message}`;
  }
};
