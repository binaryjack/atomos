export const applyCommonStyles = (element: SVGElement, color?: string | undefined): void => {
  element.classList.add('svg-shape-base');
  
  if (element.tagName === 'rect') {
    element.classList.add('svg-entity-rect');
  }
  
  if (color) {
    element.style.setProperty('--shape-custom-fill', color);
  }

  // Modern SVG Styling Configuration
  // Fallbacks provided for enterprise dark-mode aesthetics
  const fill = color || 'var(--vbs-entity-color, var(--shape-fill, rgba(15, 23, 42, 0.8)))';
  const stroke = 'var(--shape-stroke, rgba(59, 130, 246, 0.6))';
  const strokeWidth = 'var(--shape-stroke-width, 1.5px)';
  const shadow = 'var(--shape-shadow, drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4)))';
  
  element.style.fill = fill;
  element.style.stroke = stroke;
  element.style.strokeWidth = strokeWidth;
  element.style.filter = shadow;
  element.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
};