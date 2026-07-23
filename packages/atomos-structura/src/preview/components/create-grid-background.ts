export function createGridBackground(svg: SVGSVGElement): SVGElement {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  const smallGrid = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  smallGrid.setAttribute('id', 'canvas-grid-small');
  smallGrid.setAttribute('width', '20');
  smallGrid.setAttribute('height', '20');
  smallGrid.setAttribute('patternUnits', 'userSpaceOnUse');

  const smallPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  smallPath.setAttribute('id', 'grid-small-path');
  smallPath.setAttribute('d', 'M 20 0 L 0 0 0 20');
  smallPath.setAttribute('fill', 'none');
  smallPath.setAttribute('stroke', 'var(--vbs-grid-secondary-color, #111111)');
  smallPath.setAttribute('stroke-width', '0.5');
  smallGrid.appendChild(smallPath);

  const largeGrid = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  largeGrid.setAttribute('id', 'canvas-grid-large');
  largeGrid.setAttribute('width', '100');
  largeGrid.setAttribute('height', '100');
  largeGrid.setAttribute('patternUnits', 'userSpaceOnUse');

  const largeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  largeRect.setAttribute('id', 'grid-large-rect');
  largeRect.setAttribute('width', '100');
  largeRect.setAttribute('height', '100');
  largeRect.setAttribute('fill', 'url(#canvas-grid-small)');

  const largePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  largePath.setAttribute('id', 'grid-large-path');
  largePath.setAttribute('d', 'M 100 0 L 0 0 0 100');
  largePath.setAttribute('fill', 'none');
  largePath.setAttribute('stroke', 'var(--vbs-grid-primary-color, #263348)');
  largePath.setAttribute('stroke-width', '1');

  largeGrid.appendChild(largeRect);
  largeGrid.appendChild(largePath);

  defs.appendChild(smallGrid);
  defs.appendChild(largeGrid);
  svg.appendChild(defs);

  const gridBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  gridBg.setAttribute('width', '100%');
  gridBg.setAttribute('height', '100%');
  gridBg.setAttribute('fill', 'url(#canvas-grid-large)');
  gridBg.style.pointerEvents = 'none';
  svg.appendChild(gridBg);

  return gridBg;
}
