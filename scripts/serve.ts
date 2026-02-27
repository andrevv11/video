import { join, extname } from 'path';

const PUBLIC_DIR = join(import.meta.dir, '..', 'public');
const PORT = 3000;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.ogg':  'video/ogg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Default to index.html
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const filePath = join(PUBLIC_DIR, pathname);

    // Security: prevent directory traversal outside PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      // Fall back to index.html for SPA-style routing
      const index = Bun.file(join(PUBLIC_DIR, 'index.html'));
      return new Response(index, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    // Support range requests for video seeking
    const rangeHeader = req.headers.get('Range');
    if (rangeHeader && (ext === '.mp4' || ext === '.webm' || ext === '.ogg')) {
      const size = file.size;
      const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : size - 1;

      if (start >= size || end >= size) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        });
      }

      const chunk = file.slice(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
        },
      });
    }

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    });
  },
});

console.log(`\n  Video Gallery dev server`);
console.log(`  http://localhost:${server.port}\n`);
