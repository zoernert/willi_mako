// AnythingLLM Custom Agent Skill: EDIFACT Analyze
// Posts an EDIFACT message to the public Willi‑Mako API and returns a concise textual summary.

module.exports.runtime = {
  handler: async function ({ message, text }) {
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
      const payload = { message: (message || text || '').toString() };
      if (!payload.message.trim()) return 'Bitte EDIFACT‑Nachricht angeben (message/Text).';

      this.introspect?.(`${callerId} EDIFACT Analyze… (len=${payload.message.length})`);
      const url = `${base.replace(/\/$/, '')}/api/public/edifact/analyze`;
      const res = await postJson(url, payload);

      if (!res || res.success === false) {
        this.logger?.(`${callerId} API Fehler: ${res && res.error ? res.error : 'unbekannt'}`);
        return `Analyse fehlgeschlagen. (${res && res.error ? res.error : 'unbekannter Fehler'})`;
      }

      // Expect shape: { success: true, data: { summary, entities, segments, ... } | string }
      const data = res.data;
      if (typeof data === 'string') return data;

      const lines = [];
      if (data.summary) lines.push(`Zusammenfassung: ${data.summary}`);
      if (Array.isArray(data.entities) && data.entities.length) {
        lines.push('Erkannte Entitäten:');
        lines.push(...data.entities.slice(0, 6).map((e) => `- ${e.type || e.label || 'Entität'}: ${e.value || e.code || ''}`));
      }
      if (Array.isArray(data.errors) && data.errors.length) {
        lines.push('Hinweise/Fehler:');
        lines.push(...data.errors.slice(0, 3).map((e) => `- ${e.message || e}`));
      }
      if (!lines.length) return 'Analyse erfolgreich, aber keine zusammenfassbaren Daten.';
      return lines.join('\n');
    } catch (e) {
      this.introspect?.(`${callerId} fehlgeschlagen: ${e.message}`);
      this.logger?.(`${callerId} Fehler: ${e.message}`);
      return `Das Skill konnte nicht ausgeführt werden. Grund: ${e.message}`;
    }
  }
};
