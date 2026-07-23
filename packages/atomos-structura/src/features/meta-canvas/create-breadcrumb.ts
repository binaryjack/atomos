import type { ReduxStore, SchemaModel } from '../../types/redux-state.types.js';

export function createBreadcrumb(container: HTMLElement, store: ReduxStore): { destroy: () => void } {
  const el = document.createElement('div');
  el.className = 'atomos-breadcrumb flex items-center gap-2 px-4 py-1.5 bg-[#090d16] border-b border-slate-800 text-xs font-mono overflow-x-auto text-slate-400 select-none';
  el.style.display = 'none'; // Hidden by default unless in Mode 3 (Meta Canvas)

  const render = () => {
    const state = store.get_state();
    const mode = state.workspace.mode ?? 1;

    // Show breadcrumbs ONLY in Mode 3 (Meta Canvas)
    if (mode !== 3) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'flex';
    el.innerHTML = '';

    const activeCanvas = state.workspace.canvases[state.workspace.active_canvas_id];
    if (!activeCanvas) return;

    const currentSchema = activeCanvas.schemas[activeCanvas.active_schema_id];
    if (!currentSchema) return;

    // Trace parent hierarchy using depends_on
    const trail: SchemaModel[] = [currentSchema];
    let curr = currentSchema;
    while (curr.depends_on && activeCanvas.schemas[curr.depends_on]) {
      curr = activeCanvas.schemas[curr.depends_on]!;
      trail.unshift(curr);
    }

    trail.forEach((schema, idx) => {
      if (idx > 0) {
        const separator = document.createElement('span');
        separator.className = 'text-slate-600';
        separator.textContent = '>';
        el.appendChild(separator);
      }

      const item = document.createElement('button');
      item.className = `px-2 py-0.5 rounded transition-all flex items-center gap-1.5 ${
        schema.id === currentSchema.id
          ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30'
          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
      }`;

      if (schema.groupColor) {
        const dot = document.createElement('span');
        dot.className = 'w-2 h-2 rounded-full inline-block';
        dot.style.backgroundColor = schema.groupColor;
        item.appendChild(dot);
      }

      const label = document.createElement('span');
      label.textContent = schema.name;
      item.appendChild(label);

      item.addEventListener('click', () => {
        store.dispatch({ type: 'schema-activated', id: schema.id });
      });

      el.appendChild(item);
    });
  };

  container.appendChild(el);
  render();
  const unsubscribe = store.subscribe(render);

  return {
    destroy: () => {
      unsubscribe();
      el.remove();
    }
  };
}
