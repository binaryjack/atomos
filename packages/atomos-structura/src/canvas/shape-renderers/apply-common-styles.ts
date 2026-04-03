export const applyCommonStyles = (element: SVGElement, color?: string | undefined): void => {
  const finalColor = color || 'var(--vbs-bg-panel, #09090b)';

  const style = `
    fill: ${finalColor};
    stroke: var(--vbs-primary, #3b82f6);
    stroke-width: 1;
    transition: all 0.2s ease-in-out;
  `;
  element.setAttribute('style', style);
};