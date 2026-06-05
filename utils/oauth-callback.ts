export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
}

/** Extract the OAuth callback fields from a URL query string (e.g. window.location.search). */
export function parseCallbackParams(search: string): CallbackParams {
  const p = new URLSearchParams(search);
  const result: CallbackParams = {};
  const code = p.get('code');
  const state = p.get('state');
  const error = p.get('error');
  if (code) result.code = code;
  if (state) result.state = state;
  if (error) result.error = error;
  return result;
}
