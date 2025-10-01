const https = require('https');
const http = require('http');

const DEFAULT_BACKEND = process.env.BACKEND_URL || 'https://incentive-production.up.railway.app';

module.exports = (req, res) => {
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

  // Build target URL
  const targetUrl = new URL(forwardPath, backendBase);
  // Preserve query string from original request
  const originalUrl = new URL(req.url, `http://${req.headers.host}`);
  targetUrl.search = originalUrl.search;

  // Copy headers except host
  const headers = { ...req.headers };
  delete headers.host;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: headers
  };

  const client = targetUrl.protocol === 'https:' ? https : http;
  
  const proxyReq = client.request(options, (proxyRes) => {
    // Set CORS headers
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    // Forward status and headers
    res.statusCode = proxyRes.statusCode;
    Object.keys(proxyRes.headers).forEach(key => {
      if (key.toLowerCase() !== 'content-length') {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });

    // Pipe response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Bad gateway', message: err.message });
  });

  // Pipe request body for POST/PUT/PATCH
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
};
