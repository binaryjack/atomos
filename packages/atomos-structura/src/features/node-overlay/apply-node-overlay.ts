// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { NODE_STATUS_COLORS, type NodeState } from '../../shared/workflow-node/model/node-state.types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYER_CLASS = 'vbs-node-overlay';

const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] => {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
};

const buildLayer = (state: NodeState, size: { width: number; height: number }): SVGGElement => {
  const color = NODE_STATUS_COLORS[state.status];
  const layer = svg('g', { class: LAYER_CLASS, 'pointer-events': 'none', 'data-status': state.status });
  layer.appendChild(svg('rect', {
    x: '-3', y: '-3', width: String(size.width + 6), height: String(size.height + 6), rx: '8',
    fill: 'none', stroke: color, 'stroke-width': state.status === 'running' ? '3' : '2',
    ...(state.status === 'queued' || state.status === 'waiting' ? { 'stroke-dasharray': '6 4' } : {}),
  }));
  const badge = svg('text', { x: String(size.width), y: '-8', 'text-anchor': 'end', 'font-size': '11', fill: color });
  badge.textContent = state.label ?? state.status;
  layer.appendChild(badge);
  if (state.progress !== undefined) {
    layer.appendChild(svg('rect', { x: '0', y: String(size.height + 5), width: String(size.width), height: '3', fill: '#1e293b' }));
    layer.appendChild(svg('rect', {
      class: 'vbs-node-progress', x: '0', y: String(size.height + 5), width: String(size.width * state.progress), height: '3', fill: color,
    }));
  }
  return layer;
};

/**
 * Draws (or removes when `state` is undefined) the runtime status layer of one node:
 * status ring, label badge and optional progress bar. Pure view: never touches the store.
 */
export const applyNodeOverlay = (
  nodeElement: SVGGElement, state: NodeState | undefined, size: { width: number; height: number }
): void => {
  Array.from(nodeElement.children).filter(child => child.classList.contains(LAYER_CLASS)).forEach(child => child.remove());
  if (!state || state.status === 'idle' && state.label === undefined && state.progress === undefined) {
    nodeElement.removeAttribute('data-run-status');
    return;
  }
  nodeElement.setAttribute('data-run-status', state.status);
  nodeElement.appendChild(buildLayer(state, size));
};

const PRESENCE_CLASS = 'vbs-node-presence';

/** Draws collaborator selections on a node: outline in the first peer's colour plus their names. */
export const applyPresenceOverlay = (
  nodeElement: SVGGElement, peers: readonly { readonly name: string; readonly color: string }[], size: { width: number; height: number }
): void => {
  Array.from(nodeElement.children).filter(child => child.classList.contains(PRESENCE_CLASS)).forEach(child => child.remove());
  const first = peers[0];
  if (!first) {
    nodeElement.removeAttribute('data-presence');
    return;
  }
  nodeElement.setAttribute('data-presence', peers.map(p => p.name).join(', '));
  const layer = svg('g', { class: PRESENCE_CLASS, 'pointer-events': 'none' });
  layer.appendChild(svg('rect', {
    x: '-6', y: '-6', width: String(size.width + 12), height: String(size.height + 12), rx: '10',
    fill: 'none', stroke: first.color, 'stroke-width': '2', 'stroke-dasharray': '2 3',
  }));
  const names = svg('text', { x: '0', y: String(size.height + 20), 'font-size': '11', fill: first.color });
  names.textContent = peers.map(p => p.name).join(', ');
  layer.appendChild(names);
  nodeElement.appendChild(layer);
};

/** Marks a link path active (animated dashes) or idle. */
export const applyEdgeOverlay = (path: Element, active: boolean): void => {
  path.querySelector('animate.vbs-edge-flow')?.remove();
  if (!active) {
    path.removeAttribute('data-active');
    path.removeAttribute('stroke-dasharray');
    return;
  }
  path.setAttribute('data-active', 'true');
  path.setAttribute('stroke-dasharray', '8 4');
  const flow = svg('animate', {
    class: 'vbs-edge-flow', attributeName: 'stroke-dashoffset', from: '24', to: '0', dur: '0.8s', repeatCount: 'indefinite',
  });
  path.appendChild(flow);
};
