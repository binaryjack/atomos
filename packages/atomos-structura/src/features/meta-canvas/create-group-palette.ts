import type { ReduxStore } from '../../types/redux-state.types.js';

export function createGroupPalette(container: HTMLElement, store: ReduxStore): { destroy: () => void } {
  const panel = document.createElement('div');
  panel.className = 'atomos-group-palette flex flex-col gap-3 p-3 bg-[#0b1120] border-r border-slate-800 w-64 h-full overflow-y-auto shrink-0 select-none z-10';
  panel.style.display = 'none'; // Hidden unless in Mode 3 (Meta Canvas)

  const title = document.createElement('div');
  title.className = 'text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-2 border-b border-slate-800';
  title.innerHTML = `
    <span class="flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-cyan-400"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Group Palette
    </span>
  `;
  panel.appendChild(title);

  const groupList = document.createElement('div');
  groupList.className = 'flex flex-col gap-2';
  panel.appendChild(groupList);

  const render = () => {
    const state = store.get_state();
    const mode = state.workspace.mode ?? 1;

    if (mode !== 3) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'flex';
    groupList.innerHTML = '';

    const activeCanvas = state.workspace.canvases[state.workspace.active_canvas_id];
    if (!activeCanvas) return;

    // Filter schemas that are marked as isGroup
    const groupSchemas = Object.values(activeCanvas.schemas).filter(s => s.isGroup);

    if (groupSchemas.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'text-xs text-slate-500 italic p-3 text-center bg-slate-900/40 rounded border border-dashed border-slate-800';
      emptyMsg.textContent = 'No grouped schemas yet. Use "Group Active Schema" to create one.';
      groupList.appendChild(emptyMsg);
      return;
    }

    groupSchemas.forEach(groupSchema => {
      const card = document.createElement('div');
      card.className = 'group-palette-card p-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-lg cursor-grab active:cursor-grabbing transition-all flex flex-col gap-2';
      card.draggable = true;

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between';

      const nameLabel = document.createElement('span');
      nameLabel.className = 'text-xs font-semibold text-slate-200 truncate';
      nameLabel.textContent = groupSchema.name;
      header.appendChild(nameLabel);

      if (groupSchema.groupColor) {
        const badge = document.createElement('span');
        badge.className = 'w-2.5 h-2.5 rounded-full shrink-0';
        badge.style.backgroundColor = groupSchema.groupColor;
        header.appendChild(badge);
      }

      card.appendChild(header);

      // SVG Preview Thumbnail
      if (groupSchema.print) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'w-full h-20 bg-[#020617] rounded border border-slate-800/80 overflow-hidden flex items-center justify-center p-1 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity';
        previewContainer.innerHTML = groupSchema.print;
        card.appendChild(previewContainer);
      }

      // Drag event handling
      card.addEventListener('dragstart', (e) => {
        if (!e.dataTransfer) return;
        e.dataTransfer.setData('application/atomos-group', JSON.stringify({
          schemaId: groupSchema.id,
          name: groupSchema.name,
          print: groupSchema.print,
          groupColor: groupSchema.groupColor
        }));
      });

      groupList.appendChild(card);
    });
  };

  container.appendChild(panel);
  render();
  const unsubscribe = store.subscribe(render);

  return {
    destroy: () => {
      unsubscribe();
      panel.remove();
    }
  };
}
