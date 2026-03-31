import type { DAGExport } from '../../core/application/dag-service.js';
import type { DAGObserver } from '../../core/adapters/dag-observer.js';
import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { DomainEntity } from '../../core/domain/entity-aggregate.js';
import type { InteractiveBehaviorManager } from '../../core/types/interactive-behavior-manager.types.js';

export interface SchemaPanelProps {
  readonly dagObserver: DAGObserver;
  readonly viewport: CanvasViewport;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly canvasContainer: HTMLElement;
}

export interface SchemaPanelResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}

const PANEL_DEFAULT_W = 280;
const PANEL_MIN_W     = 180;
const PANEL_MAX_W     = 520;
const PANEL_COLLAPSED_W = 32;

// ─── Internal helpers ──────────────────────────────────────────────────────────

const px = (n: number) => `${n}px`;
const css = (...parts: string[]) => parts.join(';');

// ─── Navigation flash ────────────────────────────────────────────────────────

const ensureFlashStyles = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const s = document.createElement('style');
    s.id = 'vbs-nav-flash-styles';
    s.textContent = [
      '@keyframes vbs-nav-flash {',
      '  0%   { opacity:0; stroke-width:2; stroke-dasharray:none; }',
      '  12%  { opacity:1; stroke-width:4; stroke:#93c5fd; stroke-dasharray:none; }',
      '  55%  { opacity:1; stroke-width:2.5; stroke:#3b82f6; stroke-dasharray:none; }',
      '  100% { opacity:0; stroke-width:2; stroke-dasharray:none; }',
      '}',
      '.vbs-nav-flash .vbs-sel-ring {',
      '  animation: vbs-nav-flash 1s cubic-bezier(0.4,0,0.2,1) forwards !important;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  };
})();

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createSchemaPanel = function(props: SchemaPanelProps): SchemaPanelResult {
  const cleanups: Array<() => void> = [];

  // ── Mutable state ─────────────────────────────────────────────────────────
  const expandedIds  = new Set<string>();
  let selectedId     = '';
  let panelWidth     = PANEL_DEFAULT_W;
  let isCollapsed    = false;
  let searchQuery    = '';
  let currentDag: DAGExport | null = null;

  // ── Root wrapper ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.style.cssText = css(
    'position:absolute', 'top:0', 'right:0', 'bottom:0',
    `width:${px(PANEL_DEFAULT_W)}`,
    'z-index:25',
    'display:flex', 'flex-direction:row',
    'transition:width 0.15s ease',
  );

  // ── Resize handle ────────────────────────────────────────────────────────
  const resizeHandle = document.createElement('div');
  resizeHandle.title = 'Drag to resize';
  resizeHandle.style.cssText = css(
    'width:4px', 'flex-shrink:0',
    'cursor:col-resize',
    'background:transparent',
    'transition:background 0.15s',
  );
  resizeHandle.onmouseenter = () => { resizeHandle.style.background = '#3b82f6'; };
  resizeHandle.onmouseleave = () => { resizeHandle.style.background = 'transparent'; };

  // ── Panel body ───────────────────────────────────────────────────────────
  const body = document.createElement('div');
  body.style.cssText = css(
    'flex:1', 'min-width:0',
    'display:flex', 'flex-direction:column',
    'background:#0a0f1a',
    'border-left:1px solid #1e293b',
    'overflow:hidden',
  );

  // ── Header (expanded) ────────────────────────────────────────────────────
  const headerExpanded = document.createElement('div');
  headerExpanded.style.cssText = css(
    'display:flex', 'align-items:center', 'gap:6px',
    'padding:0 8px', 'height:36px', 'flex-shrink:0',
    'background:#0f172a',
    'border-bottom:1px solid #1e293b',
  );

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.title = 'Collapse panel';
  collapseBtn.textContent = '◄';
  collapseBtn.style.cssText = css(
    'flex-shrink:0', 'background:none', 'border:none',
    'cursor:pointer', 'color:#475569', 'font-size:10px',
    'padding:2px 4px', 'border-radius:3px',
    'transition:color 0.1s',
  );
  collapseBtn.onmouseenter = () => { collapseBtn.style.color = '#e2e8f0'; };
  collapseBtn.onmouseleave = () => { collapseBtn.style.color = '#475569'; };

  const titleEl = document.createElement('span');
  titleEl.textContent = 'Schema';
  titleEl.style.cssText = css(
    'flex-shrink:0', 'font-size:11px', 'font-weight:600',
    'color:#64748b', 'letter-spacing:0.06em', 'text-transform:uppercase',
  );

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search…';
  searchInput.spellcheck = false;
  searchInput.style.cssText = css(
    'flex:1', 'min-width:0',
    'background:#1e293b', 'color:#e2e8f0',
    'border:1px solid #334155', 'border-radius:4px',
    'font-size:11px', 'padding:3px 6px', 'outline:none',
  );

  headerExpanded.appendChild(collapseBtn);
  headerExpanded.appendChild(titleEl);
  headerExpanded.appendChild(searchInput);

  // ── Header (collapsed strip) ──────────────────────────────────────────────
  const headerCollapsed = document.createElement('div');
  headerCollapsed.style.cssText = css(
    'display:none', 'flex-direction:column', 'align-items:center',
    'padding-top:8px', 'gap:4px',
    'cursor:pointer',
  );
  headerCollapsed.title = 'Expand Schema panel';

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.title = 'Expand panel';
  expandBtn.textContent = '►';
  expandBtn.style.cssText = css(
    'background:none', 'border:none', 'cursor:pointer',
    'color:#475569', 'font-size:10px', 'padding:2px',
    'transition:color 0.1s',
  );
  expandBtn.onmouseenter = () => { expandBtn.style.color = '#e2e8f0'; };
  expandBtn.onmouseleave = () => { expandBtn.style.color = '#475569'; };

  const vertLabel = document.createElement('span');
  vertLabel.textContent = 'Schema';
  vertLabel.style.cssText = css(
    'writing-mode:vertical-rl', 'text-orientation:mixed',
    'font-size:10px', 'font-weight:600',
    'color:#334155', 'letter-spacing:0.08em', 'text-transform:uppercase',
    'margin-top:6px',
  );

  headerCollapsed.appendChild(expandBtn);
  headerCollapsed.appendChild(vertLabel);

  // ── Treeview ─────────────────────────────────────────────────────────────
  const treeview = document.createElement('div');
  treeview.style.cssText = css(
    'flex:1', 'overflow-y:auto', 'overflow-x:hidden',
    'padding:4px 0 8px',
  );

  body.appendChild(headerExpanded);
  body.appendChild(headerCollapsed);
  body.appendChild(treeview);

  root.appendChild(resizeHandle);
  root.appendChild(body);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderTree = (): void => {
    if (!currentDag) return;
    treeview.innerHTML = '';

    const q = searchQuery.toLowerCase().trim();
    const nodes = currentDag.nodes as readonly DomainEntity[];

    const filtered: readonly DomainEntity[] = q
      ? nodes.filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.properties.some(p => (p.label ?? p.key).toLowerCase().includes(q))
        )
      : nodes;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = css(
        'padding:24px 12px', 'text-align:center',
        'color:#334155', 'font-size:11px', 'white-space:pre-line',
      );
      empty.textContent = q
        ? 'No matches'
        : 'No entities yet.\nUse the palette to add entities.';
      treeview.appendChild(empty);
    } else {
      filtered.forEach(entity => renderEntityNode(entity, q));
    }

    // Links section
    const edges = currentDag!.edges;
    if (edges.length > 0 && !q) {
      const sep = document.createElement('div');
      sep.style.cssText = css(
        'margin:8px 8px 2px', 'padding:4px 0',
        'font-size:10px', 'font-weight:600', 'color:#334155',
        'text-transform:uppercase', 'letter-spacing:0.05em',
        'border-top:1px solid #1e293b',
      );
      sep.textContent = `Links (${edges.length})`;
      treeview.appendChild(sep);

      edges.forEach(edge => {
        const src = nodes.find(n => n.id === edge.sourceEntityId);
        const dst = nodes.find(n => n.id === edge.targetEntityId);
        const srcName = src?.name ?? edge.sourceEntityId;
        const dstName = dst?.name ?? edge.targetEntityId;
        const card    = `${edge.sourceCardinality ?? '1'}:${edge.targetCardinality ?? '1'}`;

        const linkRow = document.createElement('div');
        linkRow.style.cssText = css(
          'display:flex', 'align-items:center', 'gap:3px',
          'padding:2px 10px', 'font-size:10px', 'font-family:monospace',
          'color:#475569', 'border-radius:3px', 'margin:1px 4px',
        );
        linkRow.onmouseenter = () => { linkRow.style.background = '#0f172a'; };
        linkRow.onmouseleave = () => { linkRow.style.background = ''; };

        const mkSpan = (text: string, color: string): HTMLSpanElement => {
          const s = document.createElement('span');
          s.textContent = text;
          s.style.color = color;
          return s;
        };

        linkRow.appendChild(mkSpan(srcName,           '#94a3b8'));
        linkRow.appendChild(mkSpan(` ──(${card})──▶ `, '#1e293b'));
        linkRow.appendChild(mkSpan(dstName,           '#94a3b8'));
        treeview.appendChild(linkRow);
      });
    }
  };

  const renderEntityNode = (entity: DomainEntity, q: string): void => {
    const isSel      = entity.id === selectedId;
    const isExpanded = expandedIds.has(entity.id);
    const hasProps   = entity.properties.length > 0;

    // Entity row
    const entityRow = document.createElement('div');
    entityRow.dataset.entityId = entity.id;
    entityRow.style.cssText = css(
      'display:flex', 'align-items:center', 'gap:5px',
      'padding:4px 10px 4px 8px',
      'cursor:pointer', 'user-select:none',
      'border-radius:4px', 'margin:1px 4px',
      `background:${isSel ? '#172554' : ''}`,
      isSel ? 'border-left:2px solid #3b82f6;padding-left:6px' : '',
    );

    entityRow.onmouseenter = () => {
      if (!isSel) entityRow.style.background = '#1e293b';
    };
    entityRow.onmouseleave = () => {
      entityRow.style.background = isSel ? '#172554' : '';
    };

    // Chevron
    const chevron = document.createElement('span');
    chevron.textContent = hasProps ? (isExpanded ? '▾' : '▸') : '';
    chevron.style.cssText = css(
      'flex-shrink:0', 'width:12px', 'text-align:center',
      'font-size:10px',
      hasProps ? 'color:#64748b' : 'color:transparent',
    );

    // Shape badge
    const shapeBadge = document.createElement('span');
    shapeBadge.textContent = entity.shape ?? 'box';
    shapeBadge.style.cssText = css(
      'flex-shrink:0', 'font-size:9px', 'font-family:monospace',
      'padding:0 3px', 'border-radius:3px',
      'background:#1e293b', 'color:#818cf8', 'border:1px solid #312e81',
    );

    // Entity name
    const nameEl = document.createElement('span');
    nameEl.textContent = entity.name;
    nameEl.style.cssText = css(
      'flex:1', 'font-size:12px', 'font-weight:500',
      'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
      isSel ? 'color:#93c5fd' : 'color:#e2e8f0',
    );

    entityRow.appendChild(chevron);
    entityRow.appendChild(shapeBadge);
    entityRow.appendChild(nameEl);

    if (hasProps) {
      const countBadge = document.createElement('span');
      countBadge.textContent = String(entity.properties.length);
      countBadge.style.cssText = css(
        'flex-shrink:0', 'font-size:9px',
        'background:#1e293b', 'color:#64748b',
        'padding:0 4px', 'border-radius:8px', 'border:1px solid #334155',
      );
      entityRow.appendChild(countBadge);
    }

    // Determine click zone for chevron toggle vs entity select
    entityRow.addEventListener('click', (e: MouseEvent) => {
      if (hasProps) {
        const chevronRect = chevron.getBoundingClientRect();
        const onChevron   = e.clientX <= chevronRect.right + 8;
        if (onChevron) {
          toggleExpand(entity.id);
          return;
        }
      }
      // Select + focus
      props.behaviorManager.selectEntity(entity.id);
      focusEntityOnCanvas(entity);
      if (hasProps && !expandedIds.has(entity.id)) {
        expandedIds.add(entity.id);
        renderTree();
      } else {
        renderTree(); // re-render to highlight
      }
    });

    treeview.appendChild(entityRow);

    // Properties (when expanded)
    if (isExpanded && hasProps) {
      const propsToShow = q
        ? entity.properties.filter(p =>
            (p.label ?? p.key).toLowerCase().includes(q) ||
            (p.dataType ?? '').toLowerCase().includes(q)
          )
        : entity.properties;

      const propsList = document.createElement('div');
      propsList.style.cssText = 'padding-left:28px;';

      propsToShow.forEach((prop, idx) => {
        const isLast  = idx === propsToShow.length - 1;
        const propRow = document.createElement('div');
        propRow.style.cssText = css(
          'display:flex', 'align-items:center', 'gap:5px',
          'padding:2px 8px 2px 0',
          'font-size:10px', 'font-family:monospace',
          'color:#475569', 'border-radius:3px',
        );
        propRow.onmouseenter = () => { propRow.style.background = '#0f172a'; propRow.style.color = '#94a3b8'; };
        propRow.onmouseleave = () => { propRow.style.background = ''; propRow.style.color = '#475569'; };

        const connector = document.createElement('span');
        connector.textContent = isLast ? '└' : '├';
        connector.style.cssText = 'flex-shrink:0;color:#1e293b;margin-right:2px;';

        const propName = document.createElement('span');
        propName.textContent = prop.label ?? prop.key;
        propName.style.cssText = 'color:#94a3b8;flex-shrink:0;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const propType = document.createElement('span');
        propType.textContent = prop.dataType ?? '?';
        propType.style.cssText = 'color:#6366f1;flex-shrink:0;';

        propRow.appendChild(connector);
        propRow.appendChild(propName);
        propRow.appendChild(propType);

        const val = prop.value;
        if (val !== undefined && val !== '' && val !== null) {
          const propValue = document.createElement('span');
          propValue.textContent = `= ${String(val)}`;
          propValue.style.cssText = 'color:#f59e0b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          propRow.appendChild(propValue);
        }

        propsList.appendChild(propRow);
      });

      treeview.appendChild(propsList);
    }
  };

  // ── Focus + flash entity on canvas ───────────────────────────────────────
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  const focusEntityOnCanvas = (entity: DomainEntity): void => {
    const rect  = props.canvasContainer.getBoundingClientRect();
    const zoom  = props.viewport.state.value.zoom;
    const cx    = entity.position.x + entity.dimensions.width  / 2;
    const cy    = entity.position.y + entity.dimensions.height / 2;
    const viewW = rect.width  - (isCollapsed ? PANEL_COLLAPSED_W : panelWidth);
    const viewH = rect.height;
    props.viewport.panTo(viewW / 2 - cx * zoom, viewH / 2 - cy * zoom);

    // ── Flash ring animation ──────────────────────────────────────────────
    ensureFlashStyles();
    const svg = props.canvasContainer.querySelector('svg');
    if (svg) {
      // Clear any existing flash
      if (flashTimeout !== null) clearTimeout(flashTimeout);
      const prev = svg.querySelector('.vbs-nav-flash');
      if (prev) prev.classList.remove('vbs-nav-flash');

      const target = svg.querySelector<SVGGElement>(`[data-entity-id="${entity.id}"]`);
      if (target) {
        // Force animation restart via reflow
        void target.getBoundingClientRect();
        target.classList.add('vbs-nav-flash');
        flashTimeout = setTimeout(() => {
          target.classList.remove('vbs-nav-flash');
          flashTimeout = null;
        }, 1050);
      }
    }
  };

  const toggleExpand = (entityId: string): void => {
    if (expandedIds.has(entityId)) {
      expandedIds.delete(entityId);
    } else {
      expandedIds.add(entityId);
    }
    renderTree();
  };

  // ── Collapse / expand ─────────────────────────────────────────────────────
  const collapse = (): void => {
    isCollapsed = true;
    root.style.width = px(PANEL_COLLAPSED_W);
    resizeHandle.style.display = 'none';
    headerExpanded.style.display = 'none';
    headerCollapsed.style.display = 'flex';
    treeview.style.display = 'none';
  };

  const expand = (): void => {
    isCollapsed = false;
    root.style.width = px(panelWidth);
    resizeHandle.style.display = '';
    headerExpanded.style.display = 'flex';
    headerCollapsed.style.display = 'none';
    treeview.style.display = '';
  };

  collapseBtn.addEventListener('click', collapse);
  expandBtn.addEventListener('click', expand);
  headerCollapsed.addEventListener('click', expand);

  // ── Resize ────────────────────────────────────────────────────────────────
  let isResizing   = false;
  let resizeStartX = 0;
  let resizeStartW = PANEL_DEFAULT_W;

  const onResizeDown = (e: MouseEvent): void => {
    isResizing   = true;
    resizeStartX = e.clientX;
    resizeStartW = panelWidth;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const onResizeMove = (e: MouseEvent): void => {
    if (!isResizing) return;
    const delta = resizeStartX - e.clientX;
    panelWidth  = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, resizeStartW + delta));
    root.style.width = px(panelWidth);
  };

  const onResizeUp = (): void => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  };

  resizeHandle.addEventListener('mousedown', onResizeDown);
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup',   onResizeUp);
  cleanups.push(() => {
    resizeHandle.removeEventListener('mousedown', onResizeDown);
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup',   onResizeUp);
  });

  // ── Search ────────────────────────────────────────────────────────────────
  const onSearch = (): void => {
    searchQuery = searchInput.value;
    renderTree();
  };
  searchInput.addEventListener('input', onSearch);
  cleanups.push(() => searchInput.removeEventListener('input', onSearch));

  // ── DAG subscription ──────────────────────────────────────────────────────
  const unsubDag = props.dagObserver.subscribe(dag => {
    currentDag = dag;
    renderTree();
  });
  cleanups.push(unsubDag);

  // ── Canvas selection sync ─────────────────────────────────────────────────
  const unsubBehavior = props.behaviorManager.behaviorState.subscribe(state => {
    const next = state.activeEntityId ?? '';
    if (next !== selectedId) {
      selectedId = next;
      renderTree();
    }
  });
  cleanups.push(unsubBehavior);

  // ── Initial render ────────────────────────────────────────────────────────
  renderTree();

  return {
    element: root,
    cleanup: {
      destroy: () => {
        if (flashTimeout !== null) clearTimeout(flashTimeout);
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};
