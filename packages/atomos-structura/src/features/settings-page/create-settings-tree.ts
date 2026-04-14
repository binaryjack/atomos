import type { ToolboxConfiguration, ToolboxItem, Toolset } from '@atomos-web/prime'
import { createAccordion, createButton } from '@atomos-web/prime'
import { f } from '@binaryjack/formular.dev'

import type { CustomShape } from './types/settings-page.types.js'
import { ICON_LIBRARY } from './icon-library.js'

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
      const tsPath = `ts-${tsIndex}`;

      // -- Header Title & Actions --
      const tsTitleContainer = document.createElement('div');
      tsTitleContainer.className = 'flex flex-1 items-center justify-between w-full h-full';
      
      const tsTitle = document.createElement('div');
      tsTitle.className = 'flex-1 font-medium text-slate-200';
      tsTitle.textContent = `${toolset.name} (Toolset)`;

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
          id: `new-item-${Date.now()}`,
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
         if (confirm(`Delete toolset ${toolset.name}?`)) {
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

            const itemDelBtn = document.createElement('button');
            itemDelBtn.textContent = '×';
            itemDelBtn.className = 'text-xs text-red-500 hover:text-red-400 font-bold px-2 py-1 bg-slate-800 rounded border border-slate-700';

            itemActions.appendChild(itemDelBtn);
            itemTitleContainer.appendChild(itemTitle);
            itemTitleContainer.appendChild(itemActions);

            const itemEditorContainer = document.createElement('div');
            itemEditorContainer.className = 'px-4 py-3 bg-slate-950 border border-slate-800 rounded w-full';

            // Always render form immediately for items, so it's ready when Accordion is expanded
            renderFormular(itemEditorContainer, toolItemSchema, item, (newVal) => {
              activeConfig.toolsets[tsIndex].tools[itemIndex] = { ...item, ...newVal };
              notifyChange();
              renderTree();
            }, () => {
              renderTree(); // Simply re-render to discard changes and close
            });

            itemDelBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm(`Delete tool ${item.name}?`)) {
                activeConfig.toolsets[tsIndex].tools.splice(itemIndex, 1);
                notifyChange();
                renderTree();
              }
            });

            const itemPath = `${tsPath}-item-${itemIndex}`;
            
            const itemAccordion = createAccordion({
               title: itemTitleContainer,
               children: [itemEditorContainer],
               defaultOpen: expandedSets.has(itemPath),
               className: 'w-full',
               onToggle: (isOpen) => {
                 if (isOpen) expandedSets.add(itemPath);
                 else expandedSets.delete(itemPath);
               }
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

    Object.keys(schema.shape || schema.properties || {}).forEach((key) => {
      const val = currentData[key] || '';
      const wrp = document.createElement('div');
      wrp.className = 'mb-3 flex flex-col gap-1 w-full';

      const lbl = document.createElement('label');
      lbl.className = 'text-xs text-slate-400 uppercase tracking-wider font-medium';
      lbl.textContent = key;
      wrp.appendChild(lbl);

      if (key === 'icon') {
        const previewWrap = document.createElement('div');
        previewWrap.className = 'flex gap-2 items-center';

        const svgPreview = document.createElement('div');
        svgPreview.className = 'w-8 h-8 flex-shrink-0 flex items-center justify-center text-slate-300 border border-slate-700 rounded bg-slate-950 p-1';
        
        const updatePreview = (svgContent: string) => {
          if (!svgContent) {
            svgPreview.innerHTML = `<span class="text-xs text-slate-600">??</span>`;
            return;
          }
          svgPreview.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${svgContent}
            </svg>
          `;
        };
        
        updatePreview(val); // initial load


        const select = document.createElement('select');
        select.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none w-full flex-1 min-w-0';

        let found = false;
        Object.entries(ICON_LIBRARY).forEach(([name, svgPath]) => {
          const opt = document.createElement('option');
          opt.value = svgPath;
          opt.textContent = name;
          if (svgPath === val) {
            opt.selected = true;
            found = true;
          }
          select.appendChild(opt);
        });

        if (!found && val) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = 'Custom / Current';
          opt.selected = true;
          select.appendChild(opt);
        }

        if (!val) {
           const ph = document.createElement('option');
           ph.value = '';
           ph.textContent = 'Select an icon...';
           ph.disabled = true;
           ph.selected = true;
           select.prepend(ph);
        }

        select.addEventListener('change', (e) => {
          const newVal = (e.target as HTMLSelectElement).value;
          currentData[key] = newVal;
          updatePreview(newVal);
        });
        
        previewWrap.appendChild(svgPreview);
        previewWrap.appendChild(select);
        wrp.appendChild(previewWrap);
      } else if (key === 'shape') {
        const select = document.createElement('select');
        select.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none w-full';
        
        const defaultShapes = ['box', 'rectangle', 'diamond', 'circle', 'actor', 'cylinder'];
        let found = false;
        
        defaultShapes.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
          if (s === val) {
            opt.selected = true;
            found = true;
          }
          select.appendChild(opt);
        });

        if (props.availableShapes && props.availableShapes.length > 0) {
          const group = document.createElement('optgroup');
          group.label = 'Custom Shapes';
          props.availableShapes.forEach(cs => {
            const opt = document.createElement('option');
            opt.value = cs.id;
            opt.textContent = cs.name;
            if (cs.id === val) {
              opt.selected = true;
              found = true;
            }
            group.appendChild(opt);
          });
          select.appendChild(group);
        }

        if (!found && val) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val + ' (Custom)';
          opt.selected = true;
          select.appendChild(opt);
        }

        if (!val) {
           const ph = document.createElement('option');
           ph.value = '';
           ph.textContent = 'Select a shape...';
           ph.disabled = true;
           ph.selected = true;
           select.prepend(ph);
        }

        select.addEventListener('change', (e) => {
          currentData[key] = (e.target as HTMLSelectElement).value;
        });
        wrp.appendChild(select);
        
      } else if (key === 'baseColor') {
        const colorWrap = document.createElement('div');
        colorWrap.className = 'flex gap-2 w-full';
        
        const preview = document.createElement('div');
        preview.className = 'w-10 h-10 rounded border border-slate-700 flex-shrink-0';
        preview.style.background = val || 'transparent';
        
        const inp = document.createElement('input');
        inp.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none w-full';
        inp.value = val;
        inp.addEventListener('input', (e) => {
           currentData[key] = (e.target as HTMLInputElement).value;
           preview.style.background = currentData[key];
        });
        
        colorWrap.appendChild(preview);
        colorWrap.appendChild(inp);
        wrp.appendChild(colorWrap);
        
      } else {
        const inp = document.createElement('input');
        inp.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none w-full';
        inp.value = val;
        inp.addEventListener('input', (e) => {
           currentData[key] = (e.target as HTMLInputElement).value;
        });
        wrp.appendChild(inp);
      }
      
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
    updateConfig: (newConfig: ToolboxConfiguration, newAvailableShapes?: CustomShape[]) => {
      activeConfig = JSON.parse(JSON.stringify(newConfig));
      renderTree();
    }
  };
};
