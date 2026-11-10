// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface CustomNodeContent {
  readonly rootElement: SVGElement;
  readonly dragHandle: HTMLElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly cleanup: { readonly destroy: () => void };
}

/**
 * Hosts the HTMLElement returned by a NodeTypeDefinition.render() inside the node frame.
 * The frame itself is the drag handle; interactive children opt out with `.no-drag`.
 */
export const createCustomNodeContent = function(
  render: (size: { width: number; height: number }) => HTMLElement,
  initialSize: { width: number; height: number }
): CustomNodeContent {
  const frame = document.createElementNS(SVG_NS, 'foreignObject');
  frame.classList.add('vbs-custom-node');
  const body = document.createElement('div');
  body.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  body.style.cssText = [
    'width:100%', 'height:100%', 'box-sizing:border-box', 'overflow:hidden',
    'background:var(--vbs-entity-color, #111827)', 'border:1px solid var(--vbs-border, #334155)',
    'border-radius:var(--vbs-radius, 8px)', 'color:var(--vbs-text-primary, #f4f4f5)',
  ].join(';');
  body.appendChild(render(initialSize));
  frame.appendChild(body);

  const updateSize = (width: number, height: number): void => {
    frame.setAttribute('width', String(width));
    frame.setAttribute('height', String(height));
  };
  updateSize(initialSize.width, initialSize.height);

  return {
    rootElement: frame,
    dragHandle: body,
    updateSize,
    cleanup: { destroy: () => frame.remove() },
  };
};
