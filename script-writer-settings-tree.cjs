const fs = require('fs');

const code = `import type { ToolboxConfiguration, ToolboxItem, Toolset } from '@atomos/prime'
import { createAccordion, createButton, createFormularDropdown, createFormularInput, createFormularTextarea } from '@atomos/prime'
import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { createForm, f } from '@binaryjack/formular.dev'

import type { CustomShape } from './types/settings-page.types.js'

export interface VisualEditorTreeProps {
  readonly config: ToolboxConfiguration;
  readonly availableShapes: CustomShape[];
  readonly onChange: (newConfig: ToolboxConfiguration) => void;
}

export interface VisualEditorTreeResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
  readonly updateConfig: (config: ToolboxConfiguration, newAvailableShapes?: CustomShape[]) => void;
}

// Schemas
const toolsetSchema = f.object({
  name: f.string(),
  icon: f.string(),
});

const toolItemSchema = f.object({
  id: f.string(),
  name: f.string(),
  shape: f.string(),
  baseColor: f.string(),
  icon: f.string(),
  description: f.string().optional(),
  action: f.string().optional(),
});

export const createVisualEditorTree = function(props: VisualEditorTreeProps): VisualEditorTreeResult {
  let activeConfig = JSON.parse(JSON.stringify(props.config));
  const cleanupFunctions: Array<() => void> = [];
  const expandedSets = new Set<string>();

  const container = document.createElement('div');
  container.className = 'w-full h-full flex-1 overflow-y-auto flex flex-col gap-2 p-2';

  const notifyChange = () => {
    props.onChange(JSON.parse(JSON.stringify(activeConfig)));
  };

  const renderTree = () => {
    container.innerHTML = '';
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;

    activeConfig.toolsets.forEach((toolset: Toolset, tsIndex: number) => {      
      const tsPath = \`ts-\${tsIndex}\`;

      // -- Header Title & Actions --
      const tsTitleContainer = document.createElement('div');
      tsTitleContainer.className = 'flex flex-1 items-center justify-between w-full h-full';
      
      const tsTitle = document.createElement('div');
      tsTitle.className = 'flex-1 font-medium text-slate-200';
      tsTitle.textContent = \`\${toolset.name} (Toolset)\`;

      const tsActions = document.createElement('div');
      tsActions.className = 'flex gap-2 items-center';

      const tsEditBtn = document.createElement('button');
      tsEditBtn.textContent = 'Edit';
      tsEditBtn.className = 'text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-slate-900 rounded border border-slate-700';

      const tsAddBtn = document.createElement('button');
      tsAddBtn.innerHTML = '+ Item';
      tsAddBtn.className = 'text-xs text-green-400 hover:text-green-300 px-2 py-1 bg-slate-900 rounded border border-slate-700';

      const tsDelBtn = document.createElement('button');
      tsDelBtn.textContent = '×';
      tsDelBtn.className = 'text-xs text-red-500 hover:text-red-400 font-bold px-2 py-1 bg-slate-900 rounded border border-slate-700';

      tsActions.appendChild(tsEditBtn);
      tsActions.appendChild(tsAddBtn);
      tsActions.appendChild(tsDelBtn);

      tsTitleContainer.appendChild(tsTitle);
      tsTitleContainer.appendChild(tsActions);

      const tsEditorContainer = document.createElement('div');
      tsEditorContainer.className = 'px-4 py-3 bg-slate-950 border border-slate-700 rounded w-full mb-2 hidden shrink-0';

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'flex flex-col gap-1 w-full bg-slate-900 shrink-0';

      // Edit Toolset logic
      tsEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tsEditorContainer.classList.remove('hidden');
        renderFormular(tsEditorContainer, toolsetSchema, toolset, (newVal) => { 
          activeConfig.toolsets[tsIndex] = { ...activeConfig.toolsets[tsIndex], ...newVal };
          tsEditorContainer.classList.add('hidden');
          notifyChange();
          renderTree(); // refresh view
        }, () => {
          tsEditorContainer.classList.add('hidden');
        });
      });

      // Add Item logic
      tsAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newItem: ToolboxItem = {
          id: \`new-item-\${Date.now()}\`,
          name: 'New Tool',
          shape: 'box',
          baseColor: 'var(--vbs-primary, #3b82f6)',
          icon: 'box'
        };
        activeConfig.toolsets[tsIndex].tools.push(newItem);
        expandedSets.add(tsPath); // ensure open
        notifyChange();
        renderTree();
      });

      // Delete Toolset logic
      tsDelBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         if (confirm(\`Delete toolset \${toolset.name}?\`)) {
            activeConfig.toolsets.splice(tsIndex, 1);
            notifyChange();
            renderTree();
         }
      });

      if (!toolset.tools || toolset.tools.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'text-xs text-slate-500 italic p-2 text-center w-full';    
          empty.textContent = 'No tools in this set.';
          itemsContainer.appendChild(empty);
      } else {
          toolset.tools.forEach((item: ToolboxItem, itemIndex: number) => {     
            const itemTitleContainer = document.createElement('div');
            itemTitleContainer.className = 'flex flex-1 items-center justify-between w-full';

            const itemTitle = document.createElement('div');
            itemTitle.className = 'flex-1 text-sm text-slate-300 font-mono';    
            itemTitle.textContent = item.name;

            const itemActions = document.createElement('div');
            itemActions.className = 'flex gap-2 items-center';

            const itemEditBtn = document.createElement('button');
            itemEditBtn.textContent = 'Edit';
            itemEditBtn.className = 'text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-slate-800 rounded border border-slate-700';

            const itemDelBtn = document.createElement('button');
            itemDelBtn.textContent = '×';
            itemDelBtn.className = 'text-xs text-red-500 hover:text-red-400 font-bold px-2 py-1 bg-slate-800 rounded border border-slate-700';

            itemActions.appendChild(itemEditBtn);
            itemActions.appendChild(itemDelBtn);
            itemTitleContainer.appendChild(itemTitle);
            itemTitleContainer.appendChild(itemActions);

            const itemEditorContainer = document.createElement('div');
            itemEditorContainer.className = 'px-4 py-3 bg-slate-950 border border-slate-800 rounded w-full hidden';

            itemEditBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              itemEditorContainer.classList.remove('hidden');
              renderFormular(itemEditorContainer, toolItemSchema, item, (newVal) => {
                activeConfig.toolsets[tsIndex].tools[itemIndex] = { ...item, ...newVal };
                itemEditorContainer.classList.add('hidden');
                notifyChange();
                renderTree();
              }, () => {
                itemEditorContainer.classList.add('hidden');
              });
            });

            itemDelBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm(\`Delete tool \${item.name}?\`)) {
                activeConfig.toolsets[tsIndex].tools.splice(itemIndex, 1);
                notifyChange();
                renderTree();
              }
            });

            const itemAccordion = createAccordion({
               title: itemTitleContainer,
               children: [itemEditorContainer],
               defaultOpen: false,
               className: 'w-full'
            });

            cleanupFunctions.push(itemAccordion.cleanup.destroy);
            itemsContainer.appendChild(itemAccordion.element);
          });
      }

      const tsAccordion = createAccordion({
         title: tsTitleContainer,
         children: [tsEditorContainer, itemsContainer],
         defaultOpen: expandedSets.has(tsPath),
         className: 'w-full mb-2',
         onToggle: (isOpen) => {
            if (isOpen) expandedSets.add(tsPath);
            else expandedSets.delete(tsPath);
         }
      });
      cleanupFunctions.push(tsAccordion.cleanup.destroy);

      container.appendChild(tsAccordion.element);
    });

    const rootAddBtn = createButton({ children: 'Add Toolset', variant: 'primary', size: 'sm' });
    rootAddBtn.element.className += ' mt-4 shrink-0 shrink';
    rootAddBtn.element.addEventListener('click', () => {
      activeConfig.toolsets.push({
        name: 'New Toolset',
        icon: 'tool',
        tools: []
      });
      notifyChange();
      renderTree();
    });
    
    container.appendChild(rootAddBtn.element);
  };

  renderTree(); // First draw

  // Minimal standard renderFormular mapping (reused from your existing file)
  function renderFormular(parent: HTMLElement, schema: any, initialData: any, onSave: (data: any) => void, onCancel: () => void) {
    parent.innerHTML = '';
    let currentData = { ...initialData };
    const form = createForm(schema);

    Object.keys(schema.properties).forEach((key) => {
      const val = currentData[key] || '';
      const wrp = document.createElement('div');
      wrp.className = 'mb-3 flex flex-col gap-1 w-full';

      const lbl = document.createElement('label');
      lbl.className = 'text-xs text-slate-400 uppercase tracking-wider font-medium';
      lbl.textContent = key;
      wrp.appendChild(lbl);

      const inp = document.createElement('input');
      inp.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none w-full';
      inp.value = val;
      inp.addEventListener('input', (e) => {
         currentData[key] = (e.target as HTMLInputElement).value;
      });
      wrp.appendChild(inp);
      parent.appendChild(wrp);
    });

    const btns = document.createElement('div');
    btns.className = 'flex gap-2 justify-end mt-4';
    
    const cancelBtn = createButton({ children: 'Cancel', variant: 'ghost', size: 'sm' });
    cancelBtn.element.addEventListener('click', onCancel);

    const saveBtn = createButton({ children: 'Save', variant: 'primary', size: 'sm' });
    saveBtn.element.addEventListener('click', () => {
       onSave(currentData);
    });

    btns.appendChild(cancelBtn.element);
    btns.appendChild(saveBtn.element);
    parent.appendChild(btns);
  }

  return {
    element: container,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    },
    updateConfig: (newConfig: ToolboxConfiguration) => {
      activeConfig = JSON.parse(JSON.stringify(newConfig));
      renderTree();
    }
  };
};
`;

fs.writeFileSync('packages/atomos-structura/src/features/settings-page/create-settings-tree.ts', code);
console.log('Settings tree refactored to use createAccordion exclusively.');
