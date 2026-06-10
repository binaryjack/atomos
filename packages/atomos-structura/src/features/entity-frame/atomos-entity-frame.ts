const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: var(--frame-width, 220px);
    background: var(--vbs-bg-panel, rgba(15, 23, 42, 0.75));
    backdrop-filter: blur(var(--glass-blur, 12px));
    -webkit-backdrop-filter: blur(var(--glass-blur, 12px));
    border: 1px solid var(--vbs-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--vbs-radius, 12px);
    box-shadow: var(--shadow-elevation, 0 8px 32px 0 rgba(0, 0, 0, 0.37));
    font-family: var(--vbs-font-family, 'Inter', system-ui, sans-serif);
    position: absolute;
    user-select: none;
    color: var(--vbs-text-primary, #f8fafc);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
  }
  
  /* Spotlight Border variables set by JS */
  :host(.spotlight-active) {
    border: 1px solid transparent;
    background: linear-gradient(var(--vbs-bg-panel, rgba(15, 23, 42, 0.75)), var(--vbs-bg-panel, rgba(15, 23, 42, 0.75))) padding-box,
                var(--vbs-border, rgba(255, 255, 255, 0.1)) border-box;
    z-index: 100;
  }
  
  :host(.spotlight-active)::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: radial-gradient(
      150px circle at var(--mouse-x, 0%) var(--mouse-y, 0%),
      rgba(255, 255, 255, 0.8) 0%,
      var(--vbs-primary, rgba(59, 130, 246, 1)) 20%,
      transparent 80%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
    z-index: -1;
    pointer-events: none;
  }
  
  :host(.spotlight-active:hover) {
    box-shadow: 0 12px 40px -4px rgba(0, 0, 0, 0.5), 0 0 15px var(--vbs-primary-glow, rgba(59, 130, 246, 0.2));
    transform: translateY(-2px);
  }

  :host(.spotlight-active:hover)::before {
    opacity: 1;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--entity-padding, 12px 16px);
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    cursor: move;
  }
  .title-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .title {
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.01em;
    cursor: pointer;
    color: var(--vbs-text-primary, #f8fafc);
  }
  .subtitle {
    font-size: 11px;
    font-weight: 500;
    color: var(--vbs-text-secondary, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 10px;
    color: var(--vbs-text-secondary, #94a3b8);
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .toggle:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  .body {
    padding: var(--entity-padding, 12px 16px);
    display: block;
  }
  :host([collapsed]) .body {
    display: none;
  }

  /* Properties Grid Layout */
  .properties-grid {
    display: grid;
    grid-template-columns: minmax(60px, auto) 1fr auto;
    gap: 8px 12px;
    align-items: baseline;
    font-size: 12px;
  }
  
  ::slotted(.property-key) {
    font-weight: 600;
    color: var(--vbs-text-muted, #cbd5e1);
  }
  
  ::slotted(.property-value) {
    color: var(--vbs-text-primary, #f8fafc);
    word-break: break-all;
  }
  
  ::slotted(.property-type) {
    font-size: 10px;
    font-style: italic;
    color: var(--vbs-text-tertiary, #64748b);
    text-align: right;
  }
</style>
<div class="header">
  <div class="title-wrapper">
    <span class="title"></span>
    <span class="subtitle"></span>
  </div>
  <button class="toggle">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
</div>
<div class="body">
  <div class="properties-grid">
    <slot></slot>
  </div>
</div>
`;

export class AtomosEntityFrame extends HTMLElement {
  private dom!: {
    header: HTMLElement;
    title: HTMLElement;
    subtitle: HTMLElement;
    toggle: HTMLButtonElement;
  };

  static get observedAttributes() {
    return ['title', 'subtitle', 'collapsed', 'x', 'y', 'width'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    
    this.dom = {
      header: shadow.querySelector('.header') as HTMLElement,
      title: shadow.querySelector('.title') as HTMLElement,
      subtitle: shadow.querySelector('.subtitle') as HTMLElement,
      toggle: shadow.querySelector('.toggle') as HTMLButtonElement,
    };
    
    this._onToggleClick = this._onToggleClick.bind(this);
    this._onTitleClick = this._onTitleClick.bind(this);
  }

  override get title(): string { return this.getAttribute('title') || ''; }
  override set title(val: string) { this.setAttribute('title', val); }

  get subtitle(): string { return this.getAttribute('subtitle') || ''; }
  set subtitle(val: string) { this.setAttribute('subtitle', val); }

  get collapsed(): boolean { return this.hasAttribute('collapsed'); }
  set collapsed(val: boolean) { 
    if (val) this.setAttribute('collapsed', '');
    else this.removeAttribute('collapsed');
  }

  get x(): number { return Number(this.getAttribute('x') || 0); }
  set x(val: number) { this.setAttribute('x', String(val)); }

  get y(): number { return Number(this.getAttribute('y') || 0); }
  set y(val: number) { this.setAttribute('y', String(val)); }

  get width(): number { return Number(this.getAttribute('width') || 200); }
  set width(val: number) { this.setAttribute('width', String(val)); }

  connectedCallback() {
    this.dom.toggle.addEventListener('click', this._onToggleClick);
    this.dom.title.addEventListener('click', this._onTitleClick);
    this._updatePosition();
    this._updateTitle();
    this._updateSubtitle();
    this._updateToggle();
    this.style.setProperty('--frame-width', this.width + 'px');
    
    // Add spotlight effect class and listener
    this.classList.add('spotlight-active');
    this.addEventListener('mousemove', this._onMouseMove);
  }

  disconnectedCallback() {
    this.dom.toggle.removeEventListener('click', this._onToggleClick);
    this.dom.title.removeEventListener('click', this._onTitleClick);
    this.removeEventListener('mousemove', this._onMouseMove);
  }

  private _onMouseMove = (e: MouseEvent) => {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.style.setProperty('--mouse-x', `${x}px`);
    this.style.setProperty('--mouse-y', `${y}px`);
  };

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;
    if (name === 'title') this._updateTitle();
    if (name === 'subtitle') this._updateSubtitle();
    if (name === 'collapsed') this._updateToggle();
    if (name === 'x' || name === 'y') this._updatePosition();
    if (name === 'width') {
      this.style.setProperty('--frame-width', newVal + 'px');
    }
  }

  private _updateTitle() {
    this.dom.title.textContent = this.title;
  }

  private _updateSubtitle() {
    this.dom.subtitle.textContent = this.subtitle;
  }

  private _updateToggle() {
    this.dom.toggle.textContent = this.collapsed ? '▶' : '▼';
  }

  private _updatePosition() {
    this.style.left = this.x + 'px';
    this.style.top = this.y + 'px';
  }

  private _onToggleClick(e: Event) {
    e.stopPropagation();
    this.collapsed = !this.collapsed;
    this.dispatchEvent(new CustomEvent('toggle-collapse', { 
      detail: { collapsed: this.collapsed } 
    }));
  }

  private _onTitleClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('title-click'));
  }
}

export const defineAtomosEntityFrame = () => {
  if (!customElements.get('atomos-entity-frame')) {
    customElements.define('atomos-entity-frame', AtomosEntityFrame);
  }
};
