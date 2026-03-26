import type { SchemaBuilderState } from './schema-builder-state';
import type { Entity } from '@vbs/vbs-mod';
import { createVbsCanvas } from '@vbs/web-ui';

export interface SchemaBuilderProps {
  readonly container: HTMLElement;
  readonly width: number;
  readonly height: number;
  readonly onStateChange?: (state: SchemaBuilderState) => void;
}

export const createSchemaBuilder = function(props: SchemaBuilderProps) {
  const canvas = createVbsCanvas({
    width: props.width,
    height: props.height,
    showGrid: true,
    gridSize: 16,
    onCanvasClick: handleCanvasClick,
    onCanvasDrag: handleCanvasDrag
  });
  
  props.container.appendChild(canvas);
  
  function handleCanvasClick(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log(`Canvas clicked at: ${x}, ${y}`);
    // TODO: Implement entity creation logic
  }
  
  function handleCanvasDrag(event: DragEvent): void {
    event.preventDefault();
    console.log('Canvas drag event', event);
    // TODO: Implement drag and drop logic
  }
  
  function addEntity(entity: Entity): void {
    // TODO: Add entity to state and render
    console.log('Adding entity:', entity);
  }
  
  function removeEntity(entityId: string): void {
    // TODO: Remove entity from state and DOM
    console.log('Removing entity:', entityId);
  }
  
  function updateEntity(entity: Entity): void {
    // TODO: Update entity in state and re-render
    console.log('Updating entity:', entity);
  }
  
  return {
    addEntity,
    removeEntity,
    updateEntity,
    canvas
  };
};