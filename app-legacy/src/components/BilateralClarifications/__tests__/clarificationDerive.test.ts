import { deriveClarificationFields } from '../clarificationDerive';
import { BilateralClarification, ClarificationEmail } from '../../../types/bilateral';

function makeEmail(direction: 'INCOMING' | 'OUTGOING', addedAt: string): ClarificationEmail {
  return { id: `m-${addedAt}`, direction, subject: '', from: '', to: [], addedAt } as any;
}

describe('deriveClarificationFields', () => {
  it('sets waitingOn=PARTNER and nextActionAt=+3d when last action is outbound', () => {
    const now = new Date();
    const out = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
    const c: BilateralClarification = {
      id: 1,
      title: 'Test',
      status: 'open',
      priority: 'medium',
      caseType: 'Test',
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      emails: [makeEmail('OUTGOING', out)] as any,
    } as any;

    const d = deriveClarificationFields(c);
    expect(d.waitingOn).toBe('PARTNER');
    expect(d.nextActionAt).toBeTruthy();
    const next = new Date(d.nextActionAt!);
    const expected = new Date(new Date(out).getTime());
    expected.setDate(expected.getDate() + 3);
    // Allow up to a minute drift
    expect(Math.abs(next.getTime() - expected.getTime())).toBeLessThan(60 * 1000);
  });

  it('sets waitingOn=US when last action is inbound', () => {
    const now = new Date();
    const inbound = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const c: BilateralClarification = {
      id: 2,
      title: 'Test2',
      status: 'open',
      priority: 'low',
      caseType: 'Test',
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      emails: [makeEmail('INCOMING', inbound)] as any,
    } as any;

    const d = deriveClarificationFields(c);
    expect(d.waitingOn).toBe('US');
    expect(d.nextActionAt).toBeUndefined();
  });

  it('computes staleSinceDays from last activity', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const c: BilateralClarification = {
      id: 3,
      title: 'Test3',
      status: 'open',
      priority: 'high',
      caseType: 'Test',
      tags: [],
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      emails: [],
    } as any;

    const d = deriveClarificationFields(c);
    expect(d.staleSinceDays).toBeGreaterThanOrEqual(2);
  });

  it('derives lastEditedBy from latest email/note/attachment or falls back to lastModifiedBy', () => {
    const now = new Date();
    const older = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const newer = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const c: any = {
      id: 4,
      title: 'LEB',
      status: 'open',
      priority: 'medium',
      caseType: 'Test',
      tags: [],
      createdAt: older,
      updatedAt: newer,
      lastModifiedBy: 'user-legacy',
      emails: [
        { id: 'e1', direction: 'INCOMING', addedAt: older, addedBy: 'u-old' },
        { id: 'e2', direction: 'OUTGOING', addedAt: newer, addedBy: 'u-new' }
      ],
      notes: [],
      attachments: []
    };
    const d = deriveClarificationFields(c as any);
    expect(d.lastEditedBy).toBe('u-new');

    // If no emails/notes/attachments, fallback to lastModifiedBy
    const c2: any = {
      id: 5,
      title: 'LEB2',
      status: 'open',
      priority: 'low',
      caseType: 'Test',
      tags: [],
      createdAt: older,
      updatedAt: newer,
      lastModifiedBy: 'fallback-user',
      emails: [],
      notes: [],
      attachments: []
    };
    const d2 = deriveClarificationFields(c2 as any);
    expect(d2.lastEditedBy).toBe('fallback-user');
  });

  it('infers waitingOn=PARTNER and nextActionAt when status is SENT/PENDING and no emails', () => {
    const now = new Date();
    const c: any = {
      id: 6,
      title: 'Infer waiting',
      status: 'SENT',
      priority: 'MEDIUM',
      caseType: 'GENERAL',
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      emails: []
    };
    const d = deriveClarificationFields(c as any);
    expect(d.waitingOn).toBe('PARTNER');
    expect(d.nextActionAt).toBeTruthy();
  });
});
