// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { parsePortAnchorId, toPortAnchorId } from '../../workflow-node/model/port-anchor.js';
import type { DocumentViewport, WorkflowDocumentEdge, WorkflowDocumentNode } from './document.types.js';

/** Runtime shape of entities stored in the Redux schema (DomainEntity fields + Entity fields). */
export type StoredEntity = Entity & {
  readonly color?: string;
  readonly description?: string;
};

const defined = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };

export const entityToDocumentNode = (entity: StoredEntity): WorkflowDocumentNode => ({
  id: entity.id,
  ...defined('type', entity.nodeType),
  label: entity.name,
  position: { x: Number(entity.position.x) || 0, y: Number(entity.position.y) || 0 },
  size: { width: Number(entity.dimensions.width) || 200, height: Number(entity.dimensions.height) || 100 },
  config: { ...(entity.config ?? {}) },
  metadata: { ...(entity.metadata ?? {}) },
  ports: [...(entity.ports ?? [])],
  ...(entity.properties.length > 0 ? { properties: [...entity.properties] } : {}),
  ...defined('shape', entity.shape === undefined ? undefined : String(entity.shape)),
  ...defined('color', entity.color),
  ...defined('description', entity.description),
  ...defined('collapsed', entity.collapsed),
});

export const linkToDocumentEdge = (link: LinkProps): WorkflowDocumentEdge => ({
  id: link.id,
  source: link.leftEntityId,
  target: link.rightEntityId,
  ...defined('sourcePortId', link.sourcePortId ?? parsePortAnchorId(link.leftAnchorId)?.portId),
  ...defined('targetPortId', link.targetPortId ?? parsePortAnchorId(link.rightAnchorId)?.portId),
  sourceAnchorId: link.leftAnchorId,
  targetAnchorId: link.rightAnchorId,
  sourceCardinality: link.leftCardinality,
  targetCardinality: link.rightCardinality,
  ...defined('sourceProperty', link.leftProperty),
  ...defined('targetProperty', link.rightProperty),
  renderType: link.renderType,
  ...defined('direction', link.direction),
});

export const documentNodeToEntity = (node: WorkflowDocumentNode, now: number): Entity => {
  const stored: StoredEntity = {
    id: node.id,
    code: node.id,
    name: node.label,
    createdAt: now,
    updatedAt: now,
    properties: [...(node.properties ?? [])],
    position: { ...node.position },
    dimensions: { ...node.size },
    edges: [],
    config: { ...node.config },
    metadata: { ...node.metadata },
    ports: [...node.ports],
    ...defined('nodeType', node.type),
    ...defined('color', node.color),
    ...defined('description', node.description),
    ...defined('collapsed', node.collapsed),
  };
  return node.shape === undefined ? stored : ({ ...stored, shape: node.shape } as unknown as Entity);
};

export const documentEdgeToLink = (edge: WorkflowDocumentEdge): LinkProps => ({
  id: edge.id,
  leftEntityId: edge.source,
  rightEntityId: edge.target,
  leftAnchorId: edge.sourcePortId ? toPortAnchorId(edge.source, edge.sourcePortId) : edge.sourceAnchorId ?? `${edge.source}-anchor-right`,
  rightAnchorId: edge.targetPortId ? toPortAnchorId(edge.target, edge.targetPortId) : edge.targetAnchorId ?? `${edge.target}-anchor-left`,
  leftCardinality: edge.sourceCardinality ?? '1',
  rightCardinality: edge.targetCardinality ?? '1',
  renderType: edge.renderType ?? 'bezier',
  ...defined('sourcePortId', edge.sourcePortId),
  ...defined('targetPortId', edge.targetPortId),
  ...defined('leftProperty', edge.sourceProperty),
  ...defined('rightProperty', edge.targetProperty),
  ...defined('direction', edge.direction),
});

export const viewportToDocument = (viewport: { pan: { x: number; y: number }; zoom: number } | undefined): DocumentViewport => ({
  x: Number(viewport?.pan?.x) || 0,
  y: Number(viewport?.pan?.y) || 0,
  zoom: Number(viewport?.zoom) > 0 ? Number(viewport?.zoom) : 1,
});

export const documentToViewport = (viewport: DocumentViewport): { pan: { x: number; y: number }; zoom: number } => ({
  pan: { x: viewport.x, y: viewport.y },
  zoom: viewport.zoom,
});
