const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-family: inherit;
    --tab-border-color: #334155;
    --tab-active-color: #a855f7;
    --tab-bg-color: #0f172a;
    --tab-text-color: #94a3b8;
    --tab-active-text-color: #f8fafc;
  }

  .tab-list {
    display: flex;
    flex-wrap: nowrap;
    border-bottom: 1px solid var(--tab-border-color);
    overflow-x: auto;
    scrollbar-width: none;
    background: var(--tab-bg-color);
  }
  .tab-list::-webkit-scrollbar {
    display: none;
  }

  .tab-panels {
    flex: 1;
    overflow: auto;
    position: relative;
    display: flex;
    flex-direction: column;
  }
</style>
<div class="tab-list" role="tablist">
  <slot name="tab"></slot>
</div>
<div class="tab-panels">
  <slot name="panel"></slot>
</div>
`;

export class VbsTabs extends HTMLElement {
  #tabSlot: HTMLSlotElement;
  #panelSlot: HTMLSlotElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.#tabSlot = this.shadowRoot!.querySelector('slot[name="tab"]') as HTMLSlotElement;
    this.#panelSlot = this.shadowRoot!.querySelector('slot[name="panel"]') as HTMLSlotElement;

    this._onTabClick = this._onTabClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onSlotChange = this._onSlotChange.bind(this);
  }

  get activeTab(): string | null {
    return this.getAttribute('active-tab');
  }

  set activeTab(val: string | null) {
    if (val) {
      this.setAttribute('active-tab', val);
    } else {
      this.removeAttribute('active-tab');
    }
  }

  static get observedAttributes() {
    return ['active-tab'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'active-tab' && oldValue !== newValue) {
      this._syncTabs();
    }
  }

  connectedCallback() {
    this.addEventListener('vbs-tab-click', this._onTabClick as EventListener);
    this.#tabSlot.addEventListener('keydown', this._onKeyDown);
    this.#tabSlot.addEventListener('slotchange', this._onSlotChange);
    this.#panelSlot.addEventListener('slotchange', this._onSlotChange);
  }

  disconnectedCallback() {
    this.removeEventListener('vbs-tab-click', this._onTabClick as EventListener);
    this.#tabSlot.removeEventListener('keydown', this._onKeyDown);
    this.#tabSlot.removeEventListener('slotchange', this._onSlotChange);
    this.#panelSlot.removeEventListener('slotchange', this._onSlotChange);
  }

  private _onSlotChange() {
    this._linkPanels();
    this._syncTabs();
  }

  private _linkPanels() {
    const tabs = this._allTabs();
    const panels = this._allPanels();

    tabs.forEach((tab, index) => {
      const panel = panels[index];
      if (panel) {
        const tabId = tab.id || `vbs-tab-${index}`;
        const panelId = panel.id || `vbs-panel-${index}`;
        
        tab.id = tabId;
        tab.setAttribute('aria-controls', panelId);
        tab.value = tab.getAttribute('value') || tabId;

        panel.id = panelId;
        panel.setAttribute('aria-labelledby', tabId);
        
        if (!this.activeTab && index === 0) {
          this.activeTab = tab.value;
        }
      }
    });
  }

  private _syncTabs() {
    const tabs = this._allTabs();
    const panels = this._allPanels();
    const active = this.activeTab;

    tabs.forEach(tab => {
      const isSelected = tab.value === active;
      tab.selected = isSelected;
      if (isSelected) tab.setAttribute('tabindex', '0');
      else tab.setAttribute('tabindex', '-1');
    });

    panels.forEach(panel => {
      const activeTabElement = tabs.find(t => t.value === active);
      if (activeTabElement && panel.id === activeTabElement.getAttribute('aria-controls')) {
        panel.active = true;
      } else {
        panel.active = false;
      }
    });
    
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: active },
      bubbles: true,
      composed: true
    }));
  }

  private _onTabClick(e: CustomEvent) {
    const tab = e.target as any;
    if (tab && tab.value) {
      this.activeTab = tab.value;
    }
  }

  private _onKeyDown(e: KeyboardEvent) {
    const tabs = this._allTabs();
    const currentIndex = tabs.findIndex(tab => tab.value === this.activeTab);
    
    let newIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      newIndex = (currentIndex + 1) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      newIndex = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
      e.preventDefault();
    }

    if (newIndex > -1) {
      this.activeTab = tabs[newIndex].value;
      tabs[newIndex].focus();
    }
  }

  private _allTabs(): any[] {
    return this.#tabSlot.assignedElements({ flatten: true }).filter(el => el.tagName.toLowerCase() === 'vbs-tab');
  }

  private _allPanels(): any[] {
    return this.#panelSlot.assignedElements({ flatten: true }).filter(el => el.tagName.toLowerCase() === 'vbs-tab-panel');
  }
}

customElements.define('vbs-tabs', VbsTabs);
