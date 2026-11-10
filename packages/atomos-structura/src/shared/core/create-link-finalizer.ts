import type { Signal } from '@atomos-web/prime'
import type { EdgePosition } from '../../features/edge/types/edge-position.types.js'
import { openLinkSettingsModal } from '../../features/modal/create-link-settings-modal.js'
import { getCanvasAdapter } from './adapters/canvas-adapter.js'
import { getMidpoint } from './bezier.js'
import type { PortSpec } from '@atomos-web/structura-core'
import { gateConnection } from '../workflow-canvas/connection-gate.js'
import { resolveAnchorPosition } from '../workflow-node/model/resolve-anchor-position.js'
import type { LinkManager } from './types/link-manager.types.js'
import type { WorkspaceState } from './types/workspace-state.types.js'

export interface LinkFinalizer {
  readonly finalizeLinkToAnchor: (
    dstAnchorId: string,
    dstAnchorPos: { x: number; y: number },
    dstEntityId: string,
    dstEdge: EdgePosition,
    srcAnchorId: string,
    srcEntityId: string,
    srcEdge: EdgePosition,
    srcPos: { x: number; y: number },
    isRestoration?: boolean,
    linkId?: string
  ) => void;
  readonly removeLinksForEntity: (entityId: string) => void;
  readonly removeLinkById: (linkId: string, skipPersistence?: boolean) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const computeAnchorWorldPos = (
  workspaceState: Signal<WorkspaceState>,
  entityId: string,
  edge: EdgePosition,
  anchorId?: string,
  ports?: readonly PortSpec[]
): { x: number; y: number } => {
  const entity = workspaceState.value.entities.get(entityId);
  if (!entity) return { x: 0, y: 0 };
  // Typed port anchors resolve to the port handle; ER side anchors to the side midpoint.
  return resolveAnchorPosition({ ...entity.position.value, ...entity.dimensions.value }, edge, anchorId, ports);
};

// ─── Label foreignObject helpers ─────────────────────────────────────────────

const LABEL_W = 240;
const LABEL_H = 26;
const KNOB_SIZE = 12;

const createLinkLabelFO = (
  mid: { x: number; y: number },
  onSettings: () => void,
  onDelete: () => void
): SVGForeignObjectElement => {
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  // We set the FO size to the full label size, but offset it so the knob is centered
  fo.setAttribute('width',  LABEL_W.toString());
  fo.setAttribute('height', LABEL_H.toString());
  fo.setAttribute('x', (mid.x - LABEL_W / 2).toString());
  fo.setAttribute('y', (mid.y - LABEL_H / 2).toString());
  fo.style.overflow = 'visible';
  fo.style.pointerEvents = 'none'; // Only the inner container should capture pointer events

  const container = document.createElement('div');
  container.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  container.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:100%',
    'height:100%',
    'pointer-events:none',
  ].join(';');

  const body = document.createElement('div');
  body.classList.add('vbs-link-label-body');
  body.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:4px',
    'padding:0',
    `width:${KNOB_SIZE}px`,
    `height:${KNOB_SIZE}px`,
    'box-sizing:border-box',
    'background:var(--vbs-primary, #3b82f6)',
    'border:2px solid rgba(15,23,42,0.88)',
    'border-radius:12px',
    'font-family:var(--vbs-entity-props-font-family, system-ui, sans-serif)',
    'font-size:var(--vbs-entity-props-font-size, 11px)',
    'color:var(--vbs-text-secondary, #a1a1aa)',
    'white-space:nowrap',
    'cursor:pointer',
    'user-select:none',
    'transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    'pointer-events:all',
    'overflow:hidden',
  ].join(';');

  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Link';
  labelSpan.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:none;padding-left:8px;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:none;align-items:center;gap:3px;padding-right:4px;';

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
      'border-radius: var(--vbs-radius, 2px)',
    ].join(';');
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => { e.stopPropagation(); cb(); });
    return btn;
  };

  const gearBtn   = mkBtn('Link settings', '⚙', '#64748b', onSettings);
  const deleteBtn = mkBtn('Delete link',   '✕', 'var(--vbs-danger, #ef4444)', onDelete);

  actions.appendChild(gearBtn);
  actions.appendChild(deleteBtn);
  body.appendChild(labelSpan);
  body.appendChild(actions);
  container.appendChild(body);
  fo.appendChild(container);

  let hoverTimeout: any;

  body.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
    body.style.width = 'auto';
    body.style.minWidth = '80px';
    body.style.maxWidth = '100%';
    body.style.height = '100%';
    body.style.borderRadius = 'var(--vbs-radius, 4px)';
    body.style.background = 'rgba(15,23,42,0.95)';
    body.style.border = '1px solid var(--vbs-primary, #3b82f6)';
    body.style.color = 'var(--vbs-text-primary, #f4f4f5)';
    labelSpan.style.display = 'block';
    actions.style.display = 'flex';
  });

  body.addEventListener('mouseleave', () => {
    hoverTimeout = setTimeout(() => {
      body.style.width = `${KNOB_SIZE}px`;
      body.style.minWidth = `${KNOB_SIZE}px`;
      body.style.height = `${KNOB_SIZE}px`;
      body.style.borderRadius = '12px';
      body.style.background = 'var(--vbs-primary, #3b82f6)';
      body.style.border = '2px solid rgba(15,23,42,0.88)';
      labelSpan.style.display = 'none';
      actions.style.display = 'none';
    }, 100);
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
  instanceId: string,
  onLinkCreated?: (link: { id: string; sourceAnchorId: string; targetAnchorId: string; leftEntityId: string; rightEntityId: string }, isReconnect?: boolean) => void,
  onLinkDeleted?: (linkId: string) => void
): LinkFinalizer {
  const linkSubscriptions = new Map<string, Array<() => void>>();
  const linkEntityMap     = new Map<string, { srcEntityId: string; dstEntityId: string }>();
  const linkLabelFOs      = new Map<string, SVGForeignObjectElement>();
  let isEntityCascadeDeletion = false;

  const updateLinkLabel = (linkId: string, fo: SVGForeignObjectElement) => {
    const adapter = getCanvasAdapter(instanceId);
    const link = adapter.getLink(linkId);
    const span = fo.querySelector('span');
    if (span && link) {
      const src = adapter.getEntity(link.sourceEntityId);
      const dst = adapter.getEntity(link.targetEntityId);
      const srcName = src?.name || 'Entity';
      const dstName = dst?.name || 'Entity';
      const leftCard = link.sourceCardinality || '1';
      const rightCard = link.targetCardinality || 'n';
      
      span.textContent = `${srcName} (${leftCard}) <=> (${rightCard}) ${dstName}`;
    }
  };

  const adapter = getCanvasAdapter(instanceId);
  const unsubAdapter = adapter.onEntityChanged((e) => {
    if (e.type === 'LinkPropertiesUpdated' || e.type === 'LinkCreated' || e.type === 'EntityNameUpdated') {
      linkLabelFOs.forEach((fo, id) => updateLinkLabel(id, fo));
    }
  });

  const removeLinkById = (linkId: string, skipPersistence?: boolean): void => {
    linkSubscriptions.get(linkId)?.forEach(fn => fn());
    linkSubscriptions.delete(linkId);
    linkLabelFOs.get(linkId)?.remove();
    linkLabelFOs.delete(linkId);
    linkEntityMap.delete(linkId);
    linkManager.removeLink(linkId);
    // Remove any visual element still carrying this link id (exact or prefixed).
    contentRoot.querySelectorAll(`[id="${linkId}"], path[id^="${linkId}"], g[id^="${linkId}"]`).forEach(el => el.remove());
    // Only individual deletions reach the store: entity cascades and reconnects skip persistence.
    if (!isEntityCascadeDeletion && onLinkDeleted && !skipPersistence) onLinkDeleted(linkId);
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
    isRestoration = false,
    optionalLinkId?: string
  ): void => {
    // Validate BEFORE creating anything. Rejections emit `connection:rejected` on the canvas bus.
    if (!isRestoration) {
      const verdict = gateConnection(
        instanceId,
        { entityId: srcEntityId, anchorId: srcAnchorId },
        { entityId: dstEntityId, anchorId: dstAnchorId },
        optionalLinkId
      );
      if (!verdict.ok) {
        if (optionalLinkId) onLinkDeleted?.(optionalLinkId);
        return;
      }
    }

    const linkId = optionalLinkId || `link-${srcAnchorId}-${dstAnchorId}-${Date.now()}`;
    const initialRenderType: any = adapter.getLink(linkId)?.renderType || 'bezier';

    const permanentLink = linkManager.createLink({
      id: linkId,
      sourceAnchorId: srcAnchorId,
      targetAnchorId: dstAnchorId,
      sourcePosition: srcPos,
      targetPosition: dstAnchorPos,
      sourceEdge: srcEdge,
      targetEdge: dstEdge,
      strokeColor: '#3b82f6',
      strokeWidth: 2,
      renderType: initialRenderType
    });

    permanentLink.element.id = linkId;
    permanentLink.element.classList.add('vbs-link');
    contentRoot.appendChild(permanentLink.element);
    linkEntityMap.set(linkId, { srcEntityId, dstEntityId });

    const getCurSrc = () => computeAnchorWorldPos(workspaceState, srcEntityId, srcEdge, srcAnchorId, adapter.getEntity(srcEntityId)?.ports);
    const getCurDst = () => computeAnchorWorldPos(workspaceState, dstEntityId, dstEdge, dstAnchorId, adapter.getEntity(dstEntityId)?.ports);

    const srcEntity = workspaceState.value.entities.get(srcEntityId);
    const dstEntity = workspaceState.value.entities.get(dstEntityId);
    const srcRect = srcEntity ? { ...srcEntity.position.value, ...srcEntity.dimensions.value } : undefined;
    const dstRect = dstEntity ? { ...dstEntity.position.value, ...dstEntity.dimensions.value } : undefined;

    const fo = createLinkLabelFO(
      getMidpoint(initialRenderType, srcPos, srcEdge, dstAnchorPos, dstEdge, srcRect, dstRect),
      () => { openLinkSettingsModal(instanceId, linkId); },
      () => removeLinkById(linkId)
    );
    fo.setAttribute('data-link-label-for', linkId); contentRoot.appendChild(fo);
    linkLabelFOs.set(linkId, fo);
    
    // Defer the initial label update slightly so any Redux state has a chance to be synced
    setTimeout(() => {
      updateLinkLabel(linkId, fo);
    }, 0);

    // ── Position subscriptions ───────────────────────────────────────────────
    if (srcEntity && dstEntity) {
      const recompute = () => {
        const s = getCurSrc();
        const d = getCurDst();
        const currentLink = adapter.getLink(linkId);
        const currentRenderType: any = currentLink?.renderType || 'bezier';
        const currentDirection: any = currentLink?.direction || 'default';
        const srcRect = { ...srcEntity.position.value, ...srcEntity.dimensions.value };
        const dstRect = { ...dstEntity.position.value, ...dstEntity.dimensions.value };
        
        const isReadonly = contentRoot.closest('.vbs-readonly-mode') !== null;
        void isReadonly; // retained for future use
        // Always collect obstacles so edge routing avoids intermediate entities
        // in both edit and readonly modes.
        const obstacles = adapter.getAllEntities().map(e => ({
          x: e.position.x,
          y: e.position.y,
          width: e.dimensions.width,
          height: e.dimensions.height
        }));

        permanentLink.updatePath(s, d, srcEdge, dstEdge, currentRenderType, srcRect, dstRect, currentDirection, obstacles);
        
        const valid = currentLink?.isValid ?? true;
        permanentLink.setValidity(valid);
        
        moveLinkLabelFO(fo, getMidpoint(currentRenderType, s, srcEdge, d, dstEdge, srcRect, dstRect, obstacles));
      };
      linkSubscriptions.set(linkId, [
        srcEntity.position?.subscribe?.(recompute),
        srcEntity.dimensions?.subscribe?.(recompute),
        dstEntity.position?.subscribe?.(recompute),
        dstEntity.dimensions?.subscribe?.(recompute),
      ].filter(Boolean) as Array<() => void>);
      
      // Perform initial computation
      recompute();
      
      // Hook into adapter to update if renderType changes
      linkSubscriptions.get(linkId)?.push(
        adapter.onEntityChanged((e) => {
          if (e.type === 'LinkPropertiesUpdated' && e.linkId === linkId) {
            recompute();
          }
        })
      );
    }

    workspaceState.value.entities.get(srcEntityId)
      ?.notifyAnchorConnected?.(srcAnchorId, linkId);
    workspaceState.value.entities.get(dstEntityId)
      ?.notifyAnchorConnected?.(dstAnchorId, linkId);

    // Notify callback about link creation for persistence (only for new links, not restoration)
    if (!isRestoration && onLinkCreated) {
      onLinkCreated({
        id: linkId,
        sourceAnchorId: srcAnchorId,
        targetAnchorId: dstAnchorId,
        leftEntityId: srcEntityId,
        rightEntityId: dstEntityId
      }, !!optionalLinkId);
    } else if (!isRestoration) {
      console.error('[Structura] Link created without an onLinkCreated callback; it will not be persisted.');
    }
  };

  const removeLinksForEntity = (entityId: string): void => {
    isEntityCascadeDeletion = true;
    const toRemove: string[] = [];
    linkEntityMap.forEach(({ srcEntityId, dstEntityId }, linkId) => {
      if (srcEntityId === entityId || dstEntityId === entityId) toRemove.push(linkId);
    });
    try {
      toRemove.forEach(linkId => removeLinkById(linkId));
    } finally {
      isEntityCascadeDeletion = false;
    }
  };

  return {
    finalizeLinkToAnchor,
    removeLinksForEntity,
    removeLinkById,
    cleanup: {
      destroy: () => {
        unsubAdapter();
        linkSubscriptions.forEach(subs => subs.forEach(fn => fn()));
        linkSubscriptions.clear();
        linkLabelFOs.forEach(fo => { if (fo.parentNode) fo.parentNode.removeChild(fo); });
        linkLabelFOs.clear();
        linkEntityMap.clear();
      }
    }
  };
};
