const fs = require('fs');
const path = 'e:/Sources/atomos-monorepo/packages/atomos-structura/src/features/settings-page/create-settings-page.ts';
let content = fs.readFileSync(path, 'utf8');

const anchor = `  linkStyleRow.appendChild(linkStyleSelect);
  genForm.appendChild(linkStyleRow);`;

const insert = `
  // System Backup & Restore
  const backupSection = document.createElement('div');
  backupSection.className = 'mt-10 flex flex-col gap-4 border-t border-slate-800 pt-6 max-w-xl';
  backupSection.innerHTML = \`<h3 class="text-lg font-medium text-slate-200">System State & Backup</h3>
  <p class="text-slate-400 text-sm">Download a complete snapshot of your current visual workspace and all settings, or restore an existing one.</p>\`;
  
  const backupActions = document.createElement('div');
  backupActions.className = 'flex gap-3 mt-2';
  
  const { element: exportBtn } = createButton({
    variant: 'secondary',
    size: 'sm',
    children: 'Export Workspace JSON',
    onClick: () => {
      // Dispatch an event caught by the parent canvas page
      container.dispatchEvent(new CustomEvent('request-backup', { bubbles: true }));
    }
  });

  const { element: importBtn } = createButton({
    variant: 'secondary',
    size: 'sm',
    children: 'Restore from JSON...',
    onClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          container.dispatchEvent(new CustomEvent('request-restore', { 
            bubbles: true, 
            detail: { json: re.target?.result } 
          }));
        };
        reader.readAsText(file);
      };
      input.click();
    }
  });

  backupActions.appendChild(exportBtn.element || exportBtn);
  backupActions.appendChild(importBtn.element || importBtn);
  backupSection.appendChild(backupActions);

  genForm.appendChild(backupSection);
`;

content = content.replace(anchor, anchor + insert);
fs.writeFileSync(path, content, 'utf8');
console.log('patched settings page for backup');
