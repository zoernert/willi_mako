// AnythingLLM Custom Agent Skill: Market Partner Search
// Conforms to handler.js reference: export runtime with handler({ query }), use this.runtimeArgs

module.exports.runtime = {
  handler: async function ({ query }) {
    const https = require('https');
    const http = require('http');

    const callerId = `${this.config?.name}-v${this.config?.version}`;

    const doFetch = (url) => new Promise((resolve, reject) => {
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

    try {
      const base = (this.runtimeArgs && this.runtimeArgs.API_BASE_URL) || 'https://stromhaltig.de';
      const q = (query || '').trim();
      if (!q) return 'Bitte Suchbegriff angeben, z. B. Firmenname oder BDEW/EIC‑Code.';

      this.introspect?.(`${callerId} sucht Marktpartner zu: "${q}"`);
      const url = `${base.replace(/\/$/, '')}/api/public/market-partners/search?q=${encodeURIComponent(q)}&limit=5`;
      const res = await doFetch(url);

      if (!res || res.success === false) {
        this.logger?.(`${callerId} API Fehler: ${res && res.error ? res.error : 'unbekannt'}`);
        return `Keine Ergebnisse oder Fehler bei der Suche. (${res && res.error ? res.error : 'unbekannter Fehler'})`;
      }

      const items = (res.data && res.data.results) || [];
      if (!items.length) return 'Keine Marktpartner gefunden.';

      const lines = items.map((r, i) => {
        const extras = [];
        if (r.bdewCodes && r.bdewCodes.length) extras.push(`Codes: ${r.bdewCodes.slice(0, 3).join(', ')}`);
        if (r.contactSheetUrl) extras.push(`Kontaktblatt: ${r.contactSheetUrl}`);
        const sys = r.allSoftwareSystems?.slice(0, 2)?.map(s => `${s.name} (${s.confidence})`).join(', ');
        if (sys) extras.push(`Systeme: ${sys}`);
        return `${i + 1}. ${r.companyName} — ${r.code} (${r.codeType || r.source})${extras.length ? `\n   ${extras.join(' | ')}` : ''}`;
      });

      return `Top Ergebnisse zur Marktpartnersuche für "${q}":\n` + lines.join('\n');
    } catch (e) {
      this.introspect?.(`${callerId} fehlgeschlagen: ${e.message}`);
      this.logger?.(`${callerId} Fehler: ${e.message}`);
      return `Das Skill konnte nicht ausgeführt werden. Grund: ${e.message}`;
    }
  }
};
