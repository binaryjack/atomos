import { vbsElement } from '../base/vbs-element.js';

export interface VbsCanvasProps {
  readonly width: number;
  readonly height: number;
  readonly showGrid?: boolean;
  readonly gridSize?: number;
  readonly onCanvasClick?: (event: MouseEvent) => void;
  readonly onCanvasDrag?: (event: DragEvent) => void;
}

export const createVbsCanvas = function(props: VbsCanvasProps) {
  const canvas = vbsElement('div', {
    className: `vbs-canvas ${props.showGrid ? 'vbs-grid' : ''}`
  });
  
  canvas.style.width = `${props.width}px`;
  canvas.style.height = `${props.height}px`;
  
  if (props.gridSize) {
    canvas.style.setProperty('--vbs-grid-size', `${props.gridSize}px`);
  }
  
  // Add event listeners
  if (props.onCanvasClick) {
    canvas.addEventListener('click', props.onCanvasClick);
  }
  
  if (props.onCanvasDrag) {
    canvas.addEventListener('dragover', (e) => e.preventDefault());
    canvas.addEventListener('drop', props.onCanvasDrag);
  }
  
  return canvas;
};