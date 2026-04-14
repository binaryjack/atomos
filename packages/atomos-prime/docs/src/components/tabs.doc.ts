import { VbsTab, VbsTabPanel, VbsTabs } from '../../../src/components/tabs/index.js'
import type { DocDefinition } from '../types.js'

if (!customElements.get('vbs-tabs')) customElements.define('vbs-tabs', VbsTabs);
if (!customElements.get('vbs-tab')) customElements.define('vbs-tab', VbsTab);
if (!customElements.get('vbs-tab-panel')) customElements.define('vbs-tab-panel', VbsTabPanel);

export interface TabsState {
  activeTab: string;
}

export const tabsDoc: DocDefinition<TabsState> = {
  id: 'tabs',
  category: 'Structural / Layout',
  title: 'Tabs (Web Components)',
  description: 'Native web components <vbs-tabs>, <vbs-tab>, and <vbs-tab-panel> providing clean tabbed navigation and accessible slot interactions.',
  defaultState: {
    activeTab: 'tab1'
  },
  controls: [
    { key: 'activeTab', label: 'Active Tab ID', type: 'select', options: ['tab1', 'tab2', 'tab3'] }
  ],
  renderPreview: (state) => {
    const tabsEl = document.createElement('vbs-tabs');
    tabsEl.setAttribute('active-tab', state.activeTab);
    tabsEl.style.cssText = 'width: 400px; max-width: 90vw; background: var(--vbs-bg-panel, #1e293b); border: 1px solid var(--vbs-border, #334155); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; min-height: 200px;';

    // Tabs
    const t1 = document.createElement('vbs-tab');
    t1.setAttribute('slot', 'tab');
    t1.setAttribute('value', 'tab1');
    t1.textContent = 'General';

    const t2 = document.createElement('vbs-tab');
    t2.setAttribute('slot', 'tab');
    t2.setAttribute('value', 'tab2');
    t2.textContent = 'Account';

    const t3 = document.createElement('vbs-tab');
    t3.setAttribute('slot', 'tab');
    t3.setAttribute('value', 'tab3');
    t3.textContent = 'Advanced';

    // Panels
    const p1 = document.createElement('vbs-tab-panel');
    p1.setAttribute('slot', 'panel');
    p1.setAttribute('id', 'tab1');
    p1.innerHTML = '<div style="padding: 1rem; color: var(--vbs-text-primary, #fff);">This is the general settings page.</div>';

    const p2 = document.createElement('vbs-tab-panel');
    p2.setAttribute('slot', 'panel');
    p2.setAttribute('id', 'tab2');
    p2.innerHTML = '<div style="padding: 1rem; color: var(--vbs-text-primary, #fff);">Billing and security information goes here.</div>';

    const p3 = document.createElement('vbs-tab-panel');
    p3.setAttribute('slot', 'panel');
    p3.setAttribute('id', 'tab3');
    p3.innerHTML = '<div style="padding: 1rem; color: var(--vbs-text-primary, #fff);">Advanced configurations are hidden here.</div>';

    tabsEl.appendChild(t1);
    tabsEl.appendChild(t2);
    tabsEl.appendChild(t3);
    tabsEl.appendChild(p1);
    tabsEl.appendChild(p2);
    tabsEl.appendChild(p3);

    return {
      element: tabsEl,
      cleanup: {
        destroy: () => {
          tabsEl.remove();
        }
      }
    };
  },
  renderCode: (state) => {
    return `import { VbsTabs, VbsTab, VbsTabPanel } from '@atomos-web/prime';

// Only needed once per application
if (!customElements.get('vbs-tabs')) customElements.define('vbs-tabs', VbsTabs);
if (!customElements.get('vbs-tab')) customElements.define('vbs-tab', VbsTab);
if (!customElements.get('vbs-tab-panel')) customElements.define('vbs-tab-panel', VbsTabPanel);

const html = \`
  <vbs-tabs active-tab="${state.activeTab}">
    <vbs-tab slot="tab" value="tab1">General</vbs-tab>
    <vbs-tab slot="tab" value="tab2">Account</vbs-tab>
    <vbs-tab slot="tab" value="tab3">Advanced</vbs-tab>

    <vbs-tab-panel slot="panel" id="tab1">General content...</vbs-tab-panel>
    <vbs-tab-panel slot="panel" id="tab2">Account content...</vbs-tab-panel>
    <vbs-tab-panel slot="panel" id="tab3">Advanced content...</vbs-tab-panel>
  </vbs-tabs>
\`;

document.body.insertAdjacentHTML('beforeend', html);`;
  }
};