const http = require('http');
const fs = require('fs');

const html = fs.readFileSync('packages/atomos-structura/canvas.html', 'utf8');
const imports = Array.from(html.matchAll(/from\s+['"]([^'"]+)['"]/g)).map(m=>m[1]);
console.log(imports);
