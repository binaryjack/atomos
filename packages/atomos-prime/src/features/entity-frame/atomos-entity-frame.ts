const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: var(--frame-width, 200px);
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-family: sans-serif;
    position: absolute;
    user-select: none;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: #f3f4f6;
    border-bottom: 1px solid #d1d5db;
    cursor: move;
    border-radius: 4px 4px 0 0;
  }
  .title {
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
  .subtitle {
    font-size: 11px;
    color: #6b7280;
    margin-left: 8px;
  }
  .toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
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
  }

  disconnectedCallback() {
    this.dom.toggle.removeEventListener('click', this._onToggleClick);
    this.dom.title.removeEventListener('click', this._onTitleClick);
  }

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
