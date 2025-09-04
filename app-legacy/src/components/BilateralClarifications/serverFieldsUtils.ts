import { BilateralClarification } from '../../types/bilateral';
import { deriveAll } from './clarificationDerive';

// Returns the list of clarifications to use depending on whether server-provided fields are enabled.
// If serverFields is enabled, return items as-is; otherwise, derive client-side fields.
export function applyServerFieldsPolicy(
  clarifications: BilateralClarification[],
  serverFieldsEnabled: boolean
): BilateralClarification[] {
  return serverFieldsEnabled ? clarifications : deriveAll(clarifications || []);
}
