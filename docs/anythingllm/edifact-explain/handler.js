// AnythingLLM Custom Agent Skill: EDIFACT Explain Segment
// Posts a short EDIFACT fragment/segment to the public Willi‑Mako API and returns an explanation.

module.exports.runtime = {
  handler: async function ({ fragment, text }) {
    const https = require('https');
    const http = require('http');

    const callerId = `${this.config?.name}-v${this.config?.version}`;

    const postJson = (url, payload) => new Promise((resolve, reject) => {
      try {
        const body = JSON.stringify(payload);
        const isHttps = url.startsWith('https://');
        const lib = isHttps ? https : http;
        const { URL } = require('url');
        const parsed = new URL(url);
        const options = {
          method: 'POST',
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + (parsed.search || ''),
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        };
        const req = lib.request(options, (res) => {
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
        req.write(body);
        req.end();
      } catch (e) {
        reject(e);
      }
    });

    try {
      const base = (this.runtimeArgs && this.runtimeArgs.API_BASE_URL) || 'https://stromhaltig.de';
      const payload = { fragment: (fragment || text || '').toString() };
      if (!payload.fragment.trim()) return 'Bitte EDIFACT‑Segment/Fragment angeben (fragment/Text).';

      this.introspect?.(`${callerId} EDIFACT Explain… (len=${payload.fragment.length})`);
      const url = `${base.replace(/\/$/, '')}/api/public/edifact/explain`;
      const res = await postJson(url, payload);

      if (!res || res.success === false) {
        this.logger?.(`${callerId} API Fehler: ${res && res.error ? res.error : 'unbekannt'}`);
        return `Erklärung fehlgeschlagen. (${res && res.error ? res.error : 'unbekannter Fehler'})`;
      }

      const data = res.data;
      if (typeof data === 'string') return data;

      // Fallback shaping
      if (data && data.explanation) return data.explanation;
      if (Array.isArray(data) && data.length) return data.join('\n');
      return 'Keine Erklärung verfügbar.';
    } catch (e) {
      this.introspect?.(`${callerId} fehlgeschlagen: ${e.message}`);
      this.logger?.(`${callerId} Fehler: ${e.message}`);
      return `Das Skill konnte nicht ausgeführt werden. Grund: ${e.message}`;
    }
  }
};
