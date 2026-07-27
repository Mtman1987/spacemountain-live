type RequestHeaders = Record<string, string | string[] | undefined>;

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function buildSpmtProxyHeaders(
  requestHeaders: RequestHeaders,
  token: string,
  hasBody: boolean,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (hasBody) headers['Content-Type'] = 'application/json';

  const ifMatch = firstHeaderValue(requestHeaders['if-match']);
  if (ifMatch) headers['If-Match'] = ifMatch;

  return headers;
}
