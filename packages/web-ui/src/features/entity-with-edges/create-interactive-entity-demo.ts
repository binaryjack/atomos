import type { WorkspaceManager, EntityInstance } from '../../core/workspace-manager.js';
import { createSignal } from '../../core/create-signal.js';

export const createInteractiveEntityDemo = function(workspaceManager: WorkspaceManager) {
  // Create SVG-based demo entities for testing interactive behavior
  
  // Helper function to create a simple SVG entity
  const createSvgEntity = (id: string, x: number, y: number, width: number, height: number, color: string, title: string) => {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    container.setAttribute('id', id);
    container.setAttribute('class', 'interactive-entity');
    
    // Main rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('fill', color);
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '8');
    rect.setAttribute('class', 'entity-body cursor-move');
    
    // Title text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (x + width / 2).toString());
    text.setAttribute('y', (y + 20).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', 'bold');
    text.textContent = title;
    
    // Create edges as thick colored borders
    const createEdge = (side: 'top' | 'bottom' | 'left' | 'right', thickness = 5) => {
      const edge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      edge.setAttribute('class', `edge edge-${side} hover:opacity-80 cursor-pointer`);
      edge.setAttribute('fill', '#3b82f6');
      
      switch (side) {
        case 'top':
          edge.setAttribute('x', x.toString());
          edge.setAttribute('y', (y - thickness).toString());
          edge.setAttribute('width', width.toString());
          edge.setAttribute('height', thickness.toString());
          break;
        case 'bottom':
          edge.setAttribute('x', x.toString());
          edge.setAttribute('y', (y + height).toString());
          edge.setAttribute('width', width.toString());
          edge.setAttribute('height', thickness.toString());
          break;
        case 'left':
          edge.setAttribute('x', (x - thickness).toString());
          edge.setAttribute('y', y.toString());
          edge.setAttribute('width', thickness.toString());
          edge.setAttribute('height', height.toString());
          break;
        case 'right':
          edge.setAttribute('x', (x + width).toString());
          edge.setAttribute('y', y.toString());
          edge.setAttribute('width', thickness.toString());
          edge.setAttribute('height', height.toString());
          break;
      }
      
      // Add hover effects
      edge.addEventListener('mouseenter', () => {
        edge.setAttribute('fill', '#2563eb');
        console.log(`${id} ${side} edge hovered`);
      });
      
      edge.addEventListener('mouseleave', () => {
        edge.setAttribute('fill', '#3b82f6');
      });
      
      // Add click handler for anchor behavior
      edge.addEventListener('mousedown', (e) => {
        e.preventDefault();
        console.log(`${id} ${side} anchor clicked - starting link creation`);
        workspaceManager.behaviorManager.startLinkCreation({
          anchorId: `${id}-${side}`,
          entityId: id,
          position: { x: e.clientX, y: e.clientY },
          event: e
        });
      });
      
      return edge;
    };
    
    // Add all edges
    container.appendChild(createEdge('top', 3));
    container.appendChild(createEdge('bottom', 3));
    container.appendChild(createEdge('left', 5));
    container.appendChild(createEdge('right', 5));
    
    // Add main elements
    container.appendChild(rect);
    container.appendChild(text);
    
    // Add drag behavior
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    
    rect.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart = { x: e.clientX - x, y: e.clientY - y };
      console.log(`${id} drag started`);
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Update position
      rect.setAttribute('x', newX.toString());
      rect.setAttribute('y', newY.toString());
      text.setAttribute('x', (newX + width / 2).toString());
      text.setAttribute('y', (newY + 20).toString());
      
      // Update edges
      const edges = container.querySelectorAll('.edge');
      edges.forEach((edge, index) => {
        const sides = ['top', 'bottom', 'left', 'right'];
        const side = sides[index];
        const thickness = side === 'left' || side === 'right' ? 5 : 3;
        
        switch (side) {
          case 'top':
            edge.setAttribute('x', newX.toString());
            edge.setAttribute('y', (newY - thickness).toString());
            break;
          case 'bottom':
            edge.setAttribute('x', newX.toString());
            edge.setAttribute('y', (newY + height).toString());
            break;
          case 'left':
            edge.setAttribute('x', (newX - thickness).toString());
            edge.setAttribute('y', newY.toString());
            break;
          case 'right':
            edge.setAttribute('x', (newX + width).toString());
            edge.setAttribute('y', newY.toString());
            break;
        }
      });
      
      console.log(`${id} dragged to:`, { x: newX, y: newY });
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        console.log(`${id} drag ended`);
        isDragging = false;
      }
    });
    
    return container;
  };

  // Create three demo entities
  const entity1Position = createSignal({ x: 100, y: 100 });
  const entity1Dimensions = createSignal({ width: 200, height: 80 });
  
  const entity1Element = createSvgEntity('demo-entity-1', 100, 100, 200, 80, '#ef4444', 'Data Source');
  
  const entity1Instance: EntityInstance = {
    id: 'demo-entity-1',
    element: entity1Element,
    position: entity1Position,
    dimensions: entity1Dimensions,
    cleanup: () => {
      console.log('Entity 1 cleanup');
    }
  };
  workspaceManager.registerEntity(entity1Instance);
  
  const entity2Position = createSignal({ x: 400, y: 150 });
  const entity2Dimensions = createSignal({ width: 180, height: 100 });
  
  const entity2Element = createSvgEntity('demo-entity-2', 400, 150, 180, 100, '#10b981', 'Processor');
  
  const entity2Instance: EntityInstance = {
    id: 'demo-entity-2',
    element: entity2Element,
    position: entity2Position,
    dimensions: entity2Dimensions,
    cleanup: () => {
      console.log('Entity 2 cleanup');
    }
  };
  workspaceManager.registerEntity(entity2Instance);
  
  const entity3Position = createSignal({ x: 250, y: 300 });
  const entity3Dimensions = createSignal({ width: 160, height: 90 });
  
  const entity3Element = createSvgEntity('demo-entity-3', 250, 300, 160, 90, '#8b5cf6', 'Output');
  
  const entity3Instance: EntityInstance = {
    id: 'demo-entity-3',
    element: entity3Element,
    position: entity3Position,
    dimensions: entity3Dimensions,
    cleanup: () => {
      console.log('Entity 3 cleanup');
    }
  };
  workspaceManager.registerEntity(entity3Instance);

  // Add instructions to console
  console.log('🎯 Interactive Demo Loaded!');
  console.log('• Hover over entity edges to see highlights');
  console.log('• Click and drag entities to move them');
  console.log('• Click on edges to start creating links');
  console.log('• Press ESC to cancel interactions');
  
  return [entity1Instance, entity2Instance, entity3Instance];
};