export interface ParsedEmail {
  subject?: string;
  fromAddress?: string;
  toAddresses: string[];
  ccAddresses: string[];
  body: string;
}

/**
 * Best-effort parser for pasted raw email content with simple headers.
 * Supports Subject, From, To, Cc. Separates header block from body on first blank line.
 */
export function parsePastedEmail(text: string): ParsedEmail {
  if (!text) return { body: '', toAddresses: [], ccAddresses: [] };
  const idx = text.indexOf('\n\n');
  const headerBlock = idx > -1 ? text.slice(0, idx) : '';
  const body = idx > -1 ? text.slice(idx + 2) : text;

  const getHeader = (name: string) => {
    const re = new RegExp(`^${name}:\\s*(.*)$`, 'im');
    const m = headerBlock.match(re);
    return m ? m[1].trim() : undefined;
  };

  const subject = getHeader('Subject');
  const fromAddress = getHeader('From');
  const to = getHeader('To');
  const cc = getHeader('Cc');

  const splitList = (s?: string) => (s ? s.split(',').map(x => x.trim()).filter(Boolean) : []);

  return {
    subject,
    fromAddress,
    toAddresses: splitList(to),
    ccAddresses: splitList(cc),
    body
  };
}
