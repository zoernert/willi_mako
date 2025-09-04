import { countDueOnDate, computeAgingBuckets, computeOverdueBuckets } from '../kpiUtils';

describe('kpiUtils', () => {
  test('countDueOnDate counts items due today', () => {
    const today = new Date('2025-09-04T10:00:00Z');
    const clarifications = [
      { nextActionAt: '2025-09-04T08:00:00Z' },
      { slaDueAt: '2025-09-04T20:00:00Z' },
      { nextActionAt: '2025-09-05T00:00:01Z' },
      { nextActionAt: '2025-09-03T23:59:59Z' },
    ];
    const count = countDueOnDate(clarifications as any, new Date('2025-09-04T10:00:00'));
    expect(count).toBe(2);
  });

  test('computeAgingBuckets buckets by staleSinceDays for waiting on partner', () => {
    const clarifications = [
      { waitingOn: 'PARTNER', staleSinceDays: 1 },
      { waitingOn: 'PARTNER', staleSinceDays: 4 },
      { waitingOn: 'PARTNER', staleSinceDays: 10 },
      { waitingOn: 'PARTNER', staleSinceDays: 20 },
      { waitingOn: 'US', staleSinceDays: 100 },
    ];
    const { buckets, counts } = computeAgingBuckets(clarifications as any);
    expect(buckets.map(b => b.label)).toEqual(['0-2 Tage','3-6 Tage','7-14 Tage','>14 Tage']);
    expect(counts).toEqual([1,1,1,1]);
  });

  test('computeOverdueBuckets counts overdue by bucket (waiting on partner)', () => {
    const now = new Date('2025-09-10T00:00:00Z').getTime();
    const clarifications = [
      { waitingOn: 'PARTNER', nextActionAt: '2025-09-09T00:00:00Z' }, // 1 day overdue -> bucket 1-2
      { waitingOn: 'PARTNER', nextActionAt: '2025-09-07T00:00:00Z' }, // 3 days overdue -> bucket 3-6
      { waitingOn: 'PARTNER', nextActionAt: '2025-08-28T00:00:00Z' }, // 13 days overdue -> bucket 7-14
      { waitingOn: 'PARTNER', nextActionAt: '2025-08-20T00:00:00Z' }, // 21 days overdue -> >14
      { waitingOn: 'US', nextActionAt: '2025-09-01T00:00:00Z' },
      { waitingOn: 'PARTNER', nextActionAt: '2025-09-12T00:00:00Z' }, // not overdue
    ];
    const { buckets, counts } = computeOverdueBuckets(clarifications as any, now);
    expect(buckets.map(b => b.label)).toEqual(['1–2 Tage überfällig','3–6 Tage überfällig','7–14 Tage überfällig','>14 Tage überfällig']);
    expect(counts).toEqual([1,1,1,1]);
  });
});
