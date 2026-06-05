import { describe, it, expect } from 'vitest';
import { generateState } from '~/utils/oauth';

describe('generateState', () => {
  it('returns a string of the requested length', () => {
    expect(generateState(32)).toHaveLength(32);
  });

  it('produces a different value on each call', () => {
    expect(generateState()).not.toBe(generateState());
  });

  it('contains only URL-safe alphanumeric characters', () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9]+$/);
  });
});
