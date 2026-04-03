const fs = require('fs');
const path = 'e:/Sources/atomos-monorepo/packages/atomos-structura/src/preview/create-canvas-page.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes(`import { getGlobalReduxStore }`)) {
  content = content.replace(
    `import { createCanvasToolbar } from './create-canvas-toolbar.js'`,
    `import { createCanvasToolbar } from './create-canvas-toolbar.js'\nimport { getGlobalReduxStore } from '../core/create-redux-store.js'`
  );
}

const anchor = `      root.appendChild(settingsPage.element);
    },`;

const insert = `
      settingsPage.element.addEventListener('request-backup', () => {
        const store = getGlobalReduxStore();
        const state = store.get_state();
        
        // Also include localStorage settings directly in the backup so they are synced
        const backupData = {
          reduxState: state,
          toolbox: getToolboxConfig(),
          shapes: getCustomShapes()
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`atomos-workspace-\${new Date().toISOString().split('T')[0]}.json\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      settingsPage.element.addEventListener('request-restore', (e) => {
        const customEvent = e as CustomEvent<{ json: string }>;
        if (customEvent.detail?.json) {
          try {
            const restoredData = JSON.parse(customEvent.detail.json);
            
            // Handle new format OR old format (raw redux state)
            const reduxState = restoredData.reduxState || restoredData;
            
            if (restoredData.toolbox) setToolboxConfig(restoredData.toolbox);
            if (restoredData.shapes) setCustomShapes(restoredData.shapes);

            const store = getGlobalReduxStore();
            store.dispatch({ type: 'state-loaded', state: reduxState });
            
            window.alert('Workspace restored successfully!');
            window.location.reload();
          } catch (err) {
            console.error('Restore failed', err);
            window.alert('Failed to restore from JSON file. Invalid format.');
          }
        }
      });

`;

content = content.replace(anchor, insert + anchor);
fs.writeFileSync(path, content, 'utf8');
console.log('patched canvas backup');
