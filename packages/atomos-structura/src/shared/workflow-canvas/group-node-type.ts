// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NodeRenderContext, NodeTypeDefinition } from '../workflow-node/model/node-type.types.js';
import { GROUP_NODE_TYPE } from './group-model.js';

const renderGroup = (ctx: NodeRenderContext): HTMLElement => {
  const frame = document.createElement('div');
  frame.setAttribute('role', 'group');
  frame.setAttribute('aria-label', `Group ${ctx.label}`);
  frame.style.cssText = [
    'width:100%', 'height:100%', 'box-sizing:border-box', 'border:1px dashed var(--vbs-border, #475569)',
    'border-radius:10px', 'background:rgba(148,163,184,0.06)', 'padding:6px 10px',
    'font:600 12px var(--vbs-entity-props-font-family, system-ui, sans-serif)', 'color:var(--vbs-text-secondary, #94a3b8)',
  ].join(';');
  frame.textContent = ctx.label;
  return frame;
};

/** Built-in container node type, registered on every canvas runtime. */
export const GROUP_NODE_DEFINITION: NodeTypeDefinition = {
  type: GROUP_NODE_TYPE,
  label: 'Group',
  category: 'structure',
  // Expanded groups have no ports; collapsed groups persist computed boundary proxy ports.
  ports: [],
  defaultSize: { width: 420, height: 280 },
  render: renderGroup,
};
