// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import { parsePortAnchorId } from './port-anchor.js';
import { computePortWorldPosition, type NodeRect } from './port-layout.js';

export type AnchorSide = 'top' | 'bottom' | 'left' | 'right';

/** Midpoint of one side of a rectangle (legacy ER anchors). */
export const sideAnchorPosition = (rect: NodeRect, side: AnchorSide): { x: number; y: number } => {
  switch (side) {
    case 'top': return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom': return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case 'left': return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right': return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
  }
};

/**
 * World position of a link endpoint. Typed port anchors (`${entityId}::${portId}`) resolve to
 * the port handle position; any other anchor resolves to the midpoint of `side`.
 */
export const resolveAnchorPosition = (
  rect: NodeRect,
  side: AnchorSide,
  anchorId: string | undefined,
  ports: readonly PortSpec[] | undefined
): { x: number; y: number } => {
  const parsed = parsePortAnchorId(anchorId);
  if (parsed && ports && ports.length > 0) {
    const position = computePortWorldPosition(ports, parsed.portId, rect);
    if (position) return { x: position.x, y: position.y };
  }
  return sideAnchorPosition(rect, side);
};

/** Routing side of an anchor: inputs enter on the left, outputs leave on the right. */
export const anchorSide = (anchorId: string | undefined, ports: readonly PortSpec[] | undefined, fallback: AnchorSide): AnchorSide => {
  const parsed = parsePortAnchorId(anchorId);
  const port = parsed ? ports?.find(p => p.id === parsed.portId) : undefined;
  if (!port) return fallback;
  return port.direction === 'in' ? 'left' : 'right';
};
