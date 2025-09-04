import { BilateralClarification } from '../../types/bilateral';

/**
 * Returns true when a case should be considered overdue on the client:
 * - nextActionAt exists and is in the past
 * - OR waiting on partner with staleSinceDays >= 7
 */
export function isOverdueClient(c: Pick<BilateralClarification, 'nextActionAt' | 'waitingOn' | 'staleSinceDays'>, nowMs = Date.now()): boolean {
  const next = c.nextActionAt ? new Date(c.nextActionAt).getTime() : undefined;
  const overdueByNext = typeof next === 'number' && !Number.isNaN(next) && next < nowMs;
  const waitedLong = (c.waitingOn === 'PARTNER') && (typeof c.staleSinceDays === 'number') && c.staleSinceDays >= 7;
  return !!(overdueByNext || waitedLong);
}
