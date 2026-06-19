import { createSignal } from '@atomos-web/prime'
import { createEntityRegistry } from '../core/create-entity-registry.js'
import { createLinkManager } from '../core/link-manager.js'
import type { DAGExport } from '../core/application/dag-service.js'
import type { DomainEntity, DomainLink } from '../core/domain/entity-aggregate.js'
import type { EdgePosition } from '../features/edge/types/edge-position.types.js'
import { computeShapeAnchorPos } from '../canvas/geometry/compute-shape-anchor-pos.js'
import { determineOptimalEdges } from '../core/math/anchor-routing.js'
import { createViewerEntity } from './create-viewer-entity.js'

export const createStructuraViewer = function(
  svgContainer: SVGSVGElement, 
  contentRoot: SVGElement = svgContainer,
  onLayoutReady?: (tx: number, ty: number, scale: number) => void
) {
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

  const processAutoLayout = (nodes: DomainEntity[], edges: DomainLink[]) => {
    // AutoLayout
    const inDegree = new Map<string, number>();
    const childrenList = new Map<string, string[]>();
    nodes.forEach(n => { inDegree.set(n.id, 0); childrenList.set(n.id, []); });
    edges.forEach(e => {
      inDegree.set(e.targetEntityId, (inDegree.get(e.targetEntityId) || 0) + 1);
      childrenList.get(e.sourceEntityId)?.push(e.targetEntityId);
    });

    const levels: string[][] = [];
    let currentLevel = Array.from(inDegree.entries()).filter(([, deg]) => deg === 0).map(([id]) => id);
    const processed = new Set<string>();

    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      currentLevel.forEach(id => processed.add(id));
      const nextLevel: string[] = [];
      currentLevel.forEach(id => {
        (childrenList.get(id) || []).forEach(child => {
          const currentDeg = inDegree.get(child)! - 1;
          inDegree.set(child, currentDeg);
          if (currentDeg === 0 && !processed.has(child)) nextLevel.push(child);
        });
      });
      currentLevel = nextLevel;
    }

    const cyclics = nodes.filter(n => !processed.has(n.id)).map(n => n.id);
    if (cyclics.length > 0) levels.push(cyclics);

    const HORIZONTAL_SPACING = 350;
    const VERTICAL_SPACING = 250;
    const START_X = 100;
    const START_Y = 100;

    const nodeMap = new Map<string, DomainEntity>(nodes.map(n => [n.id, n]));

    levels.forEach((levelNodes, levelIndex) => {
      const x = START_X + (levelIndex * HORIZONTAL_SPACING);
      const stagger = (levelIndex % 2) * (VERTICAL_SPACING / 2);
      const totalHeight = levelNodes.length * VERTICAL_SPACING;
      const startY = Math.max(START_Y, (1000 - totalHeight) / 2) + stagger;

      levelNodes.forEach((nodeId, nodeIndex) => {
        const y = startY + (nodeIndex * VERTICAL_SPACING);
        const node = nodeMap.get(nodeId);
        if (node) {
          (node as any).position = { x, y };
        }
      });
    });

    // Optimize Connections
    edges.forEach(link => {
      const src = nodeMap.get(link.sourceEntityId);
      const dst = nodeMap.get(link.targetEntityId);
      if (!src || !dst) return;
      
      const srcRect = { x: src.position.x, y: src.position.y, width: src.dimensions.width, height: src.dimensions.height };
      const dstRect = { x: dst.position.x, y: dst.position.y, width: dst.dimensions.width, height: dst.dimensions.height };

      const { srcEdge: bestSrcEdge, dstEdge: bestDstEdge } = determineOptimalEdges(srcRect, dstRect);
      
      (link as any).sourceAnchorId = `${src.id}-anchor-${bestSrcEdge}`;
      (link as any).targetAnchorId = `${dst.id}-anchor-${bestDstEdge}`;
    });
  };

  const loadSchema = (dag: DAGExport) => {
    // Clear existing
    linkManager.cleanup.destroy();
    registry.workspaceState.value.entities.forEach(e => registry.unregisterEntity(e.id));

    // Clone the dag arrays to avoid mutating the original export if it's reused
    const clonedNodes = JSON.parse(JSON.stringify(dag.nodes)) as DomainEntity[];
    const clonedEdges = JSON.parse(JSON.stringify(dag.edges)) as DomainLink[];

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
              permanentLink.updatePath(s, d, srcEdge, dstEdge, 'bezier', srcRect, dstRect, (edge as any).direction || 'default');
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

  const patchEntity = (entityId: string, updates: any) => {
    const entity = registry.workspaceState.value.entities.get(entityId);
    if (!entity) return;
    
    if (updates.position) entity.position.set(updates.position);
    if (updates.dimensions) entity.dimensions.set(updates.dimensions);
    if (updates.metadata) {
      if (entity.updateMetadata) entity.updateMetadata(updates.metadata);
    }
    if (updates.execution && entity.executionSignal) {
      entity.executionSignal.set({ ...entity.executionSignal.value, ...updates.execution });
    }
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
