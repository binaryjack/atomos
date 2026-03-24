import type { WorkspaceManager, EntityInstance } from '../../core/workspace-manager.js';
import { createEntityWithEdges } from './create-entity-with-edges.js';
import { createSignal } from '../../core/create-signal.js';
import type { PropertiesRowProps, PropertyProps } from '@vbs/vbs-mod';

export const createInteractiveEntityDemo = function(workspaceManager: WorkspaceManager): void {
  // Create sample property data for first entity
  const nameProperty: PropertyProps = { 
    key: 'name', 
    value: 'User Entity', 
    type: 'string', 
    componentType: 'input' 
  };
  const ageProperty: PropertyProps = { 
    key: 'age', 
    value: 25, 
    type: 'number', 
    componentType: 'input' 
  };
  const activeProperty: PropertyProps = { 
    key: 'active', 
    value: true, 
    type: 'boolean', 
    componentType: 'checkbox' 
  };

  const entity1Properties: PropertiesRowProps[] = [
    {
      id: 'row1',
      properties: [nameProperty, ageProperty],
      order: 1
    },
    {
      id: 'row2', 
      properties: [activeProperty],
      order: 2
    }
  ];

  // Create first interactive entity
  const entity1Position = createSignal({ x: 150, y: 100 });
  const entity1Dimensions = createSignal({ width: 220, height: 160 });
  
  const entity1 = createEntityWithEdges({
    id: 'demo-entity-1',
    title: createSignal('User Entity'),
    properties: createSignal(entity1Properties),
    position: entity1Position,
    dimensions: entity1Dimensions,
    collapsed: createSignal(false),
    selected: createSignal(false),
    draggable: true,
    resizable: true,
    edges: {
      top: {
        position: 'top',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'entity1-anchor-top',
          edgePosition: 'top',
          offset: 0.5
        }
      },
      bottom: {
        position: 'bottom',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'entity1-anchor-bottom',
          edgePosition: 'bottom',
          offset: 0.5
        }
      },
      left: {
        position: 'left',
        entityId: 'demo-entity-1',
        thickness: 5,
        anchor: {
          id: 'entity1-anchor-left',
          edgePosition: 'left',
          offset: 0.3
        }
      },
      right: {
        position: 'right',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'entity1-anchor-right',
          edgePosition: 'right',
          offset: 0.7
        }
      }
    },
    onSelect: () => {
      console.log('Entity 1 selected');
      workspaceManager.behaviorManager.selectEntity('demo-entity-1');
    },
    onDrag: (delta: { x: number; y: number }) => {
      const currentPos = entity1Position.value;
      entity1Position.set({ x: currentPos.x + delta.x, y: currentPos.y + delta.y });
      console.log('Entity 1 dragged to:', entity1Position.value);
    },
    onResize: (dimensions: { width: number; height: number }) => {
      entity1Dimensions.set(dimensions);
      console.log('Entity 1 resized to:', dimensions);
    },
    onPropertyChange: (propertyId: string, value: unknown) => {
      console.log('Entity 1 property changed:', propertyId, value);
    }
  });

  // Create second entity with different properties
  const orderProperty: PropertyProps = { 
    key: 'orderId', 
    value: 'ORD-001', 
    type: 'string', 
    componentType: 'input' 
  };
  const amountProperty: PropertyProps = { 
    key: 'amount', 
    value: 299.99, 
    type: 'number', 
    componentType: 'input' 
  };
  const statusProperty: PropertyProps = { 
    key: 'completed', 
    value: false, 
    type: 'boolean', 
    componentType: 'checkbox' 
  };

  const entity2Properties: PropertiesRowProps[] = [
    {
      id: 'order-row1',
      properties: [orderProperty, amountProperty],
      order: 1
    },
    {
      id: 'order-row2', 
      properties: [statusProperty],
      order: 2
    }
  ];

  const entity2Position = createSignal({ x: 500, y: 200 });
  const entity2Dimensions = createSignal({ width: 200, height: 140 });
  
  const entity2 = createEntityWithEdges({
    id: 'demo-entity-2',
    title: createSignal('Order Entity'),
    properties: createSignal(entity2Properties),
    position: entity2Position,
    dimensions: entity2Dimensions,
    collapsed: createSignal(false),
    selected: createSignal(false),
    draggable: true,
    resizable: true,
    edges: {
      top: {
        position: 'top',
        entityId: 'demo-entity-2',
        thickness: 5,
        anchor: {
          id: 'entity2-anchor-top',
          edgePosition: 'top',
          offset: 0.4
        }
      },
      bottom: {
        position: 'bottom',
        entityId: 'demo-entity-2',
        thickness: 3,
        anchor: {
          id: 'entity2-anchor-bottom',
          edgePosition: 'bottom',
          offset: 0.6
        }
      },
      left: {
        position: 'left',
        entityId: 'demo-entity-2',
        thickness: 3,
        anchor: {
          id: 'entity2-anchor-left',
          edgePosition: 'left',
          offset: 0.5
        }
      },
      right: {
        position: 'right',
        entityId: 'demo-entity-2',
        thickness: 3,
        anchor: {
          id: 'entity2-anchor-right',
          edgePosition: 'right',
          offset: 0.3
        }
      }
    },
    onSelect: () => {
      console.log('Entity 2 selected');
      workspaceManager.behaviorManager.selectEntity('demo-entity-2');
    },
    onDrag: (delta: { x: number; y: number }) => {
      const currentPos = entity2Position.value;
      entity2Position.set({ x: currentPos.x + delta.x, y: currentPos.y + delta.y });
      console.log('Entity 2 dragged to:', entity2Position.value);
    },
    onResize: (dimensions: { width: number; height: number }) => {
      entity2Dimensions.set(dimensions);
      console.log('Entity 2 resized to:', dimensions);
    },
    onPropertyChange: (propertyId: string, value: unknown) => {
      console.log('Entity 2 property changed:', propertyId, value);
    }
  });

  // Create third smaller entity
  const categoryProperty: PropertyProps = { 
    key: 'category', 
    value: 'Electronics', 
    type: 'string', 
    componentType: 'input' 
  };

  const entity3Properties: PropertiesRowProps[] = [
    {
      id: 'cat-row1',
      properties: [categoryProperty],
      order: 1
    }
  ];

  const entity3Position = createSignal({ x: 300, y: 400 });
  const entity3Dimensions = createSignal({ width: 160, height: 100 });
  
  const entity3 = createEntityWithEdges({
    id: 'demo-entity-3',
    title: createSignal('Category'),
    properties: createSignal(entity3Properties),
    position: entity3Position,
    dimensions: entity3Dimensions,
    collapsed: createSignal(false),
    selected: createSignal(false),
    draggable: true,
    resizable: true,
    edges: {
      top: {
        position: 'top',
        entityId: 'demo-entity-3',
        thickness: 3,
        anchor: {
          id: 'entity3-anchor-top',
          edgePosition: 'top',
          offset: 0.5
        }
      },
      bottom: {
        position: 'bottom',
        entityId: 'demo-entity-3',
        thickness: 3,
        anchor: {
          id: 'entity3-anchor-bottom',
          edgePosition: 'bottom',
          offset: 0.5
        }
      },
      left: {
        position: 'left',
        entityId: 'demo-entity-3',
        thickness: 5,
        anchor: {
          id: 'entity3-anchor-left',
          edgePosition: 'left',
          offset: 0.5
        }
      },
      right: {
        position: 'right',
        entityId: 'demo-entity-3',
        thickness: 3,
        anchor: {
          id: 'entity3-anchor-right',
          edgePosition: 'right',
          offset: 0.5
        }
      }
    },
    onSelect: () => {
      console.log('Entity 3 selected');
      workspaceManager.behaviorManager.selectEntity('demo-entity-3');
    },
    onDrag: (delta: { x: number; y: number }) => {
      const currentPos = entity3Position.value;
      entity3Position.set({ x: currentPos.x + delta.x, y: currentPos.y + delta.y });
      console.log('Entity 3 dragged to:', entity3Position.value);
    },
    onResize: (dimensions: { width: number; height: number }) => {
      entity3Dimensions.set(dimensions);
      console.log('Entity 3 resized to:', dimensions);
    },
    onPropertyChange: (propertyId: string, value: unknown) => {
      console.log('Entity 3 property changed:', propertyId, value);
    }
  });

  // Create entity instances for workspace registration
  const entityInstance1: EntityInstance = {
    id: 'demo-entity-1',
    element: entity1.element,
    position: entity1Position,
    dimensions: entity1Dimensions,
    cleanup: entity1.cleanup.destroy
  };

  const entityInstance2: EntityInstance = {
    id: 'demo-entity-2',
    element: entity2.element,
    position: entity2Position,
    dimensions: entity2Dimensions,
    cleanup: entity2.cleanup.destroy
  };

  const entityInstance3: EntityInstance = {
    id: 'demo-entity-3',
    element: entity3.element,
    position: entity3Position,
    dimensions: entity3Dimensions,
    cleanup: entity3.cleanup.destroy
  };

  // Register entities with workspace manager
  workspaceManager.registerEntity(entityInstance1);
  workspaceManager.registerEntity(entityInstance2);
  workspaceManager.registerEntity(entityInstance3);

  // Add anchor attributes after entity registration for proper identification
  setTimeout(() => {
    const setAnchorAttributes = (entityId: string, anchorConfigs: Array<{id: string, position: string}>) => {
      const entityElement = document.getElementById(entityId);
      if (entityElement) {
        const anchors = entityElement.querySelectorAll('[class*="anchor"]');
        anchors.forEach((anchor, index) => {
          const config = anchorConfigs[index];
          if (config) {
            anchor.setAttribute('id', config.id);
            anchor.setAttribute('data-anchor-id', config.id);
            anchor.setAttribute('data-edge-position', config.position);
            anchor.setAttribute('data-entity-id', entityId);
          }
        });
      }
    };

    setAnchorAttributes('demo-entity-1', [
      {id: 'entity1-anchor-top', position: 'top'},
      {id: 'entity1-anchor-bottom', position: 'bottom'},
      {id: 'entity1-anchor-left', position: 'left'},
      {id: 'entity1-anchor-right', position: 'right'}
    ]);

    setAnchorAttributes('demo-entity-2', [
      {id: 'entity2-anchor-top', position: 'top'},
      {id: 'entity2-anchor-bottom', position: 'bottom'},
      {id: 'entity2-anchor-left', position: 'left'},
      {id: 'entity2-anchor-right', position: 'right'}
    ]);

    setAnchorAttributes('demo-entity-3', [
      {id: 'entity3-anchor-top', position: 'top'},
      {id: 'entity3-anchor-bottom', position: 'bottom'},
      {id: 'entity3-anchor-left', position: 'left'},
      {id: 'entity3-anchor-right', position: 'right'}
    ]);

    console.log('Anchor attributes configured for all entities');
  }, 100);

  console.log('Interactive entity demo initialized with 3 entities');
};