import { describe, it, expect } from 'vitest';
import { parseCallbackParams } from '~/utils/oauth-callback';

describe('parseCallbackParams', () => {
  it('extracts code and state', () => {
    expect(parseCallbackParams('?code=abc&state=xyz')).toEqual({ code: 'abc', state: 'xyz' });
  });

  it('extracts an error param', () => {
    expect(parseCallbackParams('?error=access_denied')).toEqual({ error: 'access_denied' });
  });

  it('returns an empty object when no relevant params are present', () => {
    expect(parseCallbackParams('')).toEqual({});
  });
});
