import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { EntityManager } from '../../core/presentation/entity-manager.js';
import type { DomainEntity } from '../../core/domain/entity-aggregate.js';

export interface EntitySearchResult {
  readonly open: () => void;
  readonly close: () => void;
  readonly cleanup: { destroy: () => void };
}

const highlight = (text: string, query: string): string => {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), (m) => `<mark style="background:#3b82f6;color:#fff;border-radius:2px;">${m}</mark>`);
};

const fuzzyMatch = (text: string, query: string): boolean =>
  text.toLowerCase().includes(query.toLowerCase());

export const createEntitySearch = function(
  entityManager: EntityManager,
  viewport: CanvasViewport,
  canvasContainer: HTMLElement,
): EntitySearchResult {
  const cleanups: Array<() => void> = [];
  let isOpen = false;
  let activeIdx = 0;
  let filtered: DomainEntity[] = [];

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = [
    'position:fixed;inset:0;z-index:1000;',
    'background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);',
    'display:flex;align-items:flex-start;justify-content:center;padding-top:80px;',
  ].join('');

  // Dialog box
  const dialog = document.createElement('div');
  dialog.style.cssText = [
    'background:var(--vbs-bg-panel,#111);',
    'border:1px solid var(--vbs-border,#27272a);',
    'border-radius:8px;width:460px;max-width:90vw;',
    'box-shadow:0 20px 60px rgba(0,0,0,0.6);',
    'overflow:hidden;',
  ].join('');

  // Search input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search entities…';
  input.style.cssText = [
    'width:100%;box-sizing:border-box;',
    'background:transparent;border:none;border-bottom:1px solid var(--vbs-border,#27272a);',
    'color:var(--vbs-text-primary,#f4f4f5);font-size:15px;',
    'padding:14px 16px;outline:none;',
    'font-family:system-ui,sans-serif;',
  ].join('');

  // Results list
  const list = document.createElement('div');
  list.style.cssText = [
    'max-height:320px;overflow-y:auto;',
    'display:flex;flex-direction:column;',
  ].join('');

  // Empty state
  const empty = document.createElement('div');
  empty.style.cssText = [
    'padding:16px;color:var(--vbs-text-secondary,#a1a1aa);',
    'font-size:13px;font-family:system-ui,sans-serif;text-align:center;',
  ].join('');
  empty.textContent = 'No matching entities';

  dialog.appendChild(input);
  dialog.appendChild(list);
  backdrop.appendChild(dialog);

  const renderList = (): void => {
    list.innerHTML = '';
    if (filtered.length === 0) {
      list.appendChild(empty);
      return;
    }
    filtered.forEach((entity, i) => {
      const q = input.value;
      const item = document.createElement('div');
      item.style.cssText = [
        'display:flex;align-items:center;gap:10px;',
        'padding:8px 16px;cursor:pointer;',
        'font-family:system-ui,sans-serif;font-size:13px;',
        'border-bottom:1px solid var(--vbs-border,#27272a);',
        i === activeIdx
          ? 'background:var(--vbs-primary,#3b82f6);color:#fff;'
          : 'color:var(--vbs-text-primary,#f4f4f5);',
      ].join('');

      // Shape badge
      const badge = document.createElement('span');
      badge.textContent = entity.shape ?? 'box';
      badge.style.cssText = [
        'font-size:10px;padding:1px 5px;border-radius:3px;flex-shrink:0;',
        i === activeIdx
          ? 'background:rgba(255,255,255,0.2);color:#fff;'
          : 'background:var(--vbs-border,#27272a);color:var(--vbs-text-secondary,#a1a1aa);',
      ].join('');

      // Name with highlight
      const nameSpan = document.createElement('span');
      nameSpan.innerHTML = highlight(entity.name, q);
      nameSpan.style.flex = '1';

      // Prop count
      const props = document.createElement('span');
      props.textContent = `${entity.properties.length} props`;
      props.style.cssText = [
        'font-size:11px;flex-shrink:0;',
        i === activeIdx ? 'color:rgba(255,255,255,0.7);' : 'color:var(--vbs-text-secondary,#a1a1aa);',
      ].join('');

      item.appendChild(badge);
      item.appendChild(nameSpan);
      item.appendChild(props);

      item.addEventListener('mouseenter', () => { activeIdx = i; renderList(); });
      item.addEventListener('click', () => { selectEntity(i); });

      list.appendChild(item);
    });
  };

  const selectEntity = (idx: number): void => {
    const entity = filtered[idx];
    if (!entity) return;
    close();
    const rect = canvasContainer.getBoundingClientRect();
    const { zoom } = viewport.state.value;
    const cx = entity.position.x + entity.dimensions.width / 2;
    const cy = entity.position.y + entity.dimensions.height / 2;
    viewport.panTo(
      rect.width / 2 - cx * zoom,
      rect.height / 2 - cy * zoom,
    );
    // Flash the entity ring via a CSS animation if it exists in the DOM
    const ring = document.querySelector(`[data-entity-ring="${entity.id}"]`);
    if (ring) {
      ring.classList.remove('vbs-ring-flash');
      void (ring as HTMLElement).offsetWidth; // reflow
      ring.classList.add('vbs-ring-flash');
    }
  };

  const updateFilter = (): void => {
    const q = input.value.trim();
    const all = entityManager.getAllEntities();
    filtered = q ? all.filter(e => fuzzyMatch(e.name, q)) : [...all] as DomainEntity[];
    activeIdx = 0;
    renderList();
  };

  input.addEventListener('input', updateFilter);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, filtered.length - 1);
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectEntity(activeIdx);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });

  const open = (): void => {
    if (isOpen) return;
    isOpen = true;
    input.value = '';
    updateFilter();
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => input.focus());
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  };

  return {
    open,
    close,
    cleanup: {
      destroy: () => {
        close();
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      },
    },
  };
};
