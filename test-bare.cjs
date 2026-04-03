const fs=require('fs');
const path=require('path');
const s=new Set();
function walk(dir) {
  if(!fs.existsSync(dir)) return;
  for(const f of fs.readdirSync(dir)){
    let p=path.join(dir,f);
    if(fs.statSync(p).isDirectory()) walk(p);
    else if(p.endsWith('.js')){
      const text=fs.readFileSync(p,'utf8');
      const m=[...text.matchAll(/from\s+['\"]([^./][^'"]+)['\"]/g)];
      m.forEach(match => s.add(match[1]));
    }
  }
}
walk('packages/atomos-prime/dist');
walk('packages/atomos-structura/dist');
console.log(Array.from(s).join('\n'));