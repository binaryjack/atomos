const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: var(--frame-width, 200px);
    background: var(--vbs-bg-panel);
    border: 1px solid var(--vbs-border);
    border-radius: var(--vbs-radius);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
    font-family: sans-serif;
    position: absolute;
    user-select: none;
    color: var(--vbs-text-primary);
  }
  
  /* Spotlight Border variables set by JS */
  :host(.spotlight-active) {
    border: 1px solid transparent;
    background: linear-gradient(var(--vbs-bg-panel), var(--vbs-bg-panel)) padding-box,
                var(--vbs-border) border-box;
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
      rgba(255, 255, 255, 0.9) 0%,
      rgba(59, 130, 246, 1) 10%,
      rgba(59, 130, 246, 0.2) 40%,
      transparent 60%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
    pointer-events: none;
  }
  
  :host(.spotlight-active:hover)::before {
    opacity: 1;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: rgba(0,0,0,0.2);
    border-bottom: 1px solid var(--vbs-border);
    cursor: move;
    border-radius: var(--vbs-radius) var(--vbs-radius) 0 0;
  }
  .title {
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    color: var(--vbs-text-primary);
  }
  .subtitle {
    font-size: 11px;
    color: var(--vbs-text-secondary);
    margin-left: 8px;
  }
  .toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--vbs-text-secondary);
  }
  .body {
    padding: 8px;
    display: block;
  }
  :host([collapsed]) .body {
    display: none;
  }
</style>
<div class="header">
  <div>
    <span class="title"></span>
    <span class="subtitle"></span>
  </div>
  <button class="toggle">▼</button>
</div>
<div class="body">
  <slot></slot>
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
