import { BilateralClarification } from '../../types/bilateral';

// Count clarifications due on a specific date (local)
export function countDueOnDate(clarifications: Partial<BilateralClarification>[], date: Date): number {
  // Use UTC day boundaries for deterministic behavior
  const yyyy = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth(); // 0-based
  const day = date.getUTCDate();
  const start = Date.UTC(yyyy, monthIndex, day, 0, 0, 0);
  const end = Date.UTC(yyyy, monthIndex, day, 23, 59, 59);
  return (clarifications || []).filter((c: any) => {
    const due = c.slaDueAt || c.nextActionAt;
    if (!due) return false;
    const t = new Date(due).getTime();
    return t >= start && t <= end;
  }).length;
}

export type Bucket = { label: string; min: number; max: number };

// Aging buckets for cases waiting on partner
export function computeAgingBuckets(clarifications: Partial<BilateralClarification>[], buckets?: Bucket[]) {
  const defs: Bucket[] = buckets || [
    { label: '0-2 Tage', min: 0, max: 2 },
    { label: '3-6 Tage', min: 3, max: 6 },
    { label: '7-14 Tage', min: 7, max: 14 },
    { label: '>14 Tage', min: 15, max: Infinity },
  ];
  const counts = defs.map(() => 0);
  (clarifications || []).forEach((c: any) => {
    if (c.waitingOn === 'PARTNER' && typeof c.staleSinceDays === 'number') {
      const d = c.staleSinceDays;
      const idx = defs.findIndex(b => d >= b.min && d <= (b.max as number));
      if (idx >= 0) counts[idx] += 1;
    }
  });
  return { buckets: defs, counts };
}

// Overdue buckets (days overdue) for cases waiting on partner
export function computeOverdueBuckets(
  clarifications: Partial<BilateralClarification>[],
  now: number = Date.now(),
  buckets?: Bucket[],
) {
  const defs: Bucket[] = buckets || [
    { label: '1–2 Tage überfällig', min: 1, max: 2 },
    { label: '3–6 Tage überfällig', min: 3, max: 6 },
    { label: '7–14 Tage überfällig', min: 7, max: 14 },
    { label: '>14 Tage überfällig', min: 15, max: Infinity },
  ];
  const counts = defs.map(() => 0);
  (clarifications || []).forEach((c: any) => {
    if (c.waitingOn === 'PARTNER' && c.nextActionAt) {
      const due = new Date(c.nextActionAt).getTime();
      if (due < now) {
        const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        const idx = defs.findIndex(b => days >= b.min && days <= (b.max as number));
        if (idx >= 0) counts[idx] += 1;
      }
    }
  });
  return { buckets: defs, counts };
}
