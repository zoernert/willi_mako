import { applyServerFieldsPolicy } from '../serverFieldsUtils';
import * as deriveMod from '../clarificationDerive';

describe('applyServerFieldsPolicy', () => {
  const sample = [{ id: 1 } as any, { id: 2 } as any];

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns items as-is when serverFieldsEnabled = true', () => {
    const spy = jest.spyOn(deriveMod, 'deriveAll');
    const out = applyServerFieldsPolicy(sample as any, true);
    expect(out).toBe(sample as any);
    expect(spy).not.toHaveBeenCalled();
  });

  it('calls deriveAll when serverFieldsEnabled = false', () => {
    const derived = [{ id: 'd1' } as any];
    const spy = jest.spyOn(deriveMod, 'deriveAll').mockReturnValue(derived as any);
    const out = applyServerFieldsPolicy(sample as any, false);
    expect(spy).toHaveBeenCalledWith(sample as any);
    expect(out).toBe(derived as any);
  });
});
