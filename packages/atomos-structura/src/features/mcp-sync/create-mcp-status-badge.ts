// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { McpStatus } from './mcp-transport.types.js';

const COLORS: Readonly<Record<McpStatus, string>> = {
  idle: '#52525b', connecting: '#eab308', connected: '#22c55e', reconnecting: '#f97316', disconnected: '#ef4444',
};

const LABELS: Readonly<Record<McpStatus, string>> = {
  idle: 'MCP: not connected', connecting: 'MCP: connecting…', connected: 'MCP: connected',
  reconnecting: 'MCP: reconnecting…', disconnected: 'MCP: disconnected',
};

export interface McpStatusBadge {
  readonly element: HTMLElement;
  readonly destroy: () => void;
}

/** Toolbar indicator of the MCP transport status (dot + accessible live label). */
export const createMcpStatusBadge = (
  initial: McpStatus, subscribe: (listener: (status: McpStatus) => void) => () => void
): McpStatusBadge => {
  const element = document.createElement('span');
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:36px;';
  const dot = document.createElement('span');
  dot.style.cssText = 'width:9px;height:9px;border-radius:50%;display:block;';
  element.appendChild(dot);
  const render = (status: McpStatus): void => {
    element.dataset.status = status;
    element.title = LABELS[status];
    element.setAttribute('aria-label', LABELS[status]);
    dot.style.background = COLORS[status];
  };
  render(initial);
  const unsubscribe = subscribe(render);
  return { element, destroy: () => { unsubscribe(); element.remove(); } };
};

/** Appends the badge to `host` (when given) and returns the cleanups to register. */
export const mountMcpStatusBadge = (
  sync: { readonly status: () => McpStatus; readonly onStatus: (listener: (status: McpStatus) => void) => () => void },
  host: HTMLElement | null
): Array<() => void> => {
  if (!host) return [];
  const badge = createMcpStatusBadge(sync.status(), sync.onStatus);
  host.appendChild(badge.element);
  return [badge.destroy];
};
