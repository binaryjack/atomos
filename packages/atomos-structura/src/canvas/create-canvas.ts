import type { EntityState, Store } from '../types/store.types.js';

export const createCanvas = function(store: Store, canvasElement: HTMLCanvasElement) {
  const ctx = canvasElement.getContext('2d')!;
  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let dragEntityId: string | null = null;

  const render = function() {
    const state = store.getState();
    const { entities, links, viewport } = state;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Save context for transforms
    ctx.save();
    
    // Apply viewport transforms
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw links
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    Object.values(links).forEach(link => {
      const sourceEntity = entities[link.sourceId];
      const targetEntity = entities[link.targetId];
      
      if (sourceEntity && targetEntity) {
        ctx.beginPath();
        ctx.moveTo(
          sourceEntity.position.x + sourceEntity.dimensions.width / 2,
          sourceEntity.position.y + sourceEntity.dimensions.height / 2
        );
        ctx.lineTo(
          targetEntity.position.x + targetEntity.dimensions.width / 2,
          targetEntity.position.y + targetEntity.dimensions.height / 2
        );
        ctx.stroke();
      }
    });

    // Draw entities
    Object.values(entities).forEach(entity => {
      const isSelected = state.selectedEntityId === entity.id;
      
      // Entity rectangle
      ctx.fillStyle = isSelected ? '#e0f2fe' : '#f5f5f5';
      ctx.strokeStyle = isSelected ? '#0277bd' : '#999';
      ctx.lineWidth = 2;
      
      ctx.fillRect(
        entity.position.x,
        entity.position.y,
        entity.dimensions.width,
        entity.dimensions.height
      );
      ctx.strokeRect(
        entity.position.x,
        entity.position.y,
        entity.dimensions.width,
        entity.dimensions.height
      );

      // Entity label
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        entity.id,
        entity.position.x + entity.dimensions.width / 2,
        entity.position.y + entity.dimensions.height / 2 + 5
      );
    });

    ctx.restore();
  };

  const getEntityAt = function(x: number, y: number): string | null {
    const state = store.getState();
    const { entities, viewport } = state;
    
    // Transform screen coordinates to canvas coordinates
    const canvasX = (x - viewport.panX) / viewport.zoom;
    const canvasY = (y - viewport.panY) / viewport.zoom;
    
    // Check entities in reverse order (top to bottom)
    const entityIds = Object.keys(entities).reverse();
    for (const entityId of entityIds) {
      const entity = entities[entityId];
      if (
        entity &&
        canvasX >= entity.position.x &&
        canvasX <= entity.position.x + entity.dimensions.width &&
        canvasY >= entity.position.y &&
        canvasY <= entity.position.y + entity.dimensions.height
      ) {
        return entityId;
      }
    }
    return null;
  };

  const handleMouseDown = function(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const entityId = getEntityAt(x, y);
    if (entityId) {
      isDragging = true;
      dragEntityId = entityId;
      dragStartPos = { x, y };
      store.dispatch({ type: 'entity/select', payload: { id: entityId } });
      console.log('Started dragging entity:', entityId);
    }
  };

  const handleMouseMove = function(event: MouseEvent) {
    if (!isDragging || !dragEntityId) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const deltaX = (x - dragStartPos.x) / store.getState().viewport.zoom;
    const deltaY = (y - dragStartPos.y) / store.getState().viewport.zoom;
    
    const entity = store.getState().entities[dragEntityId];
    if (entity) {
      store.dispatch({
        type: 'entity/update',
        payload: {
          id: dragEntityId,
          changes: {
            position: {
              x: entity.position.x + deltaX,
              y: entity.position.y + deltaY
            }
          }
        }
      });
    }
    
    dragStartPos = { x, y };
  };

  const handleMouseUp = function() {
    if (isDragging) {
      console.log('Finished dragging entity:', dragEntityId);
      isDragging = false;
      dragEntityId = null;
    }
  };

  const handleDoubleClick = function(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const entityId = getEntityAt(x, y);
    if (!entityId) {
      // Create new entity
      const state = store.getState();
      const { viewport } = state;
      
      const canvasX = (x - viewport.panX) / viewport.zoom;
      const canvasY = (y - viewport.panY) / viewport.zoom;
      
      const newEntityId = `entity-${Date.now()}`;
      const newEntity: EntityState = {
        id: newEntityId,
        position: { x: canvasX - 50, y: canvasY - 25 },
        dimensions: { width: 100, height: 50 },
        data: {}
      };
      
      store.dispatch({ type: 'entity/add', payload: newEntity });
      console.log('Created new entity:', newEntity);
    }
  };

  // Setup event listeners
  canvasElement.addEventListener('mousedown', handleMouseDown);
  canvasElement.addEventListener('mousemove', handleMouseMove);
  canvasElement.addEventListener('mouseup', handleMouseUp);
  canvasElement.addEventListener('dblclick', handleDoubleClick);

  // Subscribe to store changes for re-rendering
  const unsubscribe = store.subscribe(render);

  // Initial render
  render();

  return {
    render,
    destroy: function() {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      canvasElement.removeEventListener('mousemove', handleMouseMove);
      canvasElement.removeEventListener('mouseup', handleMouseUp);
      canvasElement.removeEventListener('dblclick', handleDoubleClick);
      unsubscribe();
    }
  };
};