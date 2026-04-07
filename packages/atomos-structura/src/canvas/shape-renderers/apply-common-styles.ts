export const applyCommonStyles = (element: SVGElement, color?: string | undefined): void => {
  const finalColor = color || 'var(--vbs-bg-panel, #09090b)';
  // fill and stroke via inline style: var() resolves, highest priority, always visible
  // stroke-width via presentation attribute: CSS class .vbs-entity-shape can override it
  element.style.fill = finalColor;
  element.style.stroke = 'var(--vbs-primary, #3b82f6)';
  element.style.transition = 'all 0.2s ease-in-out';
  element.setAttribute('stroke-width', '1');
  element.setAttribute('class', 'vbs-entity-shape');
};