export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) headers.set('X-ARMS-Request', '1');
  const response = await fetch(`/api${path}`, { ...options, headers, credentials:'same-origin' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body:JSON.stringify(body) }),
});
