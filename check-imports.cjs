const fs = require('fs');
const glob = require('path');
function walk(dir) {
  let found = 0;
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = require('path').join(dir, ent.name);
    if (ent.isDirectory()) found += walk(p);
    else if (p.endsWith('.ts')) {
      const code = fs.readFileSync(p, 'utf8');
      if (/(from|import)\s+([\'\"])([\.\/A-Za-z0-9_\-]+)\2/g.test(code)) {
         let mm = code.match(/(from|import)\s+([\'\"])([\.\/A-Za-z0-9_\-]+)\2/g);
         for(let m of mm) {
           if (!m.includes('./')) {
              console.log('Bare module: ', p, m);
           }
         }
      }
    }
  }
  return found;
}
console.log('Missing :', walk('d:/Sources/vbe2/packages/atomos-prime/src'));