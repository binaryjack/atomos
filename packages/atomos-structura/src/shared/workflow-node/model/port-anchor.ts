// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Separator between entity id and port id in a port anchor / DOM id. */
export const PORT_ANCHOR_SEPARATOR = '::';

/** A reference to one typed port of one node. */
export interface PortRef {
  readonly nodeId: string;
  readonly portId: string;
}

/** Stable anchor id (and DOM id) of a port handle: `${entityId}::${portId}`. */
export const toPortAnchorId = (entityId: string, portId: string): string =>
  `${entityId}${PORT_ANCHOR_SEPARATOR}${portId}`;

/** Parses a port anchor id. Returns null for legacy side anchors (`${id}-anchor-${side}`). */
export const parsePortAnchorId = (anchorId: string | undefined): PortRef | null => {
  if (!anchorId) return null;
  const index = anchorId.lastIndexOf(PORT_ANCHOR_SEPARATOR);
  if (index <= 0) return null;
  const portId = anchorId.slice(index + PORT_ANCHOR_SEPARATOR.length);
  if (portId.length === 0) return null;
  return { nodeId: anchorId.slice(0, index), portId };
};

export const isPortAnchorId = (anchorId: string | undefined): boolean =>
  parsePortAnchorId(anchorId) !== null;

/** Derives `sourcePortId` / `targetPortId` link fields from anchor ids. */
export const portIdsFromAnchors = (
  sourceAnchorId: string | undefined,
  targetAnchorId: string | undefined
): { sourcePortId?: string; targetPortId?: string } => {
  const source = parsePortAnchorId(sourceAnchorId);
  const target = parsePortAnchorId(targetAnchorId);
  return {
    ...(source ? { sourcePortId: source.portId } : {}),
    ...(target ? { targetPortId: target.portId } : {}),
  };
};
