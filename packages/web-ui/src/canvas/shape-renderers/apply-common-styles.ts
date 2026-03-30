export const applyCommonStyles = (element: SVGElement, color?: string | undefined): void => {
  const style = `
    fill: ${color || '#1e293b'};
    stroke: #3b82f6;
    stroke-width: 2;
    transition: all 0.2s ease-in-out;
  `;
  element.setAttribute('style', style);
};