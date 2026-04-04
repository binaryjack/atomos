import { createSignal } from '../../src/index.js'
import { COMPONENT_REGISTRY, getDocById } from './registry.js'

// Build the shell layout
const root = document.getElementById('docs-root')!;
root.style.cssText = 'display:flex;height:100vh;width:100vw;overflow:hidden;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;';

// Sidebar
const sidebar = document.createElement('div');
sidebar.style.cssText = 'width:260px;background:#020617;border-right:1px solid #1e293b;padding:1.5rem;display:flex;flex-direction:column;gap:1.5rem;overflow-y:auto;';
sidebar.innerHTML = `
  <div>
    <h1 style="font-size:1.25rem;font-weight:bold;margin:0 0 0.5rem 0;color:#c084fc;">@atomos/prime</h1>
    <p style="font-size:0.875rem;color:#94a3b8;margin:0;">Component Sandbox</p>
  </div>
`;

const navList = document.createElement('div');
navList.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;';

COMPONENT_REGISTRY.forEach(doc => {
  const link = document.createElement('a');
  link.href = `#${doc.id}`;
  link.textContent = doc.title;
  link.style.cssText = 'display:block;padding:0.5rem;border-radius:4px;color:#cbd5e1;text-decoration:none;font-size:0.875rem;';
  link.onmouseover = () => link.style.background = '#1e293b';
  link.onmouseout = () => {
    if (window.location.hash !== `#${doc.id}`) {
       link.style.background = 'transparent';
    }
  };
  link.onclick = () => {
    // Basic routing trick
    Array.from(navList.children).forEach(child => (child as HTMLElement).style.background = 'transparent');
    link.style.background = '#334155';
  };
  navList.appendChild(link);
});

sidebar.appendChild(navList);

// Main Content
const mainContent = document.createElement('div');
mainContent.style.cssText = 'flex:1;display:flex;flex-direction:column;height:100vh;position:relative;background:#0f172a;';

// The Sandbox Viewport (Top)
const sandboxViewport = document.createElement('div');
sandboxViewport.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

root.appendChild(sidebar);
root.appendChild(mainContent);
mainContent.appendChild(sandboxViewport);

// The Router State Manager
let currentCleanup: (() => void) | null = null;
const activeStateSignal = createSignal<any>({});

const loadComponent = (id: string) => {
  if (currentCleanup) currentCleanup();
  sandboxViewport.innerHTML = '';
  
  const doc = getDocById(id) || COMPONENT_REGISTRY[0];
  if (!doc) return;
  
  activeStateSignal.set(JSON.parse(JSON.stringify(doc.defaultState)));

  // -- Render Top Title
  const header = document.createElement('div');
  header.style.cssText = 'padding:2rem;border-bottom:1px solid #1e293b;';
  header.innerHTML = `
    <h2 style="font-size:1.5rem;font-weight:600;margin:0 0 0.5rem 0;">${doc.title}</h2>
    <p style="font-size:1rem;color:#94a3b8;margin:0;">${doc.description}</p>
  `;
  sandboxViewport.appendChild(header);

  // -- Render Split Layout (Preview + Code)
  // We're mimicking tabs side-by-side or stacked inside the viewport
  const bodyWrap = document.createElement('div');
  bodyWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;';

  // Container for Preview
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = 'flex:2;background:#1e293b;display:flex;align-items:center;justify-content:center;position:relative;';
  
  const previewOutput = document.createElement('div');
  previewOutput.className = 'preview-target';
  previewContainer.appendChild(previewOutput);

  // Container for Data Controls
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = 'height:200px;border-top:1px solid #0f172a;background:#020617;padding:1.5rem;display:flex;gap:2rem;flex-wrap:wrap;overflow-y:auto;';

  // Code Output Block (Overlay or Tab)
  // Let's just create a nice absolute-positioned button that toggles Code Source
  const codeOverlay = document.createElement('div');
  codeOverlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:#0f172a;padding:2rem;display:none;z-index:10;color:#38bdf8;font-family:monospace;white-space:pre-wrap;overflow:auto;';
  
  let showCode = false;
  const toggleCodeBtn = document.createElement('button');
  toggleCodeBtn.textContent = 'View Source Code';
  toggleCodeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;background:#1e293b;border:1px solid #475569;color:white;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;z-index:20;';
  toggleCodeBtn.onclick = () => {
    showCode = !showCode;
    toggleCodeBtn.textContent = showCode ? 'Back to Preview' : 'View Source Code';
    codeOverlay.style.display = showCode ? 'block' : 'none';
  };
  
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

  // -- Subscribe to State updates to Re-render Component and Code
  const unsub = activeStateSignal.subscribe(newState => {
    // 1. Update Preview Render
    previewOutput.innerHTML = '';
    const comp = doc.renderPreview(newState);
    
    let elToAppend: HTMLElement;
    if (comp instanceof HTMLElement) {
       elToAppend = comp;
    } else {
       elToAppend = comp.element;
       if (currentCleanup) currentCleanup(); // clean old
       currentCleanup = comp.cleanup.destroy;
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
  activeStateSignal.set(activeStateSignal.value);
};

// Basic Hash Router
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  loadComponent(hash);
});

// Load first or hash
loadComponent(window.location.hash.slice(1) || COMPONENT_REGISTRY[0].id);