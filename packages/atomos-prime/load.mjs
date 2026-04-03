import fs from 'fs';
import path from 'path';

const loaded = new Set();
function scan(file) {
    if (loaded.has(file)) return;
    loaded.add(file);
    try {
        const code = fs.readFileSync(file, 'utf8');
        const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
        for (let imp of imports) {
            if (imp.startsWith('.')) {
                let resolved = path.resolve(path.dirname(file), imp);
                // Simple resolution
                if (fs.existsSync(resolved)) {
                    if (fs.statSync(resolved).isDirectory()) {
                        resolved = path.join(resolved, 'index.js');
                    }
                } else if (fs.existsSync(resolved + '.js')) {
                    resolved += '.js';
                }
                scan(resolved);
            }
        }
    } catch (e) {
        console.log('FAILED TO LOAD', file);
    }
}
scan('../atomos-structura/dist/preview/create-canvas-page.js');
console.log('Done scanning module tree.');
