import { parsePastedEmail } from '../emailUtils';

describe('parsePastedEmail', () => {
  it('parses headers and body from pasted content', () => {
    const text = [
      'Subject: Testbetreff',
      'From: partner@example.com',
      'To: me@stromhaltig.de, other@stromhaltig.de',
      'Cc: cc1@example.com',
      '',
      'Hallo, dies ist der Body.'
    ].join('\n');

    const res = parsePastedEmail(text);
    expect(res.subject).toBe('Testbetreff');
    expect(res.fromAddress).toBe('partner@example.com');
    expect(res.toAddresses).toEqual(['me@stromhaltig.de', 'other@stromhaltig.de']);
    expect(res.ccAddresses).toEqual(['cc1@example.com']);
    expect(res.body).toBe('Hallo, dies ist der Body.');
  });

  it('handles missing headers gracefully', () => {
    const text = 'Nur Body ohne Header';
    const res = parsePastedEmail(text);
    expect(res.subject).toBeUndefined();
    expect(res.fromAddress).toBeUndefined();
    expect(res.toAddresses).toEqual([]);
    expect(res.ccAddresses).toEqual([]);
    expect(res.body).toBe(text);
  });
});
