export interface EntityBodyResult {
  readonly body: SVGRectElement;
  readonly label: SVGTextElement;
}

export const createEntityBody = function(title: string): EntityBodyResult {
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  body.setAttribute('rx', '6');
  body.setAttribute('fill', 'var(--vbs-bg-panel, #111111)');
  body.setAttribute('stroke', 'var(--vbs-border, #27272a)');
  body.setAttribute('stroke-width', '1.5');
  body.style.cursor = 'move';

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('fill', '#f1f5f9');
  label.setAttribute('font-size', '13');
  label.setAttribute('font-family', 'system-ui, sans-serif');
  label.setAttribute('font-weight', '600');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('text-anchor', 'middle');
  label.textContent = title;

  return { body, label };
};
