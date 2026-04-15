export const applyCommonStyles = (element: SVGElement, color?: string | undefined): void => {
  element.classList.add('svg-shape-base');
  if (element.tagName === 'rect') {
    element.classList.add('svg-entity-rect');
  }
  if (color) {
    element.style.setProperty('--shape-custom-fill', color);
  }
};