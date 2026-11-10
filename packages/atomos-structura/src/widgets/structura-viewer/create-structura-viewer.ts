import { createEntityRegistry } from '../../shared/core/create-entity-registry.js'
import { createLinkManager } from '../../shared/core/link-manager.js'
import type { DAGExchange } from '../../shared/core/application/dag-service.js'
import type { DomainEntity, DomainLink } from '../../shared/core/domain/entity-aggregate.js'
import type { EdgePosition } from '../../features/edge/types/edge-position.types.js'
import type { EntityInstance } from '../../shared/core/types/entity-instance.types.js'
import { sideAnchorPosition } from '../../shared/workflow-node/model/resolve-anchor-position.js'
import { createViewerEntity } from './create-viewer-entity.js'
import { processViewerAutoLayout } from './lib/viewer-auto-layout.js'
import { patchViewerEntity, type ViewerEntityPatch } from './lib/patch-viewer-entity.js'

export const createStructuraViewer = function(
  svgContainer: SVGSVGElement,
  contentRoot: SVGElement = svgContainer,
  onLayoutReady?: (tx: number, ty: number, scale: number) => void,
  onEntityClick?: (entityId: string, nodeData: DomainEntity) => void
) {
  const registry = createEntityRegistry(contentRoot);
  const linkManager = createLinkManager();

  const computeAnchorPos = (entity: EntityInstance, edge: EdgePosition): { x: number; y: number } =>
    sideAnchorPosition({ ...entity.position.value, ...entity.dimensions.value }, edge);

  const processAutoLayout = (nodes: DomainEntity[], edges: DomainLink[]): void => processViewerAutoLayout(nodes, edges);

  const loadSchema = (dag: DAGExchange) => {
    if (!dag) return;
    // Clear existing
    linkManager.cleanup.destroy();
    registry.workspaceState.value.entities.forEach(e => registry.unregisterEntity(e.id));

    // Clone the dag arrays to avoid mutating the original export if it's reused
    const clonedNodes = JSON.parse(JSON.stringify(dag.nodes || [])) as DomainEntity[];
    const clonedEdges = JSON.parse(JSON.stringify(dag.edges || [])) as DomainLink[];

    // Hide content to prevent FOUC (Flash of Unstyled Content) during measurement and layout
    contentRoot.style.opacity = '0';

    // Restore Entities
    clonedNodes.forEach(node => {
      const entity = createViewerEntity({
        id: node.id,
        name: node.name,
        shape: (node as any).shape,
        color: (node as any).color,
        position: node.position,
        dimensions: node.dimensions,
        properties: node.properties as any[],
        execution: (node as any).execution,
        workspace: null // Viewer doesn't need full workspace manager
      });

      if (onEntityClick) {
        entity.element.style.cursor = 'pointer';
        entity.element.addEventListener('click', (e) => {
          e.stopPropagation();
          onEntityClick(node.id, node);
        });
      }

      registry.registerEntity(entity);
    });

    // We need to wait for the DOM to render the new entities so they can measure their height
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Now dimensions have been updated via onHeightChange
        
        // Build an array of "real nodes" to feed into layout algorithm
        const realNodes = clonedNodes.map(node => {
          const e = registry.workspaceState.value.entities.get(node.id);
          return {
            id: node.id,
            position: e ? e.position.value : node.position,
            dimensions: e ? e.dimensions.value : node.dimensions
          } as DomainEntity;
        });

        // Run Layout using TRUE dimensions only if requested or if positions are not provided
        if ((dag as any).config?.autoLayout !== false) {
          processAutoLayout(realNodes, clonedEdges);
        }

        // Apply calculated positions back to live entities
        realNodes.forEach(rn => {
          const e = registry.workspaceState.value.entities.get(rn.id);
          if (e) {
            e.position.set(rn.position);
          }
        });

        // Restore Links
        clonedEdges.forEach(edge => {
          const srcEntity = registry.workspaceState.value.entities.get(edge.sourceEntityId);
          const dstEntity = registry.workspaceState.value.entities.get(edge.targetEntityId);
          
          if (srcEntity && dstEntity) {
            const srcEdge = (edge.sourceAnchorId.split('-anchor-')[1] || 'right') as EdgePosition;
            const dstEdge = (edge.targetAnchorId.split('-anchor-')[1] || 'left') as EdgePosition;
            
            const srcPos = computeAnchorPos(srcEntity, srcEdge);
            const dstPos = computeAnchorPos(dstEntity, dstEdge);

            const permanentLink = linkManager.createLink({
              id: edge.id,
              sourceAnchorId: edge.sourceAnchorId,
              targetAnchorId: edge.targetAnchorId,
              sourcePosition: srcPos,
              targetPosition: dstPos,
              sourceEdge: srcEdge,
              targetEdge: dstEdge,
              strokeColor: '#3b82f6',
              strokeWidth: 2,
              renderType: 'bezier',
              direction: (edge as any).direction || 'default'
            });

            contentRoot.prepend(permanentLink.element);
            
            // Setup Reactivity for Links
            const recompute = () => {
              const s = computeAnchorPos(srcEntity, srcEdge);
              const d = computeAnchorPos(dstEntity, dstEdge);
              const srcRect = { ...srcEntity.position.value, ...srcEntity.dimensions.value };
              const dstRect = { ...dstEntity.position.value, ...dstEntity.dimensions.value };
              const obstacles = clonedNodes
                .filter(n => n.id !== edge.sourceEntityId && n.id !== edge.targetEntityId)
                .map(n => {
                  const ent = registry.workspaceState.value.entities.get(n.id);
                  if (ent) {
                    return { ...ent.position.value, ...ent.dimensions.value };
                  }
                  return {
                    x: n.position?.x ?? 0,
                    y: n.position?.y ?? 0,
                    width: n.dimensions?.width ?? 180,
                    height: n.dimensions?.height ?? 80
                  };
                });
              permanentLink.updatePath(s, d, srcEdge, dstEdge, 'bezier', srcRect, dstRect, (edge as any).direction || 'default', obstacles);
            };

            srcEntity.position.subscribe(recompute);
            srcEntity.dimensions.subscribe(recompute);
            dstEntity.position.subscribe(recompute);
            dstEntity.dimensions.subscribe(recompute);
            
            // Initial path computation
            recompute();
          }
        });

        // Center and Fit to screen
        if (onLayoutReady && realNodes.length > 0) {
          fitToScreen();
        }

        // Reveal content
        contentRoot.style.transition = 'opacity 0.2s ease-in-out';
        contentRoot.style.opacity = '1';
      });
    });
  };

  /** Incremental update of one node (geometry, metadata, execution, overlay NodeState). */
  const patchEntity = (entityId: string, updates: ViewerEntityPatch) => {
    const entity = registry.workspaceState.value.entities.get(entityId);
    if (entity) patchViewerEntity(entity, updates);
  };

  const patchLink = (linkId: string, updates: any) => {
    const link = linkManager.getLink(linkId);
    if (!link) return;
    
    if (updates.execution && (link as any).setExecutionState) {
      (link as any).setExecutionState(updates.execution);
    }
  };

  const fitToScreen = () => {
    const realNodes = Array.from(registry.workspaceState.value.entities.values()).map(e => ({
      position: e.position.value,
      dimensions: e.dimensions.value
    }));
    
    if (!onLayoutReady || realNodes.length === 0) return;
    
    // Calculate Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    realNodes.forEach(n => {
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.x + n.dimensions.width > maxX) maxX = n.position.x + n.dimensions.width;
      if (n.position.y + n.dimensions.height > maxY) maxY = n.position.y + n.dimensions.height;
    });

    const schemaWidth = maxX - minX;
    const schemaHeight = maxY - minY;
    const PADDING = 60;
    
    const containerRect = svgContainer.getBoundingClientRect();
    const viewportWidth = containerRect.width || window.innerWidth;
    const viewportHeight = containerRect.height || window.innerHeight;

    // Fit to screen (compute scale)
    const scaleX = (viewportWidth - PADDING * 2) / Math.max(schemaWidth, 1);
    const scaleY = (viewportHeight - PADDING * 2) / Math.max(schemaHeight, 1);
    const targetScale = Math.min(scaleX, scaleY, 1); // Cap zoom at 1x

    // Center to schema (compute translation)
    const schemaCenterX = minX + schemaWidth / 2;
    const schemaCenterY = minY + schemaHeight / 2;

    const targetTx = (viewportWidth / 2) - (schemaCenterX * targetScale);
    const targetTy = (viewportHeight / 2) - (schemaCenterY * targetScale);

    onLayoutReady(targetTx, targetTy, targetScale);
  };

  return {
    registry,
    linkManager,
    loadSchema,
    patchEntity,
    patchLink,
    fitToScreen,
    cleanup: () => {
      linkManager.cleanup.destroy();
      registry.workspaceState.value.entities.forEach(e => e.cleanup());
    }
  };
};
