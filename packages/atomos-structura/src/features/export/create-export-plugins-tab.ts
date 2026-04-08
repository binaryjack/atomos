import type { SchemaGraphKernel } from '../../core/create-schema-graph-kernel.js';
import {
  getExportPlugins,
  getCustomExportPlugins,
  saveCustomExportPlugin,
  deleteCustomExportPlugin,
  runCustomExportPlugin,
} from './create-export-registry.js';
import type { CustomExportPlugin } from './export-plugin.types.js';

const downloadText = (content: string, filename: string, mime = 'text/plain'): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const badge = (text: string, color: string): HTMLElement => {
  const el = document.createElement('span');
  el.textContent = text;
  el.style.cssText = `display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-family:monospace;background:${color}22;color:${color};border:1px solid ${color}44;`;
  return el;
};

export const createExportPluginsTab = (getKernel: (() => SchemaGraphKernel) | undefined): HTMLElement => {
  const root = document.createElement('div');
  root.className = 'flex flex-col flex-1 p-6 w-full h-full overflow-y-auto gap-8';

  // ── Header ──────────────────────────────────────────────────────────────
  const hdr = document.createElement('div');
  hdr.innerHTML = `
    <h3 class="text-lg font-medium text-slate-200">Export Plugins</h3>
    <p class="text-slate-400 text-sm mt-1">Built-in and custom plugins for exporting your schema to different formats. Click <strong class="text-slate-300">Export</strong> on any plugin to download.</p>
  `;
  root.appendChild(hdr);

  // ── Built-in plugins list ────────────────────────────────────────────────
  const builtinSection = document.createElement('div');
  builtinSection.className = 'flex flex-col gap-3';

  const builtinTitle = document.createElement('h4');
  builtinTitle.className = 'text-sm font-semibold text-slate-400 uppercase tracking-wider';
  builtinTitle.textContent = 'Built-in Plugins';
  builtinSection.appendChild(builtinTitle);

  const pluginList = document.createElement('div');
  pluginList.className = 'flex flex-col gap-2';

  const renderBuiltins = (): void => {
    pluginList.innerHTML = '';
    getExportPlugins().forEach(plugin => {
      const card = document.createElement('div');
      card.className = 'flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3';

      const info = document.createElement('div');
      info.className = 'flex-1 min-w-0';

      const nameRow = document.createElement('div');
      nameRow.className = 'flex items-center gap-2';

      const name = document.createElement('span');
      name.className = 'text-slate-200 text-sm font-medium';
      name.textContent = plugin.label;

      nameRow.appendChild(name);
      nameRow.appendChild(badge(`.${plugin.fileExtension}`, '#818cf8'));
      info.appendChild(nameRow);

      const desc = document.createElement('p');
      desc.className = 'text-slate-500 text-xs mt-1 truncate';
      desc.title = plugin.description;
      desc.textContent = plugin.description;
      info.appendChild(desc);

      card.appendChild(info);

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.style.cssText = [
        'flex-shrink:0;padding:4px 14px;font-size:13px;border-radius:6px;cursor:pointer;border:none;',
        'background:#4f46e5;color:#fff;transition:background 0.15s;',
      ].join('');
      exportBtn.onmouseover = () => { exportBtn.style.background = '#6366f1'; };
      exportBtn.onmouseout  = () => { exportBtn.style.background = '#4f46e5'; };
      exportBtn.onclick = () => {
        if (!getKernel) { alert('No active schema. Open a canvas first.'); return; }
        const snapshot = getKernel().getSnapshot();
        try {
          const content = plugin.generate(snapshot);
          downloadText(content, `schema-${Date.now()}.${plugin.fileExtension}`, plugin.mimeType);
        } catch (err) {
          alert(`Export failed: ${String(err)}`);
        }
      };
      card.appendChild(exportBtn);

      pluginList.appendChild(card);
    });
  };

  renderBuiltins();
  builtinSection.appendChild(pluginList);
  root.appendChild(builtinSection);

  // ── Custom plugins section ───────────────────────────────────────────────
  const customSection = document.createElement('div');
  customSection.className = 'flex flex-col gap-3';

  const customHeader = document.createElement('div');
  customHeader.className = 'flex items-center justify-between';

  const customTitle = document.createElement('h4');
  customTitle.className = 'text-sm font-semibold text-slate-400 uppercase tracking-wider';
  customTitle.textContent = 'Custom Plugins';

  const addBtn = document.createElement('button');
  addBtn.textContent = '+ New Plugin';
  addBtn.style.cssText = 'padding:3px 12px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid #374151;background:transparent;color:#94a3b8;';
  addBtn.onmouseover = () => { addBtn.style.background = '#1e293b'; };
  addBtn.onmouseout  = () => { addBtn.style.background = 'transparent'; };

  customHeader.appendChild(customTitle);
  customHeader.appendChild(addBtn);
  customSection.appendChild(customHeader);

  const warningBox = document.createElement('div');
  warningBox.className = 'flex items-start gap-2 bg-amber-950 border border-amber-800 rounded-lg px-3 py-2 text-amber-300 text-xs';
  warningBox.innerHTML = `
    <svg width="14" height="14" class="shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94A2 2 0 0022.18 18L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
    <span>Custom plugins run arbitrary JavaScript in your browser. Only add code you wrote or fully trust.</span>
  `;
  customSection.appendChild(warningBox);

  const customList = document.createElement('div');
  customList.className = 'flex flex-col gap-2';

  // Editor panel (hidden until add/edit is clicked)
  const editorPanel = document.createElement('div');
  editorPanel.style.cssText = 'display:none;flex-direction:column;gap:3;';
  editorPanel.className = 'flex flex-col gap-3 bg-slate-950 border border-slate-700 rounded-lg p-4';

  const editorFields = document.createElement('div');
  editorFields.className = 'grid grid-cols-2 gap-3';

  const mkInput = (placeholder: string): HTMLInputElement => {
    const inp = document.createElement('input');
    inp.placeholder = placeholder;
    inp.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-purple-500';
    return inp;
  };

  const nameInput = mkInput('Plugin name (e.g. GraphQL SDL)');
  const extInput = mkInput('File extension (e.g. graphql)');
  nameInput.style.gridColumn = 'span 1';
  extInput.style.gridColumn = 'span 1';
  editorFields.appendChild(nameInput);
  editorFields.appendChild(extInput);

  const descInput = mkInput('Short description');
  descInput.style.cssText += 'grid-column:span 2;';
  editorFields.appendChild(descInput);

  editorPanel.appendChild(editorFields);

  const fnLabel = document.createElement('label');
  fnLabel.className = 'text-xs text-slate-400';
  fnLabel.innerHTML = `Function body — <code class="text-purple-400">snapshot</code> is the schema ({ entities, links }), return a string:`;
  editorPanel.appendChild(fnLabel);

  const fnTextarea = document.createElement('textarea');
  fnTextarea.rows = 10;
  fnTextarea.spellcheck = false;
  fnTextarea.className = 'w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-purple-500';
  fnTextarea.placeholder = [
    '// snapshot = { entities: Record<id, Entity>, links: Record<id, LinkProps> }',
    '// Return a string with the generated output.',
    '',
    'const lines = [];',
    'Object.values(snapshot.entities).forEach(e => {',
    '  lines.push(`type ${e.name} {`);',
    '  (e.properties ?? []).forEach(p => lines.push(`  ${p.key}: ${p.dataType}`));',
    '  lines.push("}");',
    '});',
    'return lines.join("\\n");',
  ].join('\n');
  editorPanel.appendChild(fnTextarea);

  const editorActions = document.createElement('div');
  editorActions.className = 'flex gap-2 justify-end';

  const cancelEditBtn = document.createElement('button');
  cancelEditBtn.textContent = 'Cancel';
  cancelEditBtn.style.cssText = 'padding:5px 14px;border-radius:6px;font-size:13px;border:1px solid #374151;background:transparent;color:#94a3b8;cursor:pointer;';

  const saveEditBtn = document.createElement('button');
  saveEditBtn.textContent = 'Save Plugin';
  saveEditBtn.style.cssText = 'padding:5px 14px;border-radius:6px;font-size:13px;background:#4f46e5;color:#fff;border:none;cursor:pointer;';

  editorActions.appendChild(cancelEditBtn);
  editorActions.appendChild(saveEditBtn);
  editorPanel.appendChild(editorActions);
  customSection.appendChild(editorPanel);

  let editingId: string | null = null;

  const openEditor = (plugin?: CustomExportPlugin): void => {
    editingId = plugin?.id ?? null;
    nameInput.value  = plugin?.label ?? '';
    extInput.value   = plugin?.fileExtension ?? '';
    descInput.value  = plugin?.description ?? '';
    fnTextarea.value = plugin?.fnBody ?? fnTextarea.placeholder;
    editorPanel.style.display = 'flex';
    editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const closeEditor = (): void => {
    editorPanel.style.display = 'none';
    editingId = null;
  };

  cancelEditBtn.onclick = closeEditor;

  const renderCustomList = (): void => {
    customList.innerHTML = '';
    const plugins = getCustomExportPlugins();

    if (plugins.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-slate-600 text-sm italic';
      empty.textContent = 'No custom plugins yet. Click "+ New Plugin" to create one.';
      customList.appendChild(empty);
      return;
    }

    plugins.forEach(plugin => {
      const card = document.createElement('div');
      card.className = 'flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3';

      const info = document.createElement('div');
      info.className = 'flex-1 min-w-0';

      const nameRow = document.createElement('div');
      nameRow.className = 'flex items-center gap-2';
      const name = document.createElement('span');
      name.className = 'text-slate-200 text-sm font-medium';
      name.textContent = plugin.label;
      nameRow.appendChild(name);
      nameRow.appendChild(badge(`.${plugin.fileExtension}`, '#34d399'));
      nameRow.appendChild(badge('custom', '#f59e0b'));
      info.appendChild(nameRow);

      const desc = document.createElement('p');
      desc.className = 'text-slate-500 text-xs mt-1 truncate';
      desc.title = plugin.description;
      desc.textContent = plugin.description || '(no description)';
      info.appendChild(desc);

      card.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'flex gap-2 shrink-0';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cssText = 'padding:4px 10px;font-size:13px;border-radius:6px;cursor:pointer;border:1px solid #374151;background:transparent;color:#94a3b8;';
      editBtn.onclick = () => openEditor(plugin);

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.style.cssText = 'padding:4px 14px;font-size:13px;border-radius:6px;cursor:pointer;border:none;background:#4f46e5;color:#fff;';
      exportBtn.onclick = () => {
        if (!getKernel) { alert('No active schema.'); return; }
        const snapshot = getKernel().getSnapshot();
        const content = runCustomExportPlugin(plugin, snapshot);
        downloadText(content ?? '', `schema-${Date.now()}.${plugin.fileExtension}`);
      };

      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = 'Delete plugin';
      delBtn.style.cssText = 'padding:4px 8px;font-size:15px;border-radius:6px;cursor:pointer;border:1px solid #7f1d1d;background:transparent;color:#ef4444;';
      delBtn.onclick = () => {
        if (!confirm(`Delete plugin "${plugin.label}"?`)) return;
        deleteCustomExportPlugin(plugin.id);
        renderCustomList();
      };

      actions.appendChild(editBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);
      customList.appendChild(card);
    });
  };

  saveEditBtn.onclick = () => {
    const label = nameInput.value.trim();
    const ext   = extInput.value.trim().replace(/^\./, '');
    const fnBody = fnTextarea.value.trim();
    if (!label || !ext || !fnBody) { alert('Name, extension, and function body are required.'); return; }
    const id = editingId ?? `custom-${Date.now()}`;
    saveCustomExportPlugin({ id, label, description: descInput.value.trim(), fileExtension: ext, fnBody });
    closeEditor();
    renderCustomList();
  };

  addBtn.onclick = () => openEditor();

  renderCustomList();
  customSection.appendChild(customList);
  root.appendChild(customSection);

  return root;
};
