import type { Signal } from '@atomos-web/prime'
import type { EdgePosition } from '../features/edge/types/edge-position.types.js'
import { openLinkSettingsModal } from '../features/modal/create-link-settings-modal.js'
import { getCanvasAdapter } from './adapters/canvas-adapter.js'
import { getMidpoint } from './bezier.js'
import { registry } from './create-signal-registry.js'
import { validateTopologicalConnection } from './domain/validate-topological-connection.js'
import { GLOBAL_KEY } from './registry-keys.js'
import type { GlobalConfig } from './types/global-config.types.js'
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

const LABEL_W = 240;
const LABEL_H = 26;

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
    'display:flex',
    'align-items:center',
    'gap:4px',
    'padding:0 8px',
    'height:100%',
    'box-sizing:border-box',
    'background:rgba(15,23,42,0.88)',
    'border:1px solid var(--vbs-border, #27272a)',
    'border-radius: var(--vbs-radius, 2px)',
    'font-family:var(--vbs-entity-props-font-family, system-ui, sans-serif)',
    'font-size:var(--vbs-entity-props-font-size, 11px)',
    'color:var(--vbs-text-secondary, #a1a1aa)',
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
  fo.appendChild(body);

  fo.addEventListener('mouseenter', () => {
    actions.style.display = 'flex';
    body.style.borderColor = 'var(--vbs-primary, #3b82f6)';
    body.style.color = 'var(--vbs-text-primary, #f4f4f5)';
  });
  fo.addEventListener('mouseleave', () => {
    actions.style.display = 'none';
    body.style.borderColor = 'var(--vbs-border, #27272a)';
    body.style.color = 'var(--vbs-text-secondary, #a1a1aa)';
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
  onLinkCreated?: (link: { id: string; sourceAnchorId: string; targetAnchorId: string; leftEntityId: string; rightEntityId: string }, isReconnect?: boolean) => void,
  onLinkDeleted?: (linkId: string) => void
): LinkFinalizer {
  const linkSubscriptions = new Map<string, Array<() => void>>();
  const linkEntityMap     = new Map<string, { srcEntityId: string; dstEntityId: string }>();
  const linkLabelFOs      = new Map<string, SVGForeignObjectElement>();
  let isEntityCascadeDeletion = false;

  const updateLinkLabel = (linkId: string, fo: SVGForeignObjectElement) => {
    const adapter = getCanvasAdapter();
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

  const adapter = getCanvasAdapter();
  const unsubAdapter = adapter.onEntityChanged((e) => {
    if (e.type === 'LinkPropertiesUpdated' || e.type === 'LinkCreated' || e.type === 'EntityNameUpdated') {
      linkLabelFOs.forEach((fo, id) => updateLinkLabel(id, fo));
    }
  });

  const removeLinkById = (linkId: string, skipPersistence?: boolean): void => {
    console.log(`[LINK-FINALIZER] 🗑️ removeLinkById(${linkId}) - starting cleanup`);
    
    // Clean up subscriptions
    const subs = linkSubscriptions.get(linkId);
    if (subs) { 
      console.log(`[LINK-FINALIZER] Cleaning up ${subs.length} subscriptions for ${linkId}`);
      subs.forEach(fn => fn()); 
      linkSubscriptions.delete(linkId); 
    }
    
    // Clean up label foreign object
    const fo = linkLabelFOs.get(linkId);
    if (fo && fo.parentNode) {
      console.log(`[LINK-FINALIZER] Removing label FO for ${linkId}`);
      fo.parentNode.removeChild(fo);
    }
    linkLabelFOs.delete(linkId);
    
    // Clean up entity mapping
    linkEntityMap.delete(linkId);
    
    // Clean up the visual link element via link manager
    console.log(`[LINK-FINALIZER] Calling linkManager.removeLink(${linkId})`);
    linkManager.removeLink(linkId);
    
    // Double-check: manually remove any remaining visual elements with this ID
    const remainingElements = contentRoot.querySelectorAll(`[id="${linkId}"]`);
    if (remainingElements.length > 0) {
      console.warn(`[LINK-FINALIZER] ⚠️ Found ${remainingElements.length} orphaned visual elements for ${linkId}, manually removing`);
      remainingElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }
    
    // Only notify Redux store about individual link deletions, not during entity cascade
    if (!isEntityCascadeDeletion && onLinkDeleted && !skipPersistence) {
      console.log('[LINK-FINALIZER] ✓ Calling onLinkDeleted callback for individual deletion:', linkId);
      onLinkDeleted(linkId);
    } else if (skipPersistence) {
      console.log('[LINK-FINALIZER] ℹ️ Skipping onLinkDeleted callback due to skipPersistence (likely reconnect mode)');
    } else if (isEntityCascadeDeletion) {
      console.log('[LINK-FINALIZER] ℹ Skipping onLinkDeleted callback during entity cascade deletion');
    }
    
    console.log(`[LINK-FINALIZER] ✓ removeLinkById(${linkId}) - cleanup completed`);
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
    console.log('[LINK-FINALIZER] finalizeLinkToAnchor called:', {
      src: `${srcEntityId}:${srcAnchorId}`,
      dst: `${dstEntityId}:${dstAnchorId}`
    });

    if (!isRestoration) {
      const globalConfigSig = registry.get<GlobalConfig>(GLOBAL_KEY);
      const topologyRules = globalConfigSig?.value.topology;
      
      const adapter = getCanvasAdapter();
      const srcEntity = adapter.getEntity(srcEntityId);
      const dstEntity = adapter.getEntity(dstEntityId);
      
      if (srcEntity && dstEntity) {
        // Collect links domain properties safely 
        const allLinks = (adapter.getAllLinks?.() || []) as any[];
        const validation = validateTopologicalConnection(
          srcEntity, 
          dstEntity, 
          allLinks, 
          topologyRules
        );
        
        if (!validation.isValid) {
          console.warn('[LINK-FINALIZER] Topological connection rejected:', validation.reason);
          // TODO: Provide visual user feedback (toast or validation badge)
          return;
        }
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

    contentRoot.appendChild(permanentLink.element);
    linkEntityMap.set(linkId, { srcEntityId, dstEntityId });

    // ── Label foreignObject ──────────────────────────────────────────────────
    const getCurSrc = () => computeAnchorWorldPos(workspaceState, srcEntityId, srcEdge);
    const getCurDst = () => computeAnchorWorldPos(workspaceState, dstEntityId, dstEdge);

    const fo = createLinkLabelFO(
      getMidpoint(initialRenderType, srcPos, srcEdge, dstAnchorPos, dstEdge),
      () => { openLinkSettingsModal(linkId); },
      () => removeLinkById(linkId)
    );
    contentRoot.appendChild(fo);
    linkLabelFOs.set(linkId, fo);
    
    // Defer the initial label update slightly so any Redux state has a chance to be synced
    setTimeout(() => {
      updateLinkLabel(linkId, fo);
    }, 0);

    // ── Position subscriptions ───────────────────────────────────────────────
    const srcEntity = workspaceState.value.entities.get(srcEntityId);
    const dstEntity = workspaceState.value.entities.get(dstEntityId);
    if (srcEntity && dstEntity) {
      const recompute = () => {
        const s = getCurSrc();
        const d = getCurDst();
        const currentLink = adapter.getLink(linkId);
        const currentRenderType: any = currentLink?.renderType || 'bezier';
        const srcRect = { ...srcEntity.position.value, ...srcEntity.dimensions.value };
        const dstRect = { ...dstEntity.position.value, ...dstEntity.dimensions.value };
        
        permanentLink.updatePath(s, d, srcEdge, dstEdge, currentRenderType, srcRect, dstRect);
        
        const valid = currentLink?.isValid ?? true;
        permanentLink.setValidity(valid);
        
        moveLinkLabelFO(fo, getMidpoint(currentRenderType, s, srcEdge, d, dstEdge, srcRect, dstRect));
      };
      linkSubscriptions.set(linkId, [
        srcEntity.position.subscribe(recompute),
        srcEntity.dimensions.subscribe(recompute),
        dstEntity.position.subscribe(recompute),
        dstEntity.dimensions.subscribe(recompute),
      ]);
      
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
      console.log('[LINK-FINALIZER] ✓ Calling onLinkCreated callback for new link. isReconnect:', !!optionalLinkId);
      onLinkCreated({
        id: linkId,
        sourceAnchorId: srcAnchorId,
        targetAnchorId: dstAnchorId,
        leftEntityId: srcEntityId,
        rightEntityId: dstEntityId
      }, !!optionalLinkId);
    } else if (!isRestoration) {
      console.error('[LINK-FINALIZER] ✗ No onLinkCreated callback! Link will not be persisted!');
    } else {
      console.log('[LINK-FINALIZER] ℹ Restored link - skipping persistence callback');
    }
  };

  const removeLinksForEntity = (entityId: string): void => {
    console.log(`[LINK-FINALIZER] 🔍 Removing all links for entity: ${entityId}`);
    console.log(`[LINK-FINALIZER] Current linkEntityMap contents:`, Array.from(linkEntityMap.entries()));
    console.log(`[LINK-FINALIZER] Current linkSubscriptions:`, Array.from(linkSubscriptions.keys()));
    console.log(`[LINK-FINALIZER] Current linkLabelFOs:`, Array.from(linkLabelFOs.keys()));
    
    isEntityCascadeDeletion = true;
    const toRemove: string[] = [];
    linkEntityMap.forEach(({ srcEntityId, dstEntityId }, linkId) => {
      if (srcEntityId === entityId || dstEntityId === entityId) {
        console.log(`[LINK-FINALIZER] ✓ Found connected link to remove: ${linkId} (${srcEntityId} → ${dstEntityId})`);
        toRemove.push(linkId);
      }
    });
    
    console.log(`[LINK-FINALIZER] Found ${toRemove.length} links to remove:`, toRemove);
    
    // Also check if there are any visual elements that might not be tracked
    const allSVGLinks = contentRoot.querySelectorAll('path[id^="link-"], g[id^="link-"]');
    console.log(`[LINK-FINALIZER] 🔍 Found ${allSVGLinks.length} visual link elements in DOM:`, 
      Array.from(allSVGLinks).map(el => el.id));
    
    toRemove.forEach(linkId => {
      console.log(`[LINK-FINALIZER] 🗑️ Removing link: ${linkId}`);
      removeLinkById(linkId);
    });
    
    // Double-check for orphaned visual elements
    const remainingLinks = contentRoot.querySelectorAll('path[id^="link-"], g[id^="link-"]');
    if (remainingLinks.length > 0) {
      console.warn(`[LINK-FINALIZER] ⚠️ ${remainingLinks.length} visual link elements remain after cleanup:`, 
        Array.from(remainingLinks).map(el => el.id));
    }
    
    isEntityCascadeDeletion = false;
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
