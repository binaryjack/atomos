import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { createForm, f } from '@binaryjack/formular.dev'
import type { ToolboxConfiguration, ToolboxItem, Toolset } from '../../types/toolbox.types.js'
import { createButton } from '../button/create-button.js'
import { createFormularDropdown, createFormularInput, createFormularTextarea } from '../formular/index.js'

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
  const editingNodes = new Map<string, HTMLElement>();

  const container = document.createElement('div');
  container.className = 'w-full h-full flex-1 overflow-y-auto flex flex-col gap-2 p-2';

  const notifyChange = () => {
    props.onChange(JSON.parse(JSON.stringify(activeConfig)));
  };

  const renderTree = () => {
    container.innerHTML = '';
    
    activeConfig.toolsets.forEach((toolset: Toolset, tsIndex: number) => {
      const tsPath = `ts-${tsIndex}`;
      
      const tsRow = document.createElement('div');
      tsRow.className = 'flex flex-col border border-slate-700 bg-slate-800 rounded mb-2 overflow-hidden';
      
      // -- Header (Toolset) --
      const tsHeader = document.createElement('div');
      tsHeader.className = 'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors';
      
      const expandIcon = document.createElement('span');
      expandIcon.className = 'text-xs text-slate-400 w-4 text-center';
      expandIcon.textContent = expandedSets.has(tsPath) ? '▼' : '▶';
      
      const tsTitle = document.createElement('div');
      tsTitle.className = 'flex-1 font-medium text-slate-200';
      tsTitle.textContent = `${toolset.name} (Toolset)`;

      const tsActions = document.createElement('div');
      tsActions.className = 'flex gap-2';

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

      tsHeader.appendChild(expandIcon);
      tsHeader.appendChild(tsTitle);
      tsHeader.appendChild(tsActions);

      // Expansion toggle logic
      tsHeader.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return; // Ignore if clicked on buttons
        if (expandedSets.has(tsPath)) {
          expandedSets.delete(tsPath);
        } else {
          expandedSets.add(tsPath);
        }
        renderTree();
      });

      tsRow.appendChild(tsHeader);

      const tsEditorContainer = document.createElement('div');
      tsEditorContainer.className = 'px-4 py-3 bg-slate-900 border-t border-slate-700 hidden';
      tsRow.appendChild(tsEditorContainer);

      // Edit Toolset logic
      tsEditBtn.addEventListener('click', () => {
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
      tsAddBtn.addEventListener('click', () => {
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
      tsDelBtn.addEventListener('click', () => {
         if (confirm(`Delete toolset ${toolset.name}?`)) {
            activeConfig.toolsets.splice(tsIndex, 1);
            notifyChange();
            renderTree();
         }
      });

      // -- Items --
      if (expandedSets.has(tsPath)) {
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'flex flex-col gap-1 p-2 bg-slate-950 border-t border-slate-800';
        
        if (!toolset.tools || toolset.tools.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'text-xs text-slate-500 italic p-2 text-center';
          empty.textContent = 'No tools in this set.';
          itemsContainer.appendChild(empty);
        } else {
          toolset.tools.forEach((item: ToolboxItem, itemIndex: number) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'flex flex-col border border-slate-800 bg-slate-900 rounded';

            const itemHeader = document.createElement('div');
            itemHeader.className = 'flex items-center gap-2 px-3 py-2';
            
            const itemIcon = document.createElement('span');
            itemIcon.className = 'text-xs text-slate-400 w-4';
            itemIcon.innerHTML = '↳';

            const itemTitle = document.createElement('div');
            itemTitle.className = 'flex-1 text-sm text-slate-300 font-mono';
            itemTitle.textContent = item.name;

            const itemActions = document.createElement('div');
            itemActions.className = 'flex gap-2';

            const itemEditBtn = document.createElement('button');
            itemEditBtn.textContent = 'Edit';
            itemEditBtn.className = 'text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-slate-800 rounded border border-slate-700';

            const itemDelBtn = document.createElement('button');
            itemDelBtn.textContent = '×';
            itemDelBtn.className = 'text-xs text-red-500 hover:text-red-400 font-bold px-2 py-1 bg-slate-800 rounded border border-slate-700';

            itemActions.appendChild(itemEditBtn);
            itemActions.appendChild(itemDelBtn);

            itemHeader.appendChild(itemIcon);
            itemHeader.appendChild(itemTitle);
            itemHeader.appendChild(itemActions);
            itemRow.appendChild(itemHeader);

            const itemEditorContainer = document.createElement('div');
            itemEditorContainer.className = 'px-4 py-3 border-t border-slate-800 hidden';
            itemRow.appendChild(itemEditorContainer);

            // Item Edit
            itemEditBtn.addEventListener('click', () => {
              renderFormular(itemEditorContainer, toolItemSchema, item, (newVal) => {
                activeConfig.toolsets[tsIndex].tools[itemIndex] = { ...item, ...newVal };
                itemEditorContainer.classList.add('hidden');
                notifyChange();
                renderTree();
              }, () => {
                itemEditorContainer.classList.add('hidden');
              });
            });

            // Item Delete
            itemDelBtn.addEventListener('click', () => {
               if (confirm(`Delete tool ${item.name}?`)) {
                  activeConfig.toolsets[tsIndex].tools.splice(itemIndex, 1);
                  notifyChange();
                  renderTree();
               }
            });

            itemsContainer.appendChild(itemRow);
          });
        }
        tsRow.appendChild(itemsContainer);
      }

      container.appendChild(tsRow);
    });

    const addSetBtn = document.createElement('button');
    addSetBtn.className = 'w-full py-2 border-2 border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded mt-2 text-sm transition-colors';
    addSetBtn.textContent = '+ Add New Toolset';
    addSetBtn.addEventListener('click', () => {
      activeConfig.toolsets.push({
        name: 'New Toolset',
        icon: 'box',
        tools: []
      });
      notifyChange();
      renderTree();
    });
    container.appendChild(addSetBtn);
  };

  const renderFormular = async (target: HTMLElement, schema: any, values: any, onSave: (v: any) => void, onCancel: () => void) => {
    target.innerHTML = '';
    target.classList.remove('hidden');

    const formRaw = await createForm({ schema, defaultValues: values });
    const form = formRaw as unknown as IFormular<IObjectShape>;
    const isToolset = !!values.tools; // hacky check to know if we are editing a toolset
    
    const fieldCleanups: Array<() => void> = [];

    const appendField = (fieldResult: any) => {
      target.appendChild(fieldResult.element);
      if (fieldResult.cleanup) fieldCleanups.push(fieldResult.cleanup.destroy);
    };

    if (isToolset) {
      appendField(createFormularInput({ fieldName: 'name', form, label: 'Name' }));
      appendField(createFormularInput({ fieldName: 'icon', form, label: 'Icon' }));
    } else {
      appendField(createFormularInput({ fieldName: 'id', form, label: 'ID' }));
      appendField(createFormularInput({ fieldName: 'name', form, label: 'Name' }));
        const shapeOptions = [
          { value: 'circle', label: 'Circle' },
          { value: 'diamond', label: 'Diamond' },
          { value: 'oval', label: 'Oval' },
          { value: 'parallelogram', label: 'Parallelogram' },
          { value: 'chevron', label: 'Chevron' },
          { value: 'trapeze', label: 'Trapeze' },
          { value: 'rect', label: 'Rectangle' },
          ...(props.availableShapes?.map(s => ({ value: s.id, label: s.name })) || [])
        ];
        appendField(createFormularDropdown({ fieldName: 'shape', form, label: 'Shape', options: shapeOptions }));
      appendField(createFormularInput({ fieldName: 'baseColor', form, label: 'Base Color' }));
      appendField(createFormularInput({ fieldName: 'icon', form, label: 'Icon' }));
      appendField(createFormularTextarea({ fieldName: 'description', form, label: 'Description' }));
    }

    const actionRow = document.createElement('div');
    actionRow.className = 'flex justify-end gap-2 mt-4';

    const cleanAndClose = (callback: () => void) => {
      fieldCleanups.forEach(fn => fn());
      callback();
    };

    const { element: cancelBtn } = createButton({
      variant: 'ghost', size: 'sm', children: 'Cancel',
      onClick: () => cleanAndClose(onCancel)
    });

    const { element: saveBtn } = createButton({
      variant: 'primary', size: 'sm', children: 'Done',
      onClick: async () => {
        const isValid = await formRaw.validateForm();
        if (isValid) {
          const vals = formRaw.getData();
          cleanAndClose(() => onSave(vals));
        } else {
          alert('Please fix errors in the form.');
        }
      }
    });

    actionRow.appendChild(cancelBtn);
    actionRow.appendChild(saveBtn);
    target.appendChild(actionRow);
  };

  renderTree();

  return {
    element: container,
    updateConfig: (newConfig: ToolboxConfiguration, newAvailableShapes?: CustomShape[]) => {
      activeConfig = JSON.parse(JSON.stringify(newConfig));
      if (newAvailableShapes) {
        (props as any).availableShapes = newAvailableShapes;
      }
      renderTree();
    },
    cleanup: { destroy: () => { cleanupFunctions.forEach(fn => fn()); } }
  };
};
