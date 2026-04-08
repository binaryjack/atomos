import { getGlobalReduxStore } from '../core/create-redux-store.js';

const TAB_H = 36;

export interface SchemaTabsResult {
  readonly element: HTMLElement;
  readonly height: number;
  readonly cleanup: { destroy: () => void };
}

export const createSchemaTabs = function(): SchemaTabsResult {
  const store = getGlobalReduxStore();
  const cleanups: Array<() => void> = [];

  const bar = document.createElement('div');
  bar.style.cssText = [
    'position:absolute;top:0;left:0;right:0;',
    `height:${TAB_H}px;`,
    'display:flex;align-items:flex-end;gap:0;z-index:40;',
    'background:var(--vbs-bg-canvas, #000);',
    'border-bottom:1px solid var(--vbs-border, #27272a);',
    'padding:0 8px;user-select:none;overflow-x:auto;overflow-y:hidden;',
    'scrollbar-width:none;',
  ].join('');

  const renderTabs = (): void => {
    bar.innerHTML = '';
    const st = store.get_state();
    const schemas = Object.values(st.schemas);

    schemas.forEach((schema) => {
      const isActive = schema.id === st.active_schema_id;

      const tab = document.createElement('div');
      tab.style.cssText = [
        'display:flex;align-items:center;gap:6px;',
        'height:28px;padding:0 10px;',
        'border:1px solid;border-bottom:none;',
        'border-radius:4px 4px 0 0;',
        'cursor:pointer;white-space:nowrap;',
        'font-size:12px;font-family:system-ui,sans-serif;',
        'transition:background 0.15s;',
        isActive
          ? 'background:var(--vbs-bg-panel,#111);border-color:var(--vbs-border,#27272a);color:var(--vbs-text-primary,#f4f4f5);'
          : 'background:transparent;border-color:transparent;color:var(--vbs-text-secondary,#a1a1aa);',
      ].join('');

      // Label (double-click to rename)
      const label = document.createElement('span');
      label.textContent = schema.name;
      label.style.cssText = 'pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;';

      tab.appendChild(label);

      tab.addEventListener('click', () => {
        if (!isActive) {
          store.dispatch({ type: 'schema-activated', id: schema.id });
        }
      });

      tab.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRename(tab, label, schema.id, schema.name);
      });

      // Close button (only if more than one schema)
      if (schemas.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close schema';
        closeBtn.style.cssText = [
          'background:none;border:none;cursor:pointer;padding:0;',
          'width:14px;height:14px;display:flex;align-items:center;justify-content:center;',
          'font-size:14px;line-height:1;',
          isActive ? 'color:var(--vbs-text-secondary,#a1a1aa);' : 'color:#52525b;',
          'border-radius:2px;flex-shrink:0;',
        ].join('');
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = 'var(--vbs-danger,#ef4444)'; });
        closeBtn.addEventListener('mouseleave', () => {
          closeBtn.style.color = isActive ? 'var(--vbs-text-secondary,#a1a1aa)' : '#52525b';
        });
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const hasEntities = (store.get_state().schemas[schema.id]?.entities.length ?? 0) > 0;
          if (hasEntities && !confirm(`Delete schema "${schema.name}" and all its entities?`)) return;
          store.dispatch({ type: 'schema-deleted', id: schema.id });
        });
        tab.appendChild(closeBtn);
      }

      bar.appendChild(tab);
    });

    // New schema button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.title = 'New schema';
    addBtn.style.cssText = [
      'background:none;border:none;cursor:pointer;',
      'width:28px;height:28px;align-self:flex-end;',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:18px;line-height:1;border-radius:4px 4px 0 0;',
      'color:var(--vbs-text-secondary,#a1a1aa);transition:color 0.15s;',
    ].join('');
    addBtn.addEventListener('mouseenter', () => { addBtn.style.color = 'var(--vbs-text-primary,#f4f4f5)'; });
    addBtn.addEventListener('mouseleave', () => { addBtn.style.color = 'var(--vbs-text-secondary,#a1a1aa)'; });
    addBtn.addEventListener('click', () => {
      const id = `schema-${Date.now()}`;
      const name = `Schema ${Object.keys(store.get_state().schemas).length + 1}`;
      store.dispatch({ type: 'schema-created', id, name });
    });
    bar.appendChild(addBtn);
  };

  const startRename = (tab: HTMLElement, label: HTMLSpanElement, id: string, current: string): void => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText = [
      'background:var(--vbs-bg-input,#09090b);',
      'color:var(--vbs-text-primary,#f4f4f5);',
      'border:1px solid var(--vbs-primary,#3b82f6);',
      'border-radius:2px;outline:none;',
      'font-size:12px;font-family:system-ui,sans-serif;',
      'padding:1px 4px;width:100px;',
    ].join('');

    label.replaceWith(input);
    input.focus();
    input.select();

    const commit = (): void => {
      const name = input.value.trim() || current;
      store.dispatch({ type: 'schema-renamed', id, name });
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); renderTabs(); }
    });
  };

  renderTabs();
  const unsub = store.subscribe(renderTabs);
  cleanups.push(unsub);

  return {
    element: bar,
    height: TAB_H,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } },
  };
};
