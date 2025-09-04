import { isOverdueClient } from '../filterUtils';

describe('isOverdueClient', () => {
  it('detects overdue by nextActionAt in the past', () => {
    const now = new Date('2025-01-10T00:00:00Z').getTime();
    const c = { nextActionAt: '2025-01-01T00:00:00Z', waitingOn: 'US' as const, staleSinceDays: 1 };
    expect(isOverdueClient(c, now)).toBe(true);
  });

  it('detects overdue by waiting on partner >=7 days', () => {
    const now = new Date('2025-01-10T00:00:00Z').getTime();
    const c = { nextActionAt: undefined as any, waitingOn: 'PARTNER' as const, staleSinceDays: 7 };
    expect(isOverdueClient(c, now)).toBe(true);
  });

  it('not overdue when nextActionAt in future and stale <7 or waiting on US', () => {
    const now = new Date('2025-01-10T00:00:00Z').getTime();
    const c1 = { nextActionAt: '2025-02-01T00:00:00Z', waitingOn: 'PARTNER' as const, staleSinceDays: 6 };
    const c2 = { nextActionAt: undefined as any, waitingOn: 'US' as const, staleSinceDays: 10 };
    expect(isOverdueClient(c1, now)).toBe(false);
    expect(isOverdueClient(c2, now)).toBe(false);
  });
});
