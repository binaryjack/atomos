import '../../../atomos-prime-style/dist/styles.css'
import { createSignal } from '../../src/index.js'
import { COMPONENT_REGISTRY, getDocById } from './registry.js'

// Build the shell layout
const root = document.getElementById('docs-root')!;
root.style.cssText = 'display:flex;height:100vh;width:100vw;overflow:hidden;background:var(--vbs-bg-body, #0f172a);color:var(--vbs-text-primary, #f8fafc);font-family:system-ui,sans-serif;';

// Sidebar
const sidebar = document.createElement('div');
sidebar.style.cssText = 'width:260px;background:var(--vbs-bg-sidebar, #020617);border-right:1px solid var(--vbs-border, #1e293b);padding:1.5rem;display:flex;flex-direction:column;gap:1.5rem;overflow-y:auto;';
sidebar.innerHTML = `
  <div>
    <h1 style="font-size:1.25rem;font-weight:bold;margin:0 0 0.5rem 0;color:#c084fc;">@atomos-web/prime</h1>
    <p style="font-size:0.875rem;color:#94a3b8;margin:0;">Component Sandbox</p>
  </div>
`;

// Main Content
const mainContent = document.createElement('div');
mainContent.style.cssText = 'flex:1;display:flex;flex-direction:column;height:100vh;position:relative;background:var(--vbs-bg-body, #0f172a);';

// Theme Toggle
const themeToggleBtn = document.createElement('button');
themeToggleBtn.textContent = 'Toggle Theme 🌙';
themeToggleBtn.style.cssText = 'background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:0.5rem;border-radius:4px;cursor:pointer;font-size:0.875rem;font-weight:600;font-family:inherit;width:100%;text-align:left;transition:all 0.15s;';
let isDarkTheme = true;

const applyTheme = () => {
  themeToggleBtn.textContent = isDarkTheme ? 'Toggle Theme 🌙' : 'Toggle Theme ☀️';

  // Basic DOM inversion
  document.documentElement.className = isDarkTheme ? 'dark' : 'light';

  const bgBody = isDarkTheme ? '#0f172a' : '#f8fafc';
  const textPrimary = isDarkTheme ? '#f1f5f9' : '#0f172a';
  const bgPanel = isDarkTheme ? '#1e293b' : '#ffffff';
  const borderCol = isDarkTheme ? '#334155' : '#cbd5e1';
  const bgSidebar = isDarkTheme ? '#020617' : '#f1f5f9';

  document.documentElement.style.setProperty('--vbs-bg-body', bgBody);
  document.documentElement.style.setProperty('--vbs-bg-panel', bgPanel);
  document.documentElement.style.setProperty('--vbs-text-primary', textPrimary);
  document.documentElement.style.setProperty('--vbs-border', borderCol);
  document.documentElement.style.setProperty('--vbs-bg-sidebar', bgSidebar);
  document.documentElement.style.setProperty('--vbs-hover', isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
};

// apply initial theme immediately
applyTheme();

themeToggleBtn.onclick = () => {
  isDarkTheme = !isDarkTheme;
  applyTheme();
};

// Radius Adjuster
const radiusWrap = document.createElement('div');
radiusWrap.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;';
const radiusLabel = document.createElement('label');
radiusLabel.textContent = 'App Radius: 12px';
radiusLabel.style.cssText = 'font-size:0.75rem;color:#94a3b8;font-weight:600;';
const radiusSlider = document.createElement('input');
radiusSlider.type = 'range';
radiusSlider.min = '0';
radiusSlider.max = '32';
radiusSlider.value = '12';
radiusSlider.style.width = '100%';
radiusSlider.oninput = (e: any) => {
  const val = e.target.value;
  radiusLabel.textContent = `App Radius: ${val}px`;
  document.documentElement.style.setProperty('--docs-radius', `${val}px`);
};
radiusWrap.appendChild(radiusLabel);
radiusWrap.appendChild(radiusSlider);
sidebar.appendChild(radiusWrap);

const navList = document.createElement('div');
navList.style.cssText = 'display:flex;flex-direction:column;gap:1.5rem;';       

const categories = Array.from(new Set(COMPONENT_REGISTRY.map(d => d.category)));

categories.forEach(cat => {
  const groupWrap = document.createElement('div');
      
  const groupTitle = document.createElement('div');
  groupTitle.textContent = cat;
  groupTitle.style.cssText = 'font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;margin-bottom:0.5rem;padding-left:0.5rem;';
  groupWrap.appendChild(groupTitle);
  
  const groupLinks = document.createElement('div');
  groupLinks.style.cssText = 'display:flex;flex-direction:column;gap:0.25rem;';
  
  COMPONENT_REGISTRY.filter(d => d.category === cat).forEach(doc => {
    const link = document.createElement('a');
    link.href = `#${doc.id}`;
    link.textContent = doc.title;
    link.className = 'nav-link';
    link.id = `nav-${doc.id}`;
    link.style.cssText = 'display:block;padding:0.5rem;border-radius:4px;color:#cbd5e1;text-decoration:none;font-size:0.875rem;transition:all 0.15s;';
    link.onmouseover = () => { if (window.location.hash !== `#${doc.id}`) link.style.background = '#1e293b'; };
    link.onmouseout = () => { if (window.location.hash !== `#${doc.id}`) link.style.background = 'transparent'; };
    groupLinks.appendChild(link);
  });
  
  groupWrap.appendChild(groupLinks);
  navList.appendChild(groupWrap);
});

sidebar.appendChild(navList);

// The Sandbox Viewport (Top)
const sandboxViewport = document.createElement('div');
sandboxViewport.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:auto;padding:1.5rem;gap:1.5rem;';
document.documentElement.style.setProperty('--docs-radius', '12px');

root.appendChild(sidebar);
root.appendChild(mainContent);
mainContent.appendChild(sandboxViewport);

// The Router State Manager
let currentCleanup: (() => void) | null = null;
let currentSignalUnsub: (() => void) | null = null;
const activeStateSignal = createSignal<any>({});

const loadComponent = (id: string) => {
  if (currentCleanup) currentCleanup();
  if (currentSignalUnsub) currentSignalUnsub();
  sandboxViewport.innerHTML = '';

  // Update navigation highlighting
  document.querySelectorAll('.nav-link').forEach(el => {
    (el as HTMLElement).style.background = 'transparent';
  });
  const actLink = document.getElementById(`nav-${id}`);
  if (actLink) actLink.style.background = '#334155';

  const doc = getDocById(id) || COMPONENT_REGISTRY[0];
  if (!doc) return;
  
  activeStateSignal.set(JSON.parse(JSON.stringify(doc.defaultState)));

  // -- Render Top Title
  const header = document.createElement('div');
  header.style.cssText = 'padding:2rem;background:var(--vbs-bg-panel, #020617);border:1px solid #1e293b;border-radius:var(--docs-radius, 12px);';
  header.innerHTML = `
    <h2 style="font-size:1.5rem;font-weight:600;margin:0 0 0.5rem 0;">${doc.title}</h2>
    <p style="font-size:1rem;color:#94a3b8;margin:0;">${doc.description}</p>
  `;
  sandboxViewport.appendChild(header);

  // -- Render Split Layout (Preview + Code)
  // We're mimicking tabs side-by-side or stacked inside the viewport
  const bodyWrap = document.createElement('div');
  bodyWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:1.5rem;overflow:visible;position:relative;';

  // Container for Preview
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = 'flex:2;background:var(--vbs-bg-panel, #1e293b);display:flex;align-items:center;justify-content:center;position:relative;border:1px solid #1e293b;border-radius:var(--docs-radius, 12px);overflow:hidden;min-height:300px;';

  const previewOutput = document.createElement('div');
  previewOutput.className = 'preview-target';
  previewContainer.appendChild(previewOutput);

  // Container for Data Controls
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = 'background:var(--vbs-bg-panel, #020617);padding:2rem;display:flex;gap:2rem;flex-wrap:wrap;border:1px solid #1e293b;border-radius:var(--docs-radius, 12px);';
  // Let's just create a nice absolute-positioned button that toggles Code Source
  const codeOverlay = document.createElement('div');
  codeOverlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:#0f172a;padding:2rem;display:none;z-index:10;color:#38bdf8;font-family:monospace;white-space:pre-wrap;overflow:auto;border-radius:var(--docs-radius, 12px);';

  let showCode = false;
  const toggleCodeBtn = document.createElement('button');
  toggleCodeBtn.textContent = 'View Source Code';
  toggleCodeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;background:#1e293b;border:1px solid #475569;color:white;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;z-index:20;';

  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.textContent = 'Copy Code';
  copyCodeBtn.style.cssText = 'position:absolute;top:1rem;right:11rem;background:#38bdf8;border:1px solid #0284c7;color:#0f172a;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;z-index:20;font-weight:600;display:none;';

  toggleCodeBtn.onclick = () => {
    showCode = !showCode;
    toggleCodeBtn.textContent = showCode ? 'Back to Preview' : 'View Source Code';
    codeOverlay.style.display = showCode ? 'block' : 'none';
    copyCodeBtn.style.display = showCode ? 'block' : 'none';
  };

  copyCodeBtn.onclick = () => {
    const rawCode = doc.renderCode(activeStateSignal.value);
    navigator.clipboard.writeText(rawCode);
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
  };

  previewContainer.appendChild(copyCodeBtn);
  previewContainer.appendChild(toggleCodeBtn);
  previewContainer.appendChild(codeOverlay);

  bodyWrap.appendChild(previewContainer);
  bodyWrap.appendChild(controlsContainer);
  sandboxViewport.appendChild(bodyWrap);

  // -- Render Interactive Properties panel
  doc.controls.forEach(ctrl => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;min-width:200px;';
    
    const label = document.createElement('label');
    label.textContent = ctrl.label;
    label.style.cssText = 'font-size:0.875rem;color:#94a3b8;font-weight:600;';
    wrap.appendChild(label);

    let input: HTMLInputElement | HTMLSelectElement;

    if (ctrl.type === 'select' && ctrl.options) {
      input = document.createElement('select');
      ctrl.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      if (ctrl.type === 'number') input.type = 'number';
      else if (ctrl.type === 'boolean') input.type = 'checkbox';
      else if (ctrl.type === 'color') input.type = 'color';
      else input.type = 'text';
    }
    
    input.style.cssText = 'background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:0.5rem;border-radius:4px;outline:none;';
    if (ctrl.type === 'boolean') {
      (input as HTMLInputElement).checked = activeStateSignal.value[ctrl.key];
    } else {
      input.value = activeStateSignal.value[ctrl.key];
    }

    input.oninput = (e: any) => {
      const val = ctrl.type === 'number' ? parseFloat(e.target.value) : 
                  ctrl.type === 'boolean' ? e.target.checked : e.target.value;
                  
      activeStateSignal.set({
        ...activeStateSignal.value,
        [ctrl.key]: val
      });
    };
    
    wrap.appendChild(input);
    controlsContainer.appendChild(wrap);
  });

  // Automatically generate an API table below the controls
  if (doc.controls.length > 0) {
    const tableWrap = document.createElement('div');
    tableWrap.style.cssText = 'width:100%;margin-top:2rem;border-top:1px solid #1e293b;padding-top:1rem;color:#cbd5e1;';
    tableWrap.innerHTML = `
      <h3 style="font-size:1rem;margin:0 0 1rem 0;color:#c084fc;">Properties API</h3>
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem;text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            <th style="padding:0.5rem;color:#94a3b8;">Property</th>
            <th style="padding:0.5rem;color:#94a3b8;">Type</th>
            <th style="padding:0.5rem;color:#94a3b8;">Label/Description</th>
          </tr>
        </thead>
        <tbody>
          ${doc.controls.map(c => `
            <tr style="border-bottom:1px solid #1e293b;">
              <td style="padding:0.5rem;font-family:monospace;color:#38bdf8;">${c.key}</td>
              <td style="padding:0.5rem;">${c.options ? `enum (${(c.options as unknown[]).length} options)` : c.type}</td>
              <td style="padding:0.5rem;">${c.label}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    controlsContainer.appendChild(tableWrap);
  }

  // -- Subscribe to State updates to Re-render Component and Code
  currentSignalUnsub = activeStateSignal.subscribe(newState => {
    // 1. Update Preview Render
    previewOutput.innerHTML = '';
    const comp = doc.renderPreview(newState);
    
    let elToAppend: HTMLElement;
    if (comp instanceof HTMLElement) {
       elToAppend = comp;
    } else {
       elToAppend = comp.element;
       if (currentCleanup) currentCleanup(); // clean old
       currentCleanup = comp.cleanup?.destroy || null;
    }
    previewOutput.appendChild(elToAppend);

    // 2. Update Code Output
    const codeString = doc.renderCode(newState);
    // basic highlight logic mapping
    codeOverlay.innerHTML = codeString
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape
        .replace(/('.*?')/g, '<span class="string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
        .replace(/\b(const|let|var|function|return|import|from|boolean)\b/g, '<span class="key">$1</span>');
  });

  // Initial render
  activeStateSignal.set({ ...activeStateSignal.value });
};

// Basic Hash Router
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  loadComponent(hash);
});

// Load first or hash
if (window.location.hash && window.location.hash.length > 1) {
  loadComponent(window.location.hash.slice(1));
} else {
  loadComponent(COMPONENT_REGISTRY[0].id);
}

