import { createSignal } from '@atomos-web/prime'
import { createEntityRegistry } from '../core/create-entity-registry.js'
import { createLinkManager } from '../core/link-manager.js'
import type { DAGExport } from '../core/application/dag-service.js'
import type { EdgePosition } from '../features/edge/types/edge-position.types.js'
import { computeShapeAnchorPos } from '../canvas/geometry/compute-shape-anchor-pos.js'
import { createViewerEntity } from './create-viewer-entity.js'

export const createStructuraViewer = function(svgContainer: SVGSVGElement, contentRoot: SVGElement = svgContainer) {
  const registry = createEntityRegistry(contentRoot);
  const linkManager = createLinkManager();
  
  const computeAnchorPos = (entity: any, edge: string): { x: number; y: number } => {
    const { x, y } = entity.position.value;
    const { width, height } = entity.dimensions.value;
    switch (edge) {
      case 'top':    return { x: x + width / 2, y };
      case 'bottom': return { x: x + width / 2, y: y + height };
      case 'left':   return { x,                y: y + height / 2 };
      case 'right':  return { x: x + width,     y: y + height / 2 };
      default:       return { x, y };
    }
  };

  const loadSchema = (dag: DAGExport) => {
    // Clear existing
    linkManager.cleanup.destroy();
    registry.workspaceState.value.entities.forEach(e => registry.unregisterEntity(e.id));

    // Restore Entities
    dag.nodes.forEach(node => {
      const entity = createViewerEntity({
        id: node.id,
        shape: (node as any).shape,
        color: (node as any).color,
        position: node.position,
        dimensions: node.dimensions,
        properties: node.properties as any[],
        workspace: null // Viewer doesn't need full workspace manager
      });
      registry.registerEntity(entity);
    });

    // Restore Links
    dag.edges.forEach(edge => {
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
          renderType: 'bezier'
        });

        contentRoot.appendChild(permanentLink.element);
        
        // Setup Reactivity for Links
        const recompute = () => {
          const s = computeAnchorPos(srcEntity, srcEdge);
          const d = computeAnchorPos(dstEntity, dstEdge);
          const srcRect = { ...srcEntity.position.value, ...srcEntity.dimensions.value };
          const dstRect = { ...dstEntity.position.value, ...dstEntity.dimensions.value };
          permanentLink.updatePath(s, d, srcEdge, dstEdge, 'bezier', srcRect, dstRect);
        };

        srcEntity.position.subscribe(recompute);
        srcEntity.dimensions.subscribe(recompute);
        dstEntity.position.subscribe(recompute);
        dstEntity.dimensions.subscribe(recompute);
        
        // Initial path computation
        recompute();
      }
    });
  };

  const patchEntity = (entityId: string, updates: any) => {
    const entity = registry.workspaceState.value.entities.get(entityId);
    if (!entity) return;
    
    if (updates.position) entity.position.set(updates.position);
    if (updates.dimensions) entity.dimensions.set(updates.dimensions);
    if (updates.metadata) {
      if (entity.updateMetadata) entity.updateMetadata(updates.metadata);
    }
  };

  return {
    registry,
    linkManager,
    loadSchema,
    patchEntity,
    cleanup: () => {
      linkManager.cleanup.destroy();
      registry.workspaceState.value.entities.forEach(e => e.cleanup());
    }
  };
};
