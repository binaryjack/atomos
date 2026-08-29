import type { DAGExchange } from '../../core/application/dag-service.js';

export interface StandaloneHtmlOptions {
  readonly title?: string;
  readonly theme?: 'dark' | 'light';
  readonly schema: DAGExchange;
}

export const generateStandaloneHtml = function(options: StandaloneHtmlOptions): string {
  const schemaJson = JSON.stringify(options.schema);
  const title = options.title || 'Atomos Structura Architecture Map';

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #020617; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    #header { height: 48px; background: #090d16; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 50; }
    #header .title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
    #header .badge { font-size: 10px; font-weight: 700; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 4px; }
    #viewer-container { width: 100%; height: calc(100% - 48px); position: relative; }
  </style>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@atomos-web/structura@5.0.0/dist/viewer/atomos-structura-viewer.js"></script>
</head>
<body>
  <div id="header">
    <div class="title">${title}</div>
    <div class="badge">STANDALONE VERIFIED DIAGRAM</div>
  </div>
  <div id="viewer-container">
    <atomos-structura-viewer id="viewer" enable-inspector-drawer="true" drawer-mode="push"></atomos-structura-viewer>
  </div>
  <script>
    const schemaData = ${schemaJson};
    window.addEventListener('DOMContentLoaded', () => {
      const viewer = document.getElementById('viewer');
      if (viewer && typeof viewer.setSchema === 'function') {
        viewer.setSchema(schemaData);
      } else {
        customElements.whenDefined('atomos-structura-viewer').then(() => {
          document.getElementById('viewer').setSchema(schemaData);
        });
      }
    });
  </script>
</body>
</html>`;
};
