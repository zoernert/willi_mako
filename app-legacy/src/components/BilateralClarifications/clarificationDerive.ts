import { BilateralClarification, ClarificationEmail, ClarificationNote, ClarificationAttachment } from '../../types/bilateral';

export function deriveClarificationFields(c: BilateralClarification): BilateralClarification {
  const clone: BilateralClarification = { ...c };
  // Determine last inbound/outbound timestamps from emails array if present
  const emails: ClarificationEmail[] = (c.emails || []) as ClarificationEmail[];
  const inbound = emails.filter((e) => e.direction === 'INCOMING');
  const outbound = emails.filter((e) => e.direction === 'OUTGOING');
  const sortByAdded = (a: ClarificationEmail, b: ClarificationEmail) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
  const lastIn = inbound.sort(sortByAdded)[0];
  const lastOut = outbound.sort(sortByAdded)[0];
  clone.lastInboundAt = lastIn ? lastIn.addedAt : clone.lastInboundAt;
  clone.lastOutboundAt = lastOut ? lastOut.addedAt : clone.lastOutboundAt;

  // Determine last edited by from latest of emails/notes/attachments
  let lastActor: { ts: number; user?: string } = { ts: 0, user: undefined };
  const pushActor = (tsIso?: string, user?: string) => {
    if (!tsIso) return;
    const ts = new Date(tsIso).getTime();
    if (ts > lastActor.ts) lastActor = { ts, user };
  };
  if (emails.length) {
    emails.forEach(e => pushActor(e.addedAt, (e as any).addedBy));
  }
  const notes: ClarificationNote[] = ((c as any).notes || []) as ClarificationNote[];
  if (notes.length) {
    notes.forEach(n => pushActor(n.updatedAt || n.createdAt, n.createdBy));
  }
  const attachments: ClarificationAttachment[] = ((c as any).attachments || []) as ClarificationAttachment[];
  if (attachments.length) {
    attachments.forEach(a => pushActor(a.uploadedAt, a.uploadedBy));
  }
  if (!lastActor.user && c.lastModifiedBy) {
    // Fallback to lastModifiedBy with updatedAt timestamp
    pushActor(c.updatedAt, c.lastModifiedBy);
  }
  if (lastActor.user) clone.lastEditedBy = lastActor.user;

  // Waiting logic
  const lastInTime = clone.lastInboundAt ? new Date(clone.lastInboundAt).getTime() : 0;
  const lastOutTime = clone.lastOutboundAt ? new Date(clone.lastOutboundAt).getTime() : 0;
  if (lastOutTime > lastInTime) {
    clone.waitingOn = 'PARTNER';
  } else if (lastInTime > 0) {
    clone.waitingOn = 'US';
  }

  const refTime = Math.max(lastInTime, lastOutTime, new Date(clone.updatedAt || clone.createdAt).getTime());
  if (refTime) {
    clone.staleSinceDays = Math.max(0, Math.floor((Date.now() - refTime) / (1000 * 60 * 60 * 24)));
  }

  // Default nextActionAt: 3 days after last outbound if waiting on partner, else today
  if (clone.waitingOn === 'PARTNER') {
    let base = lastOutTime;
    if (!base) {
      const lastSent = (clone as any).lastSentAt ? new Date((clone as any).lastSentAt).getTime() : 0;
      base = lastSent || new Date(clone.updatedAt || clone.createdAt).getTime();
    }
    if (base) {
      const next = new Date(base);
      next.setDate(next.getDate() + 3);
      clone.nextActionAt = next.toISOString();
      clone.slaDueAt = clone.nextActionAt;
    }
  }

  // If status implies waiting but waitingOn not yet set (no emails present), infer waitingOn
  if (!clone.waitingOn && ['SENT', 'PENDING'].includes((clone.status as any))) {
    clone.waitingOn = 'PARTNER';
    if (!clone.nextActionAt) {
      const base = (clone as any).lastSentAt ? new Date((clone as any).lastSentAt).getTime() : new Date(clone.updatedAt || clone.createdAt).getTime();
      const next = new Date(base);
      next.setDate(next.getDate() + 3);
      clone.nextActionAt = next.toISOString();
      clone.slaDueAt = clone.nextActionAt;
    }
  }

  return clone;
}

export function deriveAll(clarifications: BilateralClarification[]): BilateralClarification[] {
  return (clarifications || []).map(deriveClarificationFields);
}
