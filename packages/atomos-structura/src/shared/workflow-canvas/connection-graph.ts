// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { ReduxState, SchemaModel } from '../types/redux-state.types.js';
import { parsePortAnchorId, type PortRef } from '../workflow-node/model/port-anchor.js';
import type { ConnectionGraph, ConnectionGraphNode } from './connection-validation.types.js';

/** Port reference of an anchor: typed ports map to their port id, legacy side anchors keep the anchor id. */
export const anchorToPortRef = (entityId: string, anchorId: string): PortRef => {
  const parsed = parsePortAnchorId(anchorId);
  return parsed && parsed.nodeId === entityId ? parsed : { nodeId: entityId, portId: anchorId };
};

const toNode = (entity: Entity): ConnectionGraphNode => ({
  id: entity.id,
  ports: entity.ports ?? [],
  ...(entity.nodeType !== undefined ? { nodeType: entity.nodeType } : {}),
});

const linkSource = (link: LinkProps): PortRef =>
  link.sourcePortId ? { nodeId: link.leftEntityId, portId: link.sourcePortId } : anchorToPortRef(link.leftEntityId, link.leftAnchorId);

const linkTarget = (link: LinkProps): PortRef =>
  link.targetPortId ? { nodeId: link.rightEntityId, portId: link.targetPortId } : anchorToPortRef(link.rightEntityId, link.rightAnchorId);

export const buildConnectionGraph = (schema: Pick<SchemaModel, 'entities' | 'links'> | undefined): ConnectionGraph => ({
  nodes: new Map((schema?.entities ?? []).map(entity => [entity.id, toNode(entity)])),
  edges: (schema?.links ?? []).map(link => ({ id: link.id, source: linkSource(link), target: linkTarget(link) })),
});

/** Active schema of the active canvas, or undefined when the state is empty. */
export const getActiveSchema = (state: ReduxState): SchemaModel | undefined => {
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  return canvas ? canvas.schemas[canvas.active_schema_id] : undefined;
};
