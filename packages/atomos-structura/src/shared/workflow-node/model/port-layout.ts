// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';

export interface NodeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PortPlacement {
  readonly port: PortSpec;
  /** Position relative to the node origin (top-left). */
  readonly local: { readonly x: number; readonly y: number };
  readonly edge: 'left' | 'right';
  readonly index: number;
}

/**
 * Evenly spaces ports along the node sides: inputs on the left edge,
 * outputs on the right edge, in declaration order.
 */
export const layoutPorts = (
  ports: readonly PortSpec[],
  size: { readonly width: number; readonly height: number }
): readonly PortPlacement[] => {
  const inputs = ports.filter(p => p.direction === 'in');
  const outputs = ports.filter(p => p.direction === 'out');
  const place = (group: readonly PortSpec[], edge: 'left' | 'right'): PortPlacement[] =>
    group.map((port, index) => ({
      port,
      edge,
      index,
      local: {
        x: edge === 'left' ? 0 : size.width,
        y: (size.height * (index + 1)) / (group.length + 1),
      },
    }));
  return [...place(inputs, 'left'), ...place(outputs, 'right')];
};

/** Absolute (canvas) position of one port, or null when the node has no such port. */
export const computePortWorldPosition = (
  ports: readonly PortSpec[],
  portId: string,
  rect: NodeRect
): { x: number; y: number; edge: 'left' | 'right' } | null => {
  const placement = layoutPorts(ports, rect).find(p => p.port.id === portId);
  if (!placement) return null;
  return { x: rect.x + placement.local.x, y: rect.y + placement.local.y, edge: placement.edge };
};
