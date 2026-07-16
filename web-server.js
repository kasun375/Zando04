#!/usr/bin/env node
// =====================================================
// ZANDO Web App Server — Node.js version
// Replaces web-server.py for more reliable serving.
// Usage: node web-server.js [port]
// =====================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = parseInt(process.argv[2] || '3000', 10);
const SERVE_DIR = path.resolve(__dirname, 'zando-web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain',
  '.pdf':  'application/pdf',
};

const server = http.createServer((req, res) => {
  // Strip query string
  let urlPath = req.url.split('?')[0];

  // Normalise to index.html for root
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.join(SERVE_DIR, urlPath);

  // Security: don't escape serve directory
  const relative = path.relative(SERVE_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback — return index.html for unknown routes
        fs.readFile(path.join(SERVE_DIR, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(d2);
        });
      } else {
        res.writeHead(500); res.end('Server error: ' + err.message);
      }
      return;
    }

    const headers = {
      'Content-Type': mime,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    };

    res.writeHead(200, headers);
    res.end(data);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → 200`);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use.`);
    console.error('Close the existing server or run: node web-server.js 3001\n');
  } else {
    console.error('[ERROR]', e.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('='.repeat(52));
  console.log('  ZANDO Web App Server — Node.js');
  console.log('='.repeat(52));
  console.log(`  Serving: ${SERVE_DIR}`);
  console.log(`  URL:     http://127.0.0.1:${PORT}`);
  console.log('='.repeat(52));
  console.log('  Keep this window open while testing.');
  console.log('  Press Ctrl+C to stop.\n');
});

process.on('SIGINT', () => { console.log('\nServer stopped.'); process.exit(0); });
