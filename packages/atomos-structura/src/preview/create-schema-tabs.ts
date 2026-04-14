import { getGlobalReduxStore } from '../core/create-redux-store.js';
// Side-effect import: registers vbs-tab and vbs-tabs as custom elements
import '@atomos-web/prime';

const TAB_H = 36;

export interface SchemaTabsResult {
  readonly element: HTMLElement;
  readonly height: number;
  readonly cleanup: { destroy: () => void };
}

export const createSchemaTabs = function(): SchemaTabsResult {
  const store = getGlobalReduxStore();
  const cleanups: Array<() => void> = [];

  // Outer bar — full-width strip at top of canvas
  const bar = document.createElement('div');
  bar.style.cssText = [
    'position:absolute;top:0;left:0;right:0;',
    `height:${TAB_H}px;`,
    'display:flex;align-items:flex-end;z-index:40;',
    'background:var(--vbs-bg-canvas, #000);',
    'border-bottom:1px solid var(--vbs-border, #27272a);',
  ].join('');

  // vbs-tabs hosts the scrollable tab list; panels are hidden via variant=canvas CSS
  const tabsEl = document.createElement('vbs-tabs') as HTMLElement & { activeTab: string | null };
  tabsEl.setAttribute('variant', 'canvas');
  bar.appendChild(tabsEl);

  // + button — hidden when allow_multiple_schemas is disabled
  const isMultiSchemaAllowed = store.get_state().workspace.config?.allow_multiple_schemas !== false;
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.title = 'New schema';
  addBtn.textContent = '+';
  addBtn.style.cssText = [
    'background:none;border:none;cursor:pointer;flex-shrink:0;',
    'width:28px;height:28px;display:flex;align-items:center;justify-content:center;',
    'font-size:18px;line-height:1;border-radius:4px 4px 0 0;',
    'color:var(--vbs-text-secondary,#a1a1aa);transition:color 0.15s;',
    'margin-right:4px;',
  ].join('');
  addBtn.addEventListener('mouseenter', () => { addBtn.style.color = 'var(--vbs-text-primary,#f4f4f5)'; });
  addBtn.addEventListener('mouseleave', () => { addBtn.style.color = 'var(--vbs-text-secondary,#a1a1aa)'; });
  addBtn.addEventListener('click', () => {
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    const id = `schema-${Date.now()}`;
    const name = `Schema ${Object.keys(canvas?.schemas ?? {}).length + 1}`;
    store.dispatch({ type: 'schema-created', id, name });
  });
  if (isMultiSchemaAllowed) {
    bar.appendChild(addBtn);
  }

  // ── Inline rename helper ──────────────────────────────────────────────────
  const startRename = (tab: HTMLElement, labelSpan: HTMLElement, id: string, current: string): void => {
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
    labelSpan.replaceWith(input);
    input.focus();
    input.select();
    let committed = false;
    const commit = (cancel = false): void => {
      if (committed) return;
      committed = true;
      if (cancel) {
        renderTabs();
        return;
      }
      const name = input.value.trim() || current;
      store.dispatch({ type: 'schema-renamed', id, name });
    };
    input.addEventListener('blur', () => commit());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); commit(true); }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderTabs = (): void => {
    // Remove previously slotted vbs-tab elements only
    Array.from(tabsEl.querySelectorAll('vbs-tab')).forEach(el => el.remove());

    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    const schemas = Object.values(canvas?.schemas ?? {});
    const activeId = canvas?.active_schema_id ?? '';

    // Keep vbs-tabs in sync (drives [selected] attribute on the active tab)
    tabsEl.setAttribute('active-tab', activeId);

    schemas.forEach((schema) => {
      const tab = document.createElement('vbs-tab') as HTMLElement;
      tab.setAttribute('slot', 'tab');
      tab.setAttribute('value', schema.id);
      tab.setAttribute('variant', 'canvas');
      if (schemas.length > 1) tab.setAttribute('closeable', '');

      const label = document.createElement('span');
      label.textContent = schema.name;
      label.style.cssText = 'pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;';
      tab.appendChild(label);

      tab.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRename(tab, label, schema.id, schema.name);
      });

      tabsEl.appendChild(tab);
    });
  };

  // ── Event wiring via delegation — avoids setAttribute→change→dispatch loop
  bar.addEventListener('vbs-tab-click', (e: Event) => {
    const id = (e as CustomEvent).detail?.value as string | undefined;
    if (!id) return;
    const canvas = store.get_state().workspace.canvases[store.get_state().workspace.active_canvas_id];
    if (id !== canvas?.active_schema_id) store.dispatch({ type: 'schema-activated', id });
  });

  bar.addEventListener('vbs-tab-close', (e: Event) => {
    const id = (e as CustomEvent).detail?.value as string | undefined;
    if (!id) return;
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    const hasEntities = (canvas?.schemas[id]?.entities.length ?? 0) > 0;
    if (hasEntities && !confirm(`Delete schema "${canvas?.schemas[id]?.name}" and all its entities?`)) return;
    store.dispatch({ type: 'schema-deleted', id });
  });

  renderTabs();
  cleanups.push(store.subscribe(renderTabs));

  return {
    element: bar,
    height: TAB_H,
    cleanup: { destroy: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; } },
  };
};
