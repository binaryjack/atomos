const fs = require('fs');
const path = require('path');
function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const ent of entries) {
    const fullPath = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fullPath);
    else if (fullPath.endsWith('.ts')) {
      let code = fs.readFileSync(fullPath, 'utf8');
      const startCode = code;

      // Find `from './...';` and `import './...';`
      const matches = code.match(/(from|import)\s+([\'\"])([\.\/A-Za-z0-9_\-]+)\2/g);
      if (matches && fullPath.endsWith('index.ts')) {
        console.log("Matches in index.ts:", matches);
      }
      code = code.replace(/(from|import)\s+([\'\"])([\.\/A-Za-z0-9_\-]+)\2/g, (match, type, q, p) => {
         if (p.endsWith('.js') || p.endsWith('.ts')) return match;
         if (!p.startsWith('.')) return match;
         return `${type} ${q}${p}.js${q}`;
      });

      if (startCode !== code) {
         fs.writeFileSync(fullPath, code);
         console.log('Patched ' + fullPath);
      }
    }
  }
}
console.log("Starting patch-imports");
walk('d:/Sources/vbe2/packages/atomos-prime/src');
console.log("Done");