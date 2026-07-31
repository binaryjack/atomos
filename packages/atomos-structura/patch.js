const fs = require('fs');
const path = './src/preview/create-canvas-page.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /cleanups\.push\(viewport\.state\.subscribe\(applyViewport\)\);/g,
  `if (!viewport?.state?.subscribe) console.error("VIEWPORT STATE IS MISSING SUBSCRIBE", viewport); else cleanups.push(viewport.state.subscribe(applyViewport));`
);

code = code.replace(
  /cleanups\.push\(\n\s*validator\.subscribe\(warnings => {/g,
  `if (!validator?.subscribe) console.error("VALIDATOR IS MISSING SUBSCRIBE", validator);\n  else cleanups.push(\n    validator.subscribe(warnings => {`
);

code = code.replace(
  /cleanups\.push\(\n\s*rubberBand\.subscribe\(ids => {/g,
  `if (!rubberBand?.subscribe) console.error("RUBBERBAND IS MISSING SUBSCRIBE", rubberBand);\n  else cleanups.push(\n    rubberBand.subscribe(ids => {`
);

code = code.replace(
  /cleanups\.push\(\n\s*store\.subscribe\(\(\) => {/g,
  `if (!store?.subscribe) console.error("STORE IS MISSING SUBSCRIBE", store);\n  else cleanups.push(\n    store.subscribe(() => {`
);

fs.writeFileSync(path, code);
