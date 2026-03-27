import type { Signal } from './types/signal.types.js';
import type { WorkspaceState } from './types/workspace-state.types.js';
import type { LinkManager } from './types/link-manager.types.js';
import type { EdgePosition } from '../features/edge/types/edge-position.types.js';
import { bezierMidpoint } from './bezier.js';
import { openLinkSettingsModal } from '../features/modal/create-link-settings-modal.js';

export interface LinkFinalizer {
  readonly finalizeLinkToAnchor: (
    dstAnchorId: string,
    dstAnchorPos: { x: number; y: number },
    dstEntityId: string,
    dstEdge: EdgePosition,
    srcAnchorId: string,
    srcEntityId: string,
    srcEdge: EdgePosition,
    srcPos: { x: number; y: number }
  ) => void;
  readonly removeLinksForEntity: (entityId: string) => void;
  readonly removeLinkById: (linkId: string) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const computeAnchorWorldPos = (
  workspaceState: Signal<WorkspaceState>,
  entityId: string,
  edge: EdgePosition
): { x: number; y: number } => {
  const entity = workspaceState.value.entities.get(entityId);
  if (!entity) return { x: 0, y: 0 };
  const { x, y } = entity.position.value;
  const { width, height } = entity.dimensions.value;
  switch (edge) {
    case 'top':    return { x: x + width / 2, y };
    case 'bottom': return { x: x + width / 2, y: y + height };
    case 'left':   return { x,                y: y + height / 2 };
    case 'right':  return { x: x + width,     y: y + height / 2 };
  }
};

// ─── Label foreignObject helpers ─────────────────────────────────────────────

const LABEL_W = 120;
const LABEL_H = 28;

const createLinkLabelFO = (
  mid: { x: number; y: number },
  onSettings: () => void,
  onDelete: () => void
): SVGForeignObjectElement => {
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('width',  LABEL_W.toString());
  fo.setAttribute('height', LABEL_H.toString());
  fo.setAttribute('x', (mid.x - LABEL_W / 2).toString());
  fo.setAttribute('y', (mid.y - LABEL_H / 2).toString());
  fo.style.overflow = 'visible';
  fo.style.pointerEvents = 'all';

  const body = document.createElement('div');
  body.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  body.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:4px',
    'padding:3px 7px',
    'background:rgba(15,23,42,0.88)',
    'border:1px solid #334155',
    'border-radius:12px',
    'font-family:system-ui,sans-serif',
    'font-size:11px',
    'color:#94a3b8',
    'white-space:nowrap',
    'cursor:default',
    'user-select:none',
    'transition:border-color 0.15s',
  ].join(';');

  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Link';
  labelSpan.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:none;align-items:center;gap:3px;';

  const mkBtn = (title: string, content: string, color: string, cb: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = title;
    btn.innerHTML = content;
    btn.style.cssText = [
      'background:none',
      'border:none',
      'cursor:pointer',
      'padding:1px 2px',
      `color:${color}`,
      'display:flex',
      'align-items:center',
      'font-size:11px',
      'line-height:1',
      'border-radius:3px',
    ].join(';');
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => { e.stopPropagation(); cb(); });
    return btn;
  };

  const gearBtn   = mkBtn('Link settings', '⚙', '#64748b', onSettings);
  const deleteBtn = mkBtn('Delete link',   '✕', '#f87171', onDelete);

  actions.appendChild(gearBtn);
  actions.appendChild(deleteBtn);
  body.appendChild(labelSpan);
  body.appendChild(actions);
  fo.appendChild(body);

  fo.addEventListener('mouseenter', () => {
    actions.style.display = 'flex';
    body.style.borderColor = '#6366f1';
    body.style.color = '#cbd5e1';
  });
  fo.addEventListener('mouseleave', () => {
    actions.style.display = 'none';
    body.style.borderColor = '#334155';
    body.style.color = '#94a3b8';
  });

  return fo;
};

const moveLinkLabelFO = (
  fo: SVGForeignObjectElement,
  mid: { x: number; y: number }
): void => {
  fo.setAttribute('x', (mid.x - LABEL_W / 2).toString());
  fo.setAttribute('y', (mid.y - LABEL_H / 2).toString());
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createLinkFinalizer = function(
  linkManager: LinkManager,
  workspaceState: Signal<WorkspaceState>,
  contentRoot: SVGElement,
  onLinkCreated?: (link: { id: string; sourceAnchorId: string; targetAnchorId: string; leftEntityId: string; rightEntityId: string }) => void
): LinkFinalizer {
  const linkSubscriptions = new Map<string, Array<() => void>>();
  const linkEntityMap     = new Map<string, { srcEntityId: string; dstEntityId: string }>();
  const linkLabelFOs      = new Map<string, SVGForeignObjectElement>();

  const removeLinkById = (linkId: string): void => {
    const subs = linkSubscriptions.get(linkId);
    if (subs) { subs.forEach(fn => fn()); linkSubscriptions.delete(linkId); }
    const fo = linkLabelFOs.get(linkId);
    if (fo && fo.parentNode) fo.parentNode.removeChild(fo);
    linkLabelFOs.delete(linkId);
    linkEntityMap.delete(linkId);
    linkManager.removeLink(linkId);
  };

  const finalizeLinkToAnchor = (
    dstAnchorId: string,
    dstAnchorPos: { x: number; y: number },
    dstEntityId: string,
    dstEdge: EdgePosition,
    srcAnchorId: string,
    srcEntityId: string,
    srcEdge: EdgePosition,
    srcPos: { x: number; y: number },
    isRestoration = false
  ): void => {
    console.log('[LINK-FINALIZER] finalizeLinkToAnchor called:', {
      src: `${srcEntityId}:${srcAnchorId}`,
      dst: `${dstEntityId}:${dstAnchorId}`
    });
    
    const linkId = `link-${srcAnchorId}-${dstAnchorId}-${Date.now()}`;

    const permanentLink = linkManager.createLink({
      id: linkId,
      sourceAnchorId: srcAnchorId,
      targetAnchorId: dstAnchorId,
      sourcePosition: srcPos,
      targetPosition: dstAnchorPos,
      sourceEdge: srcEdge,
      targetEdge: dstEdge,
      strokeColor: '#3b82f6',
      strokeWidth: 2
    });

    contentRoot.appendChild(permanentLink.element);
    linkEntityMap.set(linkId, { srcEntityId, dstEntityId });

    // ── Label foreignObject ──────────────────────────────────────────────────
    const getCurSrc = () => computeAnchorWorldPos(workspaceState, srcEntityId, srcEdge);
    const getCurDst = () => computeAnchorWorldPos(workspaceState, dstEntityId, dstEdge);

    const fo = createLinkLabelFO(
      bezierMidpoint(srcPos, srcEdge, dstAnchorPos, dstEdge),
      () => { openLinkSettingsModal(linkId); },
      () => removeLinkById(linkId)
    );
    contentRoot.appendChild(fo);
    linkLabelFOs.set(linkId, fo);

    // ── Position subscriptions ───────────────────────────────────────────────
    const srcEntity = workspaceState.value.entities.get(srcEntityId);
    const dstEntity = workspaceState.value.entities.get(dstEntityId);
    if (srcEntity && dstEntity) {
      const recompute = () => {
        const s = getCurSrc();
        const d = getCurDst();
        permanentLink.updatePath(s, d, srcEdge, dstEdge);
        moveLinkLabelFO(fo, bezierMidpoint(s, srcEdge, d, dstEdge));
      };
      linkSubscriptions.set(linkId, [
        srcEntity.position.subscribe(recompute),
        srcEntity.dimensions.subscribe(recompute),
        dstEntity.position.subscribe(recompute),
        dstEntity.dimensions.subscribe(recompute),
      ]);
    }

    workspaceState.value.entities.get(srcEntityId)
      ?.notifyAnchorConnected?.(srcAnchorId, linkId);
    workspaceState.value.entities.get(dstEntityId)
      ?.notifyAnchorConnected?.(dstAnchorId, linkId);

    // Notify callback about link creation for persistence (only for new links, not restoration)
    if (!isRestoration && onLinkCreated) {
      console.log('[LINK-FINALIZER] ✓ Calling onLinkCreated callback for new link');
      onLinkCreated({
        id: linkId,
        sourceAnchorId: srcAnchorId,
        targetAnchorId: dstAnchorId,
        leftEntityId: srcEntityId,
        rightEntityId: dstEntityId
      });
    } else if (!isRestoration) {
      console.error('[LINK-FINALIZER] ✗ No onLinkCreated callback! Link will not be persisted!');
    } else {
      console.log('[LINK-FINALIZER] ℹ Restored link - skipping persistence callback');
    }
  };

  const removeLinksForEntity = (entityId: string): void => {
    const toRemove: string[] = [];
    linkEntityMap.forEach(({ srcEntityId, dstEntityId }, linkId) => {
      if (srcEntityId === entityId || dstEntityId === entityId) toRemove.push(linkId);
    });
    toRemove.forEach(removeLinkById);
  };

  return {
    finalizeLinkToAnchor,
    removeLinksForEntity,
    removeLinkById,
    cleanup: {
      destroy: () => {
        linkSubscriptions.forEach(subs => subs.forEach(fn => fn()));
        linkSubscriptions.clear();
        linkLabelFOs.forEach(fo => { if (fo.parentNode) fo.parentNode.removeChild(fo); });
        linkLabelFOs.clear();
        linkEntityMap.clear();
      }
    }
  };
};
