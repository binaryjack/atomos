import { defaultToolboxConfig } from '../../core/default-toolbox.config.js';
import { createButton } from '../button/create-button.js';
import { createVisualEditorTree } from './create-settings-tree.js';
import { createDecisionMatrix } from '../decision-matrix/create-decision-matrix.js';
import type { SettingsPageProps, SettingsPageResult, AppSettings } from './types/settings-page.types.js';

export const createSettingsPage = function(props: SettingsPageProps): SettingsPageResult {
  const cleanupFunctions: Array<() => void> = [];
  let isDirty = false;

  const defaultMatrices = {
    criteria: [
      { id: 'c1', name: 'Criteria 1', weight: 1 }
    ],
    options: [
      { id: 'o1', name: 'Option 1', scores: { c1: 0 } }
    ]
  };

  const currentSettings: AppSettings = {
    toolbox: props.initialSettings?.toolbox || JSON.parse(JSON.stringify(defaultToolboxConfig)),
    matrices: props.initialSettings?.matrices || JSON.parse(JSON.stringify(defaultMatrices))
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
  mainLayout.className = 'flex flex-1 min-h-0 overflow-hidden bg-slate-900';

  // Sidebar navigation
  const sidebar = document.createElement('div');
  sidebar.className = 'w-64 border-r border-slate-800 bg-slate-950 flex flex-col p-4 gap-2 shrink-0';

  const navItems = [
    { id: 'toolbox', label: 'Toolbox Configuration', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'matrices', label: 'Decision Matrices', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' } // Funnel/Matrix icon
  ];

  let currentTab = 'toolbox';
  const navElements: Record<string, HTMLElement> = {};

  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 flex min-h-0 overflow-hidden relative';

  // Build the content panes
  const panes: Record<string, HTMLElement> = {};

  // -- Pane 1: Toolbox Editor --
  const toolboxPane = document.createElement('div');
  toolboxPane.className = 'flex flex-1 w-full h-full';
  
  const tbLeftPane = document.createElement('div');
  tbLeftPane.className = 'w-1/2 border-r border-slate-800 p-6 overflow-y-auto flex flex-col gap-4';
  const tbLeftTitle = document.createElement('h3');
  tbLeftTitle.className = 'text-lg font-medium text-slate-300';
  tbLeftTitle.textContent = 'Visual Editor';
  const treeContainer = document.createElement('div');
  treeContainer.className = 'flex-1 bg-slate-950 rounded-lg border border-slate-800 flex flex-col overflow-hidden text-sm';

  const tbRightPane = document.createElement('div');
  tbRightPane.className = 'w-1/2 p-6 overflow-y-auto flex flex-col gap-4 bg-slate-950 font-mono';
  const tbRightTitle = document.createElement('h3');
  tbRightTitle.className = 'text-lg font-medium text-slate-300 font-sans';
  tbRightTitle.textContent = 'Raw Data (Preview)';
  const rawTextarea = document.createElement('textarea');
  rawTextarea.className = 'flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono resize-none';
  rawTextarea.spellcheck = false;

  const renderRaw = () => {
    rawTextarea.value = JSON.stringify(currentSettings.toolbox, null, 2);
  };
  renderRaw();

  const { element: treeElement, updateConfig: updateTree, cleanup: treeCleanup } = createVisualEditorTree({
    config: currentSettings.toolbox,
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
       updateTree(currentSettings.toolbox);
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
  panes['toolbox'] = toolboxPane;


  // -- Pane 2: Decision Matrices Editor --
  const matrixPane = document.createElement('div');
  matrixPane.className = 'flex flex-col flex-1 p-6 w-full h-full overflow-y-auto gap-6';
  
  const mxHeader = document.createElement('div');
  const mxTitle = document.createElement('h3');
  mxTitle.className = 'text-lg font-medium text-slate-200';
  mxTitle.textContent = 'Global Evaluation Matrix';
  const mxDesc = document.createElement('p');
  mxDesc.className = 'text-slate-400 text-sm mt-1';
  mxDesc.textContent = 'Define standard options and configurable criteria used universally.';
  mxHeader.appendChild(mxTitle);
  mxHeader.appendChild(mxDesc);

  const { element: matrixEditorElement } = createDecisionMatrix({
    criteria: currentSettings.matrices.criteria,
    options: currentSettings.matrices.options,
    onChange: (c, o) => {
      currentSettings.matrices.criteria = c;
      currentSettings.matrices.options = o;
      markDirty();
    }
  });

  matrixPane.appendChild(mxHeader);
  matrixPane.appendChild(matrixEditorElement);
  panes['matrices'] = matrixPane;


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

  // Build Navigation
  const buildNav = () => {
    sidebar.innerHTML = '';
    const navTitle = document.createElement('h4');
    navTitle.className = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 pt-2';
    navTitle.textContent = 'Configuration';
    sidebar.appendChild(navTitle);

    navItems.forEach(item => {
      const btn = document.createElement('button');
      const isActive = currentTab === item.id;
      btn.className = `w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-left ${isActive ? 'bg-slate-800 text-purple-400 font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`;
      btn.innerHTML = `<svg width="16" height="16" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg> ${item.label}`;
      
      btn.onclick = () => {
        currentTab = item.id;
        buildNav();
        renderTab();
      };
      
      sidebar.appendChild(btn);
    });
  };

  const renderTab = () => {
    contentArea.innerHTML = '';
    const pane = panes[currentTab];
    if (pane) {
      contentArea.appendChild(pane);
    }
  };

  mainLayout.appendChild(sidebar);
  mainLayout.appendChild(contentArea);
  container.appendChild(mainLayout);

  // Init
  updateHeaderTitle();
  buildNav();
  renderTab();

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
