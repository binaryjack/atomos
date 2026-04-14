import { createButton } from '@atomos-web/prime'
import { defaultToolboxConfig } from '../../core/default-toolbox.config.js'
import { createVisualEditorTree } from './create-settings-tree.js'
import { createShapesEditor } from './create-shapes-editor.js'
import { createAppearanceTab } from './create-appearance-tab.js'
import { ICON_LIBRARY } from './icon-library.js'
import { createExportPluginsTab } from '../../features/export/create-export-plugins-tab.js'
import type { AppSettings, SettingsPageProps, SettingsPageResult } from './types/settings-page.types.js'

export const createSettingsPage = function(props: SettingsPageProps): SettingsPageResult {
  const cleanupFunctions: Array<() => void> = [];
  let isDirty = false;

  const currentSettings: AppSettings = {
    toolbox: props.initialSettings?.toolbox || JSON.parse(JSON.stringify(defaultToolboxConfig)),
    general: props.initialSettings?.general || {
      gridSize: 20,
      enableSnapping: true,
      defaultLinkStyle: 'bezier',
      gridPrimaryColor: '#334155',
      gridSecondaryColor: '#1e293b',
      canvasBackgroundColor: '#0f172a'
    },
    appearance: props.initialSettings?.appearance || {},
    shapes: props.initialSettings?.shapes || []
  };

  // Base Container (Full screen)
  const container = document.createElement('div');
  container.className = 'absolute inset-0 bg-slate-900 z-50 flex flex-col h-full w-full text-slate-200';

  // Header 
  const header = document.createElement('header');
  header.className = 'flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0';

  const title = document.createElement('h2');
  title.className = 'text-xl font-semibold tracking-tight text-slate-100 flex items-center gap-2';
  title.innerHTML = `<svg width="24" height="24" class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Settings & Configuration`;

  const headerActions = document.createElement('div');
  headerActions.className = 'flex gap-3 items-center';

  const { element: closeBtn, cleanup: closeCleanup } = createButton({
    variant: 'ghost',
    size: 'md',
    children: 'Close',
    onClick: () => {
      if (isDirty) {
        if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          return;
        }
      }
      props.onClose(isDirty);
    }
  });

  const { element: saveBtn, cleanup: saveCleanup } = createButton({
    variant: 'primary',
    size: 'md',
    children: 'Save Changes',
    onClick: () => {
      props.onSave(currentSettings);
      isDirty = false;
      updateHeaderTitle();
    }
  });

  cleanupFunctions.push(closeCleanup.destroy, saveCleanup.destroy);
  headerActions.appendChild(closeBtn);
  headerActions.appendChild(saveBtn);
  header.appendChild(title);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Main Layout
  const mainLayout = document.createElement('div');
  mainLayout.className = 'flex flex-1 min-h-0 overflow-hidden bg-slate-900 flex-col';

  // Tabs
  const vbsTabs = document.createElement('vbs-tabs');
  vbsTabs.setAttribute('active-tab', 'toolbox');
  vbsTabs.setAttribute('variant', 'pills');
  vbsTabs.className = 'w-full h-full';

  // Tab Details
  const navItems = [
    { id: 'general', label: 'General Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'appearance', label: 'Appearance', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'toolbox', label: 'Toolbox Configuration', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'shapes', label: 'Shapes Repository', icon: 'M4 5a2 2 0 012-2h4a2 2 0 012 2v2H6V5zm0 6h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8zm2-2a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2H6z' },
    { id: 'icons', label: 'Icon Library', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 3a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'exports', label: 'Export Plugins', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
  ];

  navItems.forEach(item => {
    const tabEl = document.createElement('vbs-tab');
    tabEl.setAttribute('slot', 'tab');
    tabEl.setAttribute('value', item.id);
    tabEl.setAttribute('variant', 'canvas');
    tabEl.innerHTML = `<span class="flex items-center gap-2"><svg width="16" height="16" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg> ${item.label}</span>`;
    vbsTabs.appendChild(tabEl);
  });

  // -- Pane 0: General Settings --
  const generalSettingsPanel = document.createElement('vbs-tab-panel');
  generalSettingsPanel.setAttribute('slot', 'panel');
  const genPane = document.createElement('div');
  genPane.className = 'flex flex-col flex-1 p-6 w-full h-full overflow-y-auto gap-6';
  
  const genHeader = document.createElement('div');
  const genTitle = document.createElement('h3');
  genTitle.className = 'text-lg font-medium text-slate-200';
  genTitle.textContent = 'General Settings';
  const genDesc = document.createElement('p');
  genDesc.className = 'text-slate-400 text-sm mt-1';
  genDesc.textContent = 'System wide default configurations.';
  genHeader.appendChild(genTitle);
  genHeader.appendChild(genDesc);
  genPane.appendChild(genHeader);

  // Settings Form
  const genForm = document.createElement('div');
  genForm.className = 'flex flex-col gap-6 max-w-xl';

  // Grid Size Input
  const gridSizeRow = document.createElement('div');
  gridSizeRow.className = 'flex flex-col gap-2';
  gridSizeRow.innerHTML = `<label class="text-sm font-medium text-slate-300">Canvas Grid Size (px)</label>`;
  const gridSizeInput = document.createElement('input');
  gridSizeInput.type = 'number';
  gridSizeInput.min = '5';
  gridSizeInput.max = '100';
  gridSizeInput.className = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 w-32';
  gridSizeInput.value = currentSettings.general?.gridSize?.toString() || '20';
  gridSizeInput.addEventListener('input', (e) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.gridSize = parseInt((e.target as HTMLInputElement).value, 10) || 20;
    markDirty();
  });
  gridSizeRow.appendChild(gridSizeInput);
  genForm.appendChild(gridSizeRow);

  // Enable Snapping Checkbox
  const snappingRow = document.createElement('div');
  snappingRow.className = 'flex items-center gap-3';
  const snappingCheckbox = document.createElement('input');
  snappingCheckbox.type = 'checkbox';
  snappingCheckbox.className = 'w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950';
  snappingCheckbox.checked = currentSettings.general?.enableSnapping !== false;
  snappingCheckbox.addEventListener('change', (e) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.enableSnapping = (e.target as HTMLInputElement).checked;
    markDirty();
  });
  const snappingLabel = document.createElement('label');
  snappingLabel.className = 'text-sm font-medium text-slate-300';
  snappingLabel.textContent = 'Enable Grid Snapping';
  snappingRow.appendChild(snappingCheckbox);
  snappingRow.appendChild(snappingLabel);
  genForm.appendChild(snappingRow);

  // Default Link Style Select
  const linkStyleRow = document.createElement('div');
  linkStyleRow.className = 'flex flex-col gap-2';
  linkStyleRow.innerHTML = `<label class="text-sm font-medium text-slate-300">Default Link Routing</label>`;
  const linkStyleSelect = document.createElement('select');
  linkStyleSelect.className = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 w-64';
  
  const styles = [
    { value: 'bezier', label: 'Bezier (Curved)' },
    { value: 'orthogonal', label: 'Orthogonal (Lines)' },
    { value: 'linear', label: 'Linear (Straight)' }
  ];
  
  styles.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.value;
    opt.textContent = s.label;
    if (currentSettings.general?.defaultLinkStyle === s.value) {
      opt.selected = true;
    }
    linkStyleSelect.appendChild(opt);
  });
  
  linkStyleSelect.addEventListener('change', (e) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.defaultLinkStyle = (e.target as HTMLSelectElement).value;
    markDirty();
  });
  linkStyleRow.appendChild(linkStyleSelect);
  genForm.appendChild(linkStyleRow);

  // Grid Colors
  const gridPrimaryColorRow = document.createElement('div');
  gridPrimaryColorRow.className = 'flex flex-col gap-2';
  gridPrimaryColorRow.innerHTML = `<label class="text-sm font-medium text-slate-300">Grid Primary Color</label>`;
  
  const gridPrimaryColorWrap = document.createElement('div');
  gridPrimaryColorWrap.className = 'flex gap-2 w-full max-w-xs';
  
  const gridPrimaryPicker = document.createElement('input');
  gridPrimaryPicker.type = 'color';
  gridPrimaryPicker.className = 'w-10 h-10 p-0.5 rounded border border-slate-700 flex-shrink-0 cursor-pointer bg-slate-950 appearance-none';
  gridPrimaryPicker.value = currentSettings.general?.gridPrimaryColor || '#334155';
  
  const gridPrimaryInput = document.createElement('input');
  gridPrimaryInput.className = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 w-full font-mono';
  gridPrimaryInput.value = currentSettings.general?.gridPrimaryColor || '#334155';
  
  const handlePrimaryChange = (val: string) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.gridPrimaryColor = val;
    gridPrimaryPicker.value = val;
    if (gridPrimaryInput.value !== val) gridPrimaryInput.value = val;
    markDirty();
  };
  
  gridPrimaryPicker.addEventListener('input', (e) => handlePrimaryChange((e.target as HTMLInputElement).value));
  gridPrimaryInput.addEventListener('input', (e) => handlePrimaryChange((e.target as HTMLInputElement).value));
  
  gridPrimaryColorWrap.appendChild(gridPrimaryPicker);
  gridPrimaryColorWrap.appendChild(gridPrimaryInput);
  gridPrimaryColorRow.appendChild(gridPrimaryColorWrap);
  genForm.appendChild(gridPrimaryColorRow);

  const gridSecondaryColorRow = document.createElement('div');
  gridSecondaryColorRow.className = 'flex flex-col gap-2';
  gridSecondaryColorRow.innerHTML = `<label class="text-sm font-medium text-slate-300">Grid Secondary Color</label>`;
  
  const gridSecondaryColorWrap = document.createElement('div');
  gridSecondaryColorWrap.className = 'flex gap-2 w-full max-w-xs';
  
  const gridSecondaryPicker = document.createElement('input');
  gridSecondaryPicker.type = 'color';
  gridSecondaryPicker.className = 'w-10 h-10 p-0.5 rounded border border-slate-700 flex-shrink-0 cursor-pointer bg-slate-950 appearance-none';
  gridSecondaryPicker.value = currentSettings.general?.gridSecondaryColor || '#1e293b';
  
  const gridSecondaryInput = document.createElement('input');
  gridSecondaryInput.className = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 w-full font-mono';
  gridSecondaryInput.value = currentSettings.general?.gridSecondaryColor || '#1e293b';
  
  const handleSecondaryChange = (val: string) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.gridSecondaryColor = val;
    gridSecondaryPicker.value = val;
    if (gridSecondaryInput.value !== val) gridSecondaryInput.value = val;
    markDirty();
  };
  
  gridSecondaryPicker.addEventListener('input', (e) => handleSecondaryChange((e.target as HTMLInputElement).value));
  gridSecondaryInput.addEventListener('input', (e) => handleSecondaryChange((e.target as HTMLInputElement).value));
  
  gridSecondaryColorWrap.appendChild(gridSecondaryPicker);
  gridSecondaryColorWrap.appendChild(gridSecondaryInput);
  gridSecondaryColorRow.appendChild(gridSecondaryColorWrap);
  genForm.appendChild(gridSecondaryColorRow);

  // Canvas Background Color
  const canvasBgColorRow = document.createElement('div');
  canvasBgColorRow.className = 'flex flex-col gap-2';
  canvasBgColorRow.innerHTML = `<label class="text-sm font-medium text-slate-300">Canvas Background Color</label>`;

  const canvasBgColorWrap = document.createElement('div');
  canvasBgColorWrap.className = 'flex gap-2 w-full max-w-xs';
  
  const canvasBgPicker = document.createElement('input');
  canvasBgPicker.type = 'color';
  canvasBgPicker.className = 'w-10 h-10 p-0.5 rounded border border-slate-700 flex-shrink-0 cursor-pointer bg-slate-950 appearance-none';
  canvasBgPicker.value = currentSettings.general?.canvasBackgroundColor || '#0f172a';
  
  const canvasBgInput = document.createElement('input');
  canvasBgInput.className = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 w-full font-mono';
  canvasBgInput.value = currentSettings.general?.canvasBackgroundColor || '#0f172a';
  
  const handleCanvasBgChange = (val: string) => {
    if (!currentSettings.general) currentSettings.general = {};
    currentSettings.general.canvasBackgroundColor = val;
    canvasBgPicker.value = val;
    if (canvasBgInput.value !== val) canvasBgInput.value = val;
    markDirty();
  };
  
  canvasBgPicker.addEventListener('input', (e) => handleCanvasBgChange((e.target as HTMLInputElement).value));
  canvasBgInput.addEventListener('input', (e) => handleCanvasBgChange((e.target as HTMLInputElement).value));
  
  canvasBgColorWrap.appendChild(canvasBgPicker);
  canvasBgColorWrap.appendChild(canvasBgInput);
  canvasBgColorRow.appendChild(canvasBgColorWrap);
  genForm.appendChild(canvasBgColorRow);

  genPane.appendChild(genForm);
  generalSettingsPanel.appendChild(genPane);
  vbsTabs.appendChild(generalSettingsPanel);

  // -- Pane 1: Appearance --
  const appearancePanel = document.createElement('vbs-tab-panel');
  appearancePanel.setAttribute('slot', 'panel');
  const { element: appearanceElement, cleanup: appearanceCleanup } = createAppearanceTab(currentSettings, () => markDirty());
  appearancePanel.addEventListener('appearance-reset', () => {
    // Replace pane content by recreating — simplest approach
    appearancePanel.innerHTML = '';
    const { element: fresh } = createAppearanceTab(currentSettings, () => markDirty());
    appearancePanel.appendChild(fresh);
  });
  appearancePanel.appendChild(appearanceElement);
  cleanupFunctions.push(appearanceCleanup.destroy);
  vbsTabs.appendChild(appearancePanel);

  // -- Pane 3: Toolbox Editor --
  const toolboxPanel = document.createElement('vbs-tab-panel');
  toolboxPanel.setAttribute('slot', 'panel');
  const toolboxPane = document.createElement('div');
  toolboxPane.className = 'flex flex-1 w-full h-full min-h-0';

  const tbLeftPane = document.createElement('div');
  tbLeftPane.className = 'w-1/2 border-r border-slate-800 p-6 flex flex-col min-h-0 overflow-hidden gap-4';
  const tbLeftTitle = document.createElement('h3');
  tbLeftTitle.className = 'text-lg font-medium text-slate-300 shrink-0';
  tbLeftTitle.textContent = 'Visual Editor';
  const treeContainer = document.createElement('div');
  treeContainer.className = 'flex-1 bg-slate-950 rounded-lg border border-slate-800 flex flex-col min-h-0 overflow-hidden text-sm';

  const tbRightPane = document.createElement('div');
  tbRightPane.className = 'w-1/2 p-6 flex flex-col min-h-0 overflow-hidden gap-4 bg-slate-950 font-mono';
  const tbRightTitle = document.createElement('h3');
  tbRightTitle.className = 'text-lg font-medium text-slate-300 font-sans shrink-0';
  tbRightTitle.textContent = 'Raw Data (Preview)';
  const rawTextarea = document.createElement('textarea');
  rawTextarea.className = 'flex-1 min-h-0 w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono resize-none';
  rawTextarea.spellcheck = false;

  const renderRaw = () => {
    rawTextarea.value = JSON.stringify(currentSettings.toolbox, null, 2);
  };
  renderRaw();

  const { element: treeElement, updateConfig: updateTree, cleanup: treeCleanup } = createVisualEditorTree({
    config: currentSettings.toolbox,
    availableShapes: currentSettings.shapes,
    onChange: (newConfig) => {
      currentSettings.toolbox = newConfig;
      markDirty();
      renderRaw();
    }
  });
  cleanupFunctions.push(treeCleanup.destroy);
  treeContainer.appendChild(treeElement);

  rawTextarea.addEventListener('input', (e) => {
    markDirty();
    try {
       currentSettings.toolbox = JSON.parse((e.target as HTMLTextAreaElement).value);
       updateTree(currentSettings.toolbox, currentSettings.shapes);
    } catch {
       // Ignore invalid parsing
    }
  });

  tbLeftPane.appendChild(tbLeftTitle);
  tbLeftPane.appendChild(treeContainer);
  tbRightPane.appendChild(tbRightTitle);
  tbRightPane.appendChild(rawTextarea);
  toolboxPane.appendChild(tbLeftPane);
  toolboxPane.appendChild(tbRightPane);
  toolboxPanel.appendChild(toolboxPane);
  vbsTabs.appendChild(toolboxPanel);


  // -- Pane 4: Shapes Repository --
  const shapesPanel = document.createElement('vbs-tab-panel');
  shapesPanel.setAttribute('slot', 'panel');
  const shapesPane = document.createElement('div');
  shapesPane.className = 'flex flex-1 w-full h-full min-h-0';
  
  const { element: shapesEditorElement } = createShapesEditor({
    shapes: currentSettings.shapes,
    onChange: (ns) => {
      currentSettings.shapes = ns;
      updateTree(currentSettings.toolbox, currentSettings.shapes); // update tree dropdowns if shapes change
      markDirty();
    }
  });
  shapesPane.appendChild(shapesEditorElement);
  shapesPanel.appendChild(shapesPane);
  vbsTabs.appendChild(shapesPanel);

  // -- Pane 5: Icon Library --
  const iconsPanel = document.createElement('vbs-tab-panel');
  iconsPanel.setAttribute('slot', 'panel');
  const iconsPane = document.createElement('div');
  iconsPane.className = 'flex flex-col flex-1 p-6 w-full h-full overflow-y-auto gap-6';

  const iconsHeader = document.createElement('div');
  const iconsTitle = document.createElement('h3');
  iconsTitle.className = 'text-lg font-medium text-slate-200';
  iconsTitle.textContent = 'Icon Library Preview';
  const iconsDesc = document.createElement('p');
  iconsDesc.className = 'text-slate-400 text-sm mt-1';
  iconsDesc.textContent = 'Available base icons which can be assigned to tools within the toolbox editor.';
  iconsHeader.appendChild(iconsTitle);
  iconsHeader.appendChild(iconsDesc);
  iconsPane.appendChild(iconsHeader);

  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4';

  Object.entries(ICON_LIBRARY).forEach(([iconName, iconPaths]) => {
    const card = document.createElement('div');
    card.className = 'flex flex-col items-center p-4 bg-slate-950 border border-slate-800 rounded-lg hover:border-purple-500 transition-colors group';

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'w-12 h-12 mb-3 text-slate-400 group-hover:text-purple-400 transition-colors flex items-center justify-center';
    svgWrapper.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${iconPaths}
      </svg>
    `;

    const label = document.createElement('span');
    label.className = 'text-xs text-slate-400 font-mono text-center break-all';
    label.textContent = iconName;

    card.appendChild(svgWrapper);
    card.appendChild(label);
    gridContainer.appendChild(card);
  });

  iconsPane.appendChild(gridContainer);
  iconsPanel.appendChild(iconsPane);
  vbsTabs.appendChild(iconsPanel);

  // -- Pane 6: Export Plugins --
  const exportsPanel = document.createElement('vbs-tab-panel');
  exportsPanel.setAttribute('slot', 'panel');
  exportsPanel.appendChild(createExportPluginsTab(props.getKernel));
  vbsTabs.appendChild(exportsPanel);

  // Dirty state tracker
  const markDirty = () => {
    isDirty = true;
    updateHeaderTitle();
  };

  const updateHeaderTitle = () => {
    saveBtn.disabled = !isDirty;
    if (isDirty) {
      saveBtn.classList.remove('opacity-50');
      title.innerHTML = `<svg width="24" height="24" class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Settings & Configuration <span class="text-purple-400">*</span>`;
    } else {
      saveBtn.classList.add('opacity-50');
      title.innerHTML = `<svg width="24" height="24" class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Settings & Configuration`;
    }
  };

  // Init
  updateHeaderTitle();

  mainLayout.appendChild(vbsTabs);
  container.appendChild(mainLayout);

  return {
    element: container,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};
