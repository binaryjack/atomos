const fs = require('fs');
const path = require('path');

function patch(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) patch(full);
    else if (full.endsWith('.ts')) {
      let code = fs.readFileSync(full, 'utf8');
      let changed = false;
      
      const p1 = /(#onFocus|#onBlur|#onChange|#onInput)\(\)/g;
      
      if (code.match(p1)) {
        code = code.replace(/(#on(Focus|Blur|Change|Input))\(\)/g, '$1 = (e?: Event) =>');
        changed = true;
      }
      
      if (code.includes('this.#on')) {
        code = code.replace(/this\.(#on(Focus|Blur|Change|Input))\s*=\s*this\.\1\.bind\(this\);/g, '');
        changed = true;
      }

      if (code.includes('formular/atoms/create-formular-')) {
        code = code.replace(/formular\/atoms\/create-formular-(input|dropdown|checkbox|textarea)\.js/g, 'formular/index.js');
        code = code.replace(/\.\.\/features\/formular\/atoms\/create-formular-(input|dropdown|checkbox|textarea)\.js/g, '../features/formular/index.js');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(full, code);
      }
    }
  }
}
patch('d:/Sources/vbe2/packages/atomos-prime/src');
