const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'packages/showcase/out');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=UTF-8'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  function serveFile(targetFile) {
    fs.stat(targetFile, (err, stats) => {
      if (err) {
        serve404();
        return;
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(targetFile, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (!indexErr && indexStats.isFile()) {
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            fs.createReadStream(indexPath).pipe(res);
          } else {
            serve404();
          }
        });
        return;
      }

      if (stats.isFile()) {
        const ext = path.extname(targetFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(targetFile).pipe(res);
      } else {
        serve404();
      }
    });
  }

  function serve404() {
    if (!path.extname(safePath) && !safePath.endsWith('/')) {
      const htmlTry = filePath + '.html';
      if (fs.existsSync(htmlTry)) {
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        fs.createReadStream(htmlTry).pipe(res);
        return;
      }
    }

    const notFoundPath = path.join(PUBLIC_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.writeHead(404, { 'Content-Type': MIME_TYPES['.html'] });
      fs.createReadStream(notFoundPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }

  serveFile(filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Atomos Showcase server listening on 0.0.0.0:${PORT}`);
});
