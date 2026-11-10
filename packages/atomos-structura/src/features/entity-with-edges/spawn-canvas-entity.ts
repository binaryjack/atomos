// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createSignal } from '@atomos-web/prime';
import type { Entity } from '@atomos-web/structura-core';
import type { CanvasAdapter } from '../../shared/core/adapters/canvas-adapter.js';
import { createLegacyEntityStoreBridge, createLegacyStorageProviderBridge } from '../../shared/core/adapters/legacy-property-bridge.js';
import type { DomainEntity, DomainLink } from '../../shared/core/domain/entity-aggregate.js';
import type { EntityInstance } from '../../shared/core/types/entity-instance.types.js';
import { DEFAULT_GLOBAL_CONFIG } from '../../shared/core/types/global-config.types.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { getCanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import { visibleEndpoint } from '../../shared/workflow-canvas/group-model.js';
import { type AnchorSide, anchorSide, resolveAnchorPosition } from '../../shared/workflow-node/model/resolve-anchor-position.js';
import { createDemoEntity } from './create-demo-entity.js';
import { createGeometryPersistence } from './create-geometry-persistence.js';

const SIDES: readonly AnchorSide[] = ['top', 'bottom', 'left', 'right'];

/** Custom body renderer of the entity's node type, when the type defines one. */
const resolveRenderer = (instanceId: string, entity: DomainEntity) => {
  const definition = entity.nodeType ? getCanvasRuntime(instanceId).nodeTypes.get(entity.nodeType) : undefined;
  const render = definition?.render;
  if (!render || !definition) return undefined;
  return (size: { width: number; height: number }) => render({
    nodeId: entity.id, type: definition.type, label: entity.name, config: entity.config ?? {}, ports: entity.ports ?? [], size,
  });
};

/** Builds the interactive SVG node for a domain entity (ports, custom body, debounced persistence). */
export const spawnCanvasEntity = (
  entity: DomainEntity, workspace: WorkspaceManager, adapter: CanvasAdapter, instanceId: string
): EntityInstance => {
  const position = createSignal({ x: entity.position.x, y: entity.position.y });
  const dimensions = createSignal({ width: entity.dimensions.width, height: entity.dimensions.height });
  const stopPersistence = createGeometryPersistence(entity.id, adapter, position, dimensions);
  const demo = createDemoEntity({
    instanceId,
    id: entity.id,
    name: entity.name,
    shape: entity.shape,
    color: entity.color,
    ports: entity.ports ?? [],
    renderBody: resolveRenderer(instanceId, entity),
    entityStore: createLegacyEntityStoreBridge(entity.id, instanceId),
    globalConfig: createSignal(DEFAULT_GLOBAL_CONFIG),
    position,
    dimensions,
    workspace,
    storageProvider: createLegacyStorageProviderBridge<Entity>(instanceId),
    isReadonly: workspace.isReadonly?.() ?? false,
  });
  if (entity.nodeType) demo.element.setAttribute('data-node-type', entity.nodeType);
  demo.edgeElements.forEach(el => workspace.appendToCanvas(el));
  return { ...demo.instance, cleanup: () => { stopPersistence(); demo.instance.cleanup(); } };
};

const legacySide = (anchorId: string, fallback: AnchorSide): AnchorSide =>
  SIDES.find(side => anchorId.endsWith(`-anchor-${side}`)) ?? fallback;

const endpoint = (entity: DomainEntity, anchorId: string, fallback: AnchorSide) => {
  const side = anchorSide(anchorId, entity.ports, legacySide(anchorId, fallback));
  const rect = { ...entity.position, ...entity.dimensions };
  return { side, position: resolveAnchorPosition(rect, side, anchorId, entity.ports) };
};

/**
 * Draws a persisted link (port-aware endpoints). Endpoints hidden inside a collapsed group are
 * drawn to that group's boundary proxy port; links internal to a collapsed group are not drawn.
 * `replace` first removes the drawn link.
 */
export const restoreDomainLink = (
  workspace: WorkspaceManager, adapter: CanvasAdapter, link: DomainLink, replace: boolean
): void => {
  const all = adapter.getAllEntities();
  const src = visibleEndpoint(all, link.sourceEntityId, link.sourceAnchorId, 'out');
  const dst = visibleEndpoint(all, link.targetEntityId, link.targetAnchorId, 'in');
  const source = adapter.getEntity(src.entityId);
  const target = adapter.getEntity(dst.entityId);
  if (replace) workspace.removeLinkById(link.id, true);
  if (!source || !target || src.entityId === dst.entityId) return;
  const from = endpoint(source, src.anchorId, 'right');
  const to = endpoint(target, dst.anchorId, 'left');
  workspace.restoreLink(
    link.id,
    src.anchorId, from.position, src.entityId, from.side,
    dst.anchorId, to.position, dst.entityId, to.side,
  );
};
