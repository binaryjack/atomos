import { createBadge, createButton, createCircularProgress, createInput, createProgressBar, createToggle } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface ThemeBuilderState {
  primaryScale: string;
  bgPanel: string;
  bgBody: string;
  textColor: string;
  dangerColor: string;
  successColor: string;
  borderRadius: number;
}

export const themeBuilderDoc: DocDefinition<ThemeBuilderState> = {
  id: 'theme-builder',
  category: 'General / Setup',
  title: 'CSS Theme Builder',
  description: 'Adjust global CSS Custom Properties (--vbs-*) to instantly theme all @atomos-web/prime components.',
  defaultState: {
    primaryScale: '#3b82f6',     // blue-500
    bgPanel: '#111111',          // default panel
    bgBody: '#0f172a',           // default docs body
    textColor: '#f4f4f5',
    dangerColor: '#ef4444',      // red-500
    successColor: '#10b981',     // green-500
    borderRadius: 4
  },
  controls: [
    { key: 'primaryScale', label: 'Primary Brand Color', type: 'color' },
    { key: 'successColor', label: 'Success Color', type: 'color' },
    { key: 'dangerColor', label: 'Danger Color', type: 'color' },
    { key: 'bgBody', label: 'Body Background', type: 'color' },
    { key: 'bgPanel', label: 'Panel / Control Background', type: 'color' },
    { key: 'textColor', label: 'Text Color', type: 'color' },
    { key: 'borderRadius', label: 'Global Radius (px)', type: 'number' }
  ],
  renderPreview: (state) => {
    // 1. Inject the variables onto the :root so the entire document changes
    document.documentElement.style.setProperty('--vbs-primary', state.primaryScale);
    document.documentElement.style.setProperty('--vbs-danger', state.dangerColor);
    document.documentElement.style.setProperty('--vbs-success', state.successColor);
    document.documentElement.style.setProperty('--vbs-bg-body', state.bgBody);
    document.documentElement.style.setProperty('--vbs-bg-panel', state.bgPanel);
    document.documentElement.style.setProperty('--vbs-text-primary', state.textColor);
    document.documentElement.style.setProperty('--vbs-radius', `${state.borderRadius}px`);

    document.body.style.backgroundColor = 'var(--vbs-bg-body)';

    // 2. Create a mini dashboard to showcase the theme changes
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-direction:column;gap:2rem;padding:2rem;background:var(--vbs-bg-panel);border-radius:var(--vbs-radius);border:1px solid var(--vbs-border,#27272a);box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);width:100%;max-width:500px;';

    // Header
    const title = document.createElement('h3');
    title.textContent = 'Theme Preview Dashboard';
    title.style.cssText = 'color:var(--vbs-text-primary);margin:0;font-size:1.25rem;';
    container.appendChild(title);

    // Row 1: Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:1rem;';
    const b1 = createButton({ children: 'Primary', variant: 'primary', size: 'md' });
    const b2 = createButton({ children: 'Secondary', variant: 'secondary', size: 'md' });
    const b3 = createButton({ children: 'Danger', variant: 'danger', size: 'md' });
    btnRow.appendChild(b1.element);
    btnRow.appendChild(b2.element);
    btnRow.appendChild(b3.element);
    container.appendChild(btnRow);

    // Row 2: Inputs
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:1.5rem;align-items:center;';
    const inp = createInput({ type: 'text', placeholder: 'Input field...', value: '' });
    const tog = createToggle({ checked: true, label: 'Feature flag' });
    inp.element.style.flex = '1';
    inputRow.appendChild(inp.element);
    inputRow.appendChild(tog.element);
    container.appendChild(inputRow);

    // Row 3: Display Elements
    const dispRow = document.createElement('div');
    dispRow.style.cssText = 'display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;';
    const pBar = createProgressBar({ value: 65, variant: 'primary', size: 'md' });
    pBar.element.style.flex = '1';
    const circ = createCircularProgress({ value: 80, size: 40, strokeWidth: 4, variant: 'success', showLabel: false });
    dispRow.appendChild(pBar.element);
    dispRow.appendChild(circ.element);
    container.appendChild(dispRow);

    // Row 4: Badges
    const badgeRow = document.createElement('div');
    badgeRow.style.cssText = 'display:flex;gap:0.5rem;';
    const bge1 = createBadge({ text: 'Active', variant: 'success' });
    const bge2 = createBadge({ text: 'Warning', variant: 'warning' });
    const bge3 = createBadge({ text: 'Error', variant: 'error' });
    badgeRow.appendChild(bge1.element);
    badgeRow.appendChild(bge2.element);
    badgeRow.appendChild(bge3.element);
    container.appendChild(badgeRow);

    return { 
      element: container, 
      cleanup: { 
        destroy: () => {
          b1.cleanup.destroy();
          b2.cleanup.destroy();
          b3.cleanup.destroy();
          inp.cleanup.destroy();
          tog.cleanup.destroy();
          pBar.cleanup.destroy();
          circ.cleanup.destroy();
          bge1.cleanup.destroy();
          bge2.cleanup.destroy();
          bge3.cleanup.destroy();
        }
      } 
    };
  },
  renderCode: (state) => {
    return `/* Global CSS Defaults */
:root {
  --vbs-primary: ${state.primaryScale};
  --vbs-danger: ${state.dangerColor};
  --vbs-success: ${state.successColor};
  --vbs-bg-body: ${state.bgBody};
  --vbs-bg-panel: ${state.bgPanel};
  --vbs-text-primary: ${state.textColor};
  --vbs-radius: ${state.borderRadius}px;
}

/* Simply defining these properties affects all \\n   @atomos-web/prime components imported in the module */
`;
  }
};
