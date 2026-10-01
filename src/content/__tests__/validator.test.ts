import { describe, expect, it } from 'vitest';
import { isWordAllowed, validateContent } from '../validator';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);

describe('content validator', () => {
  it('keurt de huidige content goed', () => {
    const result = validateContent();
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('laat "kat" toe met de MVP-grafemen', () => {
    expect(isWordAllowed('kat', MVP)).toBe(true);
  });

  it('weigert "boom" met de MVP-grafemen (b, oo ontbreken)', () => {
    expect(isWordAllowed('boom', MVP)).toBe(false);
  });

  it('weigert geblokkeerde woorden (ED 6.4)', () => {
    expect(isWordAllowed('kak', MVP)).toBe(false);
  });
});
