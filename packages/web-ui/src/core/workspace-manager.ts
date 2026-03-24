import { createSignal } from './create-signal.js';
import { createInteractiveBehaviorManager } from './interactive-behavior-manager.js';
import { createLinkManager } from './link-manager.js';
import type { InteractiveBehaviorManager, InteractionContext } from './interactive-behavior-manager.js';
import type { LinkManager } from './link-manager.js';
import type { Signal } from './types/signal.types.js';

export interface EntityInstance {
  readonly id: string;
  readonly element: SVGGElement;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly cleanup: () => void;
}

export interface WorkspaceState {
  readonly entities: Map<string, EntityInstance>;
  readonly selectedEntityId?: string | undefined;
  readonly linkCreationInProgress: boolean;
  readonly cursorPosition: { x: number; y: number };
}

export interface WorkspaceManager {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly linkManager: LinkManager;
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly unregisterEntity: (entityId: string) => void;
  readonly handleCanvasClick: (event: MouseEvent) => void;
  readonly handleCanvasMouseMove: (event: MouseEvent) => void;
  readonly createEntityAtCursor: (entityType: string) => string;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const createWorkspaceManager = function(svgContainer: SVGSVGElement): WorkspaceManager {
  const cleanupFunctions: Array<() => void> = [];
  
  // Core managers
  const behaviorManager = createInteractiveBehaviorManager();
  const linkManager = createLinkManager();
  cleanupFunctions.push(behaviorManager.cleanup.destroy);
  cleanupFunctions.push(linkManager.cleanup.destroy);
  
  // Workspace state
  const workspaceState = createSignal<WorkspaceState>({
    entities: new Map(),
    selectedEntityId: undefined,
    linkCreationInProgress: false,
    cursorPosition: { x: 0, y: 0 }
  });
  cleanupFunctions.push(() => workspaceState.subscribe(() => {})());
  
  // SVG coordinate conversion
  const svgPoint = svgContainer.createSVGPoint();
  const screenToSvgCoords = (clientX: number, clientY: number) => {
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const transformed = svgPoint.matrixTransform(svgContainer.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };
  
  // Register entity in workspace
  const registerEntity = (entity: EntityInstance) => {
    const currentState = workspaceState.value;
    const newEntities = new Map(currentState.entities);
    newEntities.set(entity.id, entity);
    
    workspaceState.set({
      ...currentState,
      entities: newEntities
    });
    
    // Add entity to SVG container
    svgContainer.appendChild(entity.element);
    
    // Set up entity-specific interaction handlers
    setupEntityInteractions(entity);
  };
  
  // Unregister entity from workspace
  const unregisterEntity = (entityId: string) => {
    const currentState = workspaceState.value;
    const entity = currentState.entities.get(entityId);
    
    if (entity) {
      // Remove from DOM
      if (entity.element.parentNode) {
        entity.element.parentNode.removeChild(entity.element);
      }
      
      // Clean up entity
      entity.cleanup();
      
      // Update state
      const newEntities = new Map(currentState.entities);
      newEntities.delete(entityId);
      
      workspaceState.set({
        ...currentState,
        entities: newEntities,
        selectedEntityId: currentState.selectedEntityId === entityId ? undefined : currentState.selectedEntityId
      });
    }
  };
  
  // Set up entity-specific interactions
  const setupEntityInteractions = (entity: EntityInstance) => {
    // Find anchors within the entity using a more robust selector
    const anchors = entity.element.querySelectorAll('[class*="anchor"]');
    
    anchors.forEach(anchor => {
      const anchorElement = anchor as Element;
      // Get anchor ID from various possible attributes
      const anchorId = anchorElement.getAttribute('id') || 
                       anchorElement.getAttribute('data-anchor-id') || 
                       `${entity.id}-anchor-${Date.now()}`;
      const edgePosition = anchorElement.getAttribute('data-edge-position') || 'top';
      
      // Set anchor attributes for identification
      anchorElement.setAttribute('data-anchor-id', anchorId);
      anchorElement.setAttribute('data-entity-id', entity.id);
      
      // Enhanced anchor mousedown for link creation
      const handleAnchorMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
        const context: InteractionContext = {
          entityId: entity.id,
          anchorId,
          position: svgCoords,
          event
        };
        
        console.log('Anchor clicked:', anchorId, 'on entity:', entity.id);
        
        // Start link creation workflow
        behaviorManager.startLinkCreation(context);
        
        // Update workspace state
        workspaceState.set({
          ...workspaceState.value,
          linkCreationInProgress: true
        });
        
        // Create temporary link
        const tempLinkId = `temp-link-${Date.now()}`;
        const tempLink = linkManager.createLink({
          id: tempLinkId,
          sourceAnchorId: anchorId,
          sourcePosition: svgCoords,
          targetPosition: svgCoords,
          temporary: true,
          animated: true,
          strokeColor: '#3b82f6'
        });
        
        // Add temporary link to SVG
        svgContainer.appendChild(tempLink.element);
        
        console.log('Started link creation from anchor:', anchorId);
      };
      
      anchorElement.addEventListener('mousedown', handleAnchorMouseDown as EventListener);
    });
  };
  
  // Canvas-level click handling
  const handleCanvasClick = (event: MouseEvent) => {
    const behaviorState = behaviorManager.behaviorState.value;
    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    
    if (behaviorState.linkCreation === 'drawing') {
      // Complete link creation - create new entity at cursor
      const newEntityId = createEntityAtCursor('default');
      
      // Find a suitable anchor on the new entity for connection
      // This would be implemented based on the entity creation logic
      behaviorManager.completeLinkCreation({
        entityId: newEntityId,
        anchorId: `${newEntityId}-anchor-left`, // Default anchor
        position: svgCoords,
        event
      });
      
      workspaceState.set({
        ...workspaceState.value,
        linkCreationInProgress: false
      });
      
    } else {
      // Clear selection
      behaviorManager.selectEntity('');
      workspaceState.set({
        ...workspaceState.value,
        selectedEntityId: undefined
      });
    }
  };
  
  // Canvas mouse move handling
  const handleCanvasMouseMove = (event: MouseEvent) => {
    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    const behaviorState = behaviorManager.behaviorState.value;
    
    // Update cursor position
    workspaceState.set({
      ...workspaceState.value,
      cursorPosition: svgCoords
    });
    
    if (behaviorState.linkCreation === 'drawing') {
      // Update temporary link position
      behaviorManager.updateLinkDrawing(svgCoords);
      
      // Find and update temporary link
      const tempLinks = Array.from(svgContainer.querySelectorAll('path[id^=\"link-temp-\"]'));
      tempLinks.forEach(linkElement => {
        const linkId = linkElement.id.replace('link-', '');
        const link = linkManager.getLink(linkId);
        if (link && behaviorState.sourceAnchorId) {
          // Get source anchor position by data attribute
          const sourceAnchor = svgContainer.querySelector(`[data-anchor-id=\"${behaviorState.sourceAnchorId}\"]`);
          if (sourceAnchor) {
            const sourceRect = sourceAnchor.getBoundingClientRect();
            const sourceCoords = screenToSvgCoords(sourceRect.left + sourceRect.width/2, sourceRect.top + sourceRect.height/2);
            link.updatePath(sourceCoords, svgCoords);
          }
        }
      });
      
      // Highlight potential target anchors during link creation
      const anchors = svgContainer.querySelectorAll('[data-anchor-id]');
      anchors.forEach(anchor => {
        const rect = anchor.getBoundingClientRect();
        const anchorCoords = screenToSvgCoords(rect.left + rect.width/2, rect.top + rect.height/2);
        const distance = Math.sqrt(
          Math.pow(anchorCoords.x - svgCoords.x, 2) + 
          Math.pow(anchorCoords.y - svgCoords.y, 2)
        );
        
        // Highlight anchor if cursor is near (within 25 units)
        if (distance < 25 && anchor.getAttribute('data-anchor-id') !== behaviorState.sourceAnchorId) {
          anchor.setAttribute('stroke', '#10b981');
          anchor.setAttribute('stroke-width', '3');
          anchor.setAttribute('opacity', '1');
        } else if (anchor.getAttribute('data-anchor-id') !== behaviorState.sourceAnchorId) {
          anchor.removeAttribute('stroke');
          anchor.removeAttribute('stroke-width');
        }
      });
    }
  };
  
  // Create new entity at cursor position
  const createEntityAtCursor = (entityType: string): string => {
    const cursorPos = workspaceState.value.cursorPosition;
    const newEntityId = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // This is a placeholder - the actual entity creation would depend on your entity factory
    // For now, we'll create a simple placeholder entity
    
    console.log(`Creating ${entityType} entity at (${cursorPos.x}, ${cursorPos.y}) with ID: ${newEntityId}`);
    
    // In a real implementation, you would:
    // 1. Create the entity using your entity factory
    // 2. Register it with the workspace
    // 3. Position it at the cursor location
    
    return newEntityId;
  };
  
  // Subscribe to behavior manager state changes
  behaviorManager.behaviorState.subscribe((state) => {
    const currentWorkspaceState = workspaceState.value;
    
    // Update workspace state based on behavior changes
    if (state.linkCreation !== 'idle' && !currentWorkspaceState.linkCreationInProgress) {
      workspaceState.set({
        ...currentWorkspaceState,
        linkCreationInProgress: true
      });
    } else if (state.linkCreation === 'idle' && currentWorkspaceState.linkCreationInProgress) {
      workspaceState.set({
        ...currentWorkspaceState,
        linkCreationInProgress: false
      });
      
      // Clean up temporary links
      const tempLinks = Array.from(svgContainer.querySelectorAll('path[id*=\"temp-link\"]'));
      tempLinks.forEach(link => link.remove());
    }
    
    if (state.activeEntityId !== currentWorkspaceState.selectedEntityId) {
      workspaceState.set({
        ...currentWorkspaceState,
        selectedEntityId: state.activeEntityId
      });
    }
  });
  
  // Global canvas event listeners
  svgContainer.addEventListener('click', handleCanvasClick);
  svgContainer.addEventListener('mousemove', handleCanvasMouseMove);
  
  cleanupFunctions.push(() => {
    svgContainer.removeEventListener('click', handleCanvasClick);
    svgContainer.removeEventListener('mousemove', handleCanvasMouseMove);
  });
  
  return {
    workspaceState,
    behaviorManager,
    linkManager,
    registerEntity,
    unregisterEntity,
    handleCanvasClick,
    handleCanvasMouseMove,
    createEntityAtCursor,
    cleanup: {
      destroy: () => {
        // Clean up all entities
        workspaceState.value.entities.forEach(entity => entity.cleanup());
        
        // Run all cleanup functions
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};