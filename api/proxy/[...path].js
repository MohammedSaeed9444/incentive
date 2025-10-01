const DEFAULT_BACKEND = process.env.BACKEND_URL || 'https://incentive-production.up.railway.app';

module.exports = async (req, res) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-headers', '*');
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      return res.status(204).end();
    }

    const backendBase = DEFAULT_BACKEND;
    if (!backendBase) {
      return res.status(500).json({ error: 'BACKEND_URL not configured' });
    }

    // Extract catch-all path segments from Vercel
    const pathSegments = req.query.path;
    const suffix = Array.isArray(pathSegments) ? '/' + pathSegments.join('/') : (pathSegments ? '/' + pathSegments : '');

    // Ensure backend gets /api/<path>
    const forwardPath = `/api${suffix}`;

    // Preserve original query string
    const originalUrl = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = new URL(forwardPath, backendBase);
    targetUrl.search = originalUrl.search;

    // Copy headers except host
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() === 'host') continue;
      // Node may give headers as string | string[]
      if (Array.isArray(v)) {
        headers.set(k, v.join(', '));
      } else if (typeof v === 'string') {
        headers.set(k, v);
      }
    }

    const init = {
      method: req.method,
      headers,
      // For GET/HEAD, no body
      body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : req,
      redirect: 'manual',
    };

    const proxied = await fetch(targetUrl.toString(), init);

    // Set CORS headers on response
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    // Forward response headers (basic subset)
    for (const [k, v] of proxied.headers.entries()) {
      if (k.toLowerCase() === 'content-length') continue; // will be recalculated
      res.setHeader(k, v);
    }

    // Stream body
    res.status(proxied.status);
    const reader = proxied.body?.getReader?.();
    if (reader) {
      // If web stream, convert to node stream
      const { Readable } = require('stream');
      const stream = new Readable({ read() {} });
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            stream.push(Buffer.from(value));
          }
          stream.push(null);
        } catch (e) {
          stream.destroy(e);
        }
      })();
      return stream.pipe(res);
    } else {
      const arrayBuffer = await proxied.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    res.setHeader('content-type', 'application/json');
    return res.status(502).send(JSON.stringify({ error: 'Bad gateway', message: String(err && err.message || err) }));
  }
};
