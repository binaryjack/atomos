import type { SvgRectangleProps, SvgRectangleResult } from './types/svg-rectangle.types.js';
export type { SvgRectangleProps, SvgRectangleResult };

export const createSvgRectangle = function(props: SvgRectangleProps): SvgRectangleResult {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  
  rect.setAttribute('x', props.x.toString());
  rect.setAttribute('y', props.y.toString());
  rect.setAttribute('width', props.width.toString());
  rect.setAttribute('height', props.height.toString());
  rect.setAttribute('fill', props.fill ?? 'transparent');
  rect.setAttribute('stroke', props.stroke ?? '#000');
  rect.setAttribute('stroke-width', (props.strokeWidth ?? 1).toString());
  
  if (props.id) rect.id = props.id;
  if (props.className) rect.className.baseVal = props.className;
  
  // Handle embedded HTML
  if (props.embeddedHtml) {
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', props.x.toString());
    foreignObject.setAttribute('y', props.y.toString());
    foreignObject.setAttribute('width', props.width.toString());
    foreignObject.setAttribute('height', props.height.toString());
    
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.appendChild(props.embeddedHtml);
    
    foreignObject.appendChild(div);
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(rect);
    g.appendChild(foreignObject);
    
    return {
      element: g,
      cleanup: {
        destroy: () => {
          // No event listeners to clean up for basic SVG shapes
        }
      }
    };
  }
  
  return {
    element: rect,
    cleanup: {
      destroy: () => {
        // No event listeners to clean up for basic SVG shapes
      }
    }
  };
};