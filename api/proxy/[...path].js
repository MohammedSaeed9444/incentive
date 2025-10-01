export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const backendBase = process.env.BACKEND_URL || 'https://incentive-production.up.railway.app';
  if (!backendBase) {
    return new Response('BACKEND_URL not configured', { status: 500 });
  }

  // Extract path after /api/proxy and ensure backend gets /api/<path>
  const afterProxy = url.pathname.replace(/^\/api\/proxy/, '');
  const forwardPath = `/api${afterProxy}`; // backend blueprints are mounted at /api
  const targetUrl = new URL(forwardPath, backendBase);
  targetUrl.search = url.search;

  // Handle CORS preflight quickly
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      },
    });
  }

  const headers = new Headers(req.headers);
  headers.delete('host');

  const proxied = await fetch(targetUrl.toString(), {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    redirect: 'manual',
  });

  const respHeaders = new Headers(proxied.headers);
  respHeaders.set('access-control-allow-origin', '*');
  respHeaders.set('access-control-allow-headers', '*');
  respHeaders.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  return new Response(proxied.body, { status: proxied.status, headers: respHeaders });
}
