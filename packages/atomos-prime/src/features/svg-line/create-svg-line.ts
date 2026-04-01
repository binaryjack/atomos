import type { SvgLineProps, SvgLineResult } from './types/svg-line.types.js';
export type { SvgLineProps, SvgLineResult };

export const createSvgLine = function(props: SvgLineProps): SvgLineResult {
  const createPath = () => {
    switch (props.type) {
      case 'linear':
        return `M ${props.x1} ${props.y1} L ${props.x2} ${props.y2}`;
      
      case 'orthogonal': {
        const midX = (props.x1 + props.x2) / 2;
        return `M ${props.x1} ${props.y1} L ${midX} ${props.y1} L ${midX} ${props.y2} L ${props.x2} ${props.y2}`;
      }
      
      case 'spline': {
        const controlX1 = props.x1 + (props.x2 - props.x1) * 0.5;
        const controlY1 = props.y1;
        const controlX2 = props.x2 - (props.x2 - props.x1) * 0.5;
        const controlY2 = props.y2;
        return `M ${props.x1} ${props.y1} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${props.x2} ${props.y2}`;
      }
      
      default:
        return `M ${props.x1} ${props.y1} L ${props.x2} ${props.y2}`;
    }
  };
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', createPath());
  path.setAttribute('stroke', props.stroke ?? '#000');
  path.setAttribute('stroke-width', (props.strokeWidth ?? 1).toString());
  path.setAttribute('fill', 'none');
  
  if (props.strokeDasharray) path.setAttribute('stroke-dasharray', props.strokeDasharray);
  if (props.id) path.id = props.id;
  if (props.className) path.className.baseVal = props.className;
  
  // Handle embedded HTML at midpoint
  if (props.embeddedHtml) {
    const midX = (props.x1 + props.x2) / 2;
    const midY = (props.y1 + props.y2) / 2;
    
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', (midX - 50).toString());
    foreignObject.setAttribute('y', (midY - 20).toString());
    foreignObject.setAttribute('width', '100');
    foreignObject.setAttribute('height', '40');
    
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.backgroundColor = 'white';
    div.style.border = '1px solid #ccc';
    div.style.borderRadius = '4px';
    div.appendChild(props.embeddedHtml);
    
    foreignObject.appendChild(div);
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(path);
    g.appendChild(foreignObject);
    
    return {
      element: g,
      cleanup: {
        destroy: () => {
          // No event listeners to clean up
        }
      }
    };
  }
  
  return {
    element: path,
    cleanup: {
      destroy: () => {
        // No event listeners to clean up
      }
    }
  };
};