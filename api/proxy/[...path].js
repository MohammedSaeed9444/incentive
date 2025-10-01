export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const backendBase = process.env.BACKEND_URL;
  if (!backendBase) {
    return new Response('BACKEND_URL not configured', { status: 500 });
  }

  const targetUrl = new URL(url.pathname.replace(/^\/api\/proxy/, ''), backendBase);
  targetUrl.search = url.search;

  const headers = new Headers(req.headers);
  headers.delete('host');
  // Ensure CORS headers if backend does not set them
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
