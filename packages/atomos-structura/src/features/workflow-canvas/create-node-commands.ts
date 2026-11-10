// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps, PortSpec } from '@atomos-web/structura-core';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import type { CanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import { gateConnection } from '../../shared/workflow-canvas/connection-gate.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import { GROUP_NODE_TYPE } from '../../shared/workflow-canvas/group-model.js';
import type { PortRef } from '../../shared/workflow-canvas/connection-validation.types.js';
import { parsePortAnchorId, toPortAnchorId } from '../../shared/workflow-node/model/port-anchor.js';
import type { AddNodeInput } from '../../shared/workflow-node/model/node-type.types.js';

export type ConnectResult = { readonly ok: true; readonly edgeId: string } | { readonly ok: false; readonly reason: string };

export interface NodeCommands {
  readonly addNode: (input: AddNodeInput) => string;
  readonly updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  readonly connect: (source: PortRef, target: PortRef) => ConnectResult;
  readonly removeNodes: (nodeIds: readonly string[]) => void;
}

const randomSuffix = (): string => Math.random().toString(36).slice(2, 10);

const defaultSize = (ports: readonly PortSpec[]) => {
  const rows = Math.max(ports.filter(p => p.direction === 'in').length, ports.filter(p => p.direction === 'out').length, 1);
  return { width: 220, height: Math.max(100, 40 + rows * 28) };
};

/** Links whose typed endpoint no longer exists on the node after a ports change. */
const danglingLinks = (links: readonly LinkProps[], nodeId: string, ports: readonly PortSpec[]): LinkProps[] => {
  const ids = new Set(ports.map(p => p.id));
  const lost = (entityId: string, anchorId: string): boolean => {
    const ref = parsePortAnchorId(anchorId);
    return entityId === nodeId && ref !== null && !ids.has(ref.portId);
  };
  return links.filter(l => lost(l.leftEntityId, l.leftAnchorId) || lost(l.rightEntityId, l.rightAnchorId));
};

export const createNodeCommands = (
  instanceId: string, store: ReduxStore, runtime: CanvasRuntime, afterStructuralChange: () => void
): NodeCommands => {
  const manager = getEntityManager(instanceId);

  const addNode = (input: AddNodeInput): string => {
    const definition = runtime.nodeTypes.get(input.type);
    if (!definition) throw new Error(`Unknown node type '${input.type}'. Register it with canvas.nodeTypes.register().`);
    const id = input.id ?? `${input.type}-${randomSuffix()}`;
    if (manager.getEntity(id)) throw new Error(`A node with id '${id}' already exists`);
    if (input.parentId && manager.getEntity(input.parentId)?.nodeType !== GROUP_NODE_TYPE) {
      throw new Error(`Parent '${input.parentId}' is not a group node`);
    }
    const config = { ...(input.config ?? {}) };
    const ports = runtime.nodeTypes.resolvePorts(input.type, config);
    const size = input.size ?? definition.defaultSize ?? defaultSize(ports);
    manager.createEntity(id, input.label ?? definition.label, { ...input.position }, { ...size }, {
      nodeType: input.type, config, ports, ...(input.metadata ? { metadata: { ...input.metadata } } : {}),
      ...(input.parentId ? { parentId: input.parentId } : {}),
    });
    return id;
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, unknown>): void => {
    const schema = getActiveSchema(store.get_state());
    const entity = schema?.entities.find(e => e.id === nodeId);
    if (!schema || !entity) throw new Error(`Unknown node '${nodeId}'`);
    const nextConfig = { ...config };
    const ports = entity.nodeType && runtime.nodeTypes.has(entity.nodeType)
      ? runtime.nodeTypes.resolvePorts(entity.nodeType, nextConfig) : entity.ports ?? [];
    store.transaction('Update node config', () => {
      const updated: Entity = { ...entity, config: nextConfig, ports: [...ports], updatedAt: Date.now() };
      store.dispatch({ type: 'entity-updated', schema_id: schema.id, entity: updated });
      danglingLinks(schema.links, nodeId, ports).forEach(link => store.dispatch({ type: 'link-removed', schema_id: schema.id, link_id: link.id }));
    });
    afterStructuralChange();
  };

  const connect = (source: PortRef, target: PortRef): ConnectResult => {
    const from = { entityId: source.nodeId, anchorId: toPortAnchorId(source.nodeId, source.portId) };
    const to = { entityId: target.nodeId, anchorId: toPortAnchorId(target.nodeId, target.portId) };
    const verdict = gateConnection(instanceId, from, to);
    if (!verdict.ok) return verdict;
    const edgeId = `link-${source.nodeId}-${source.portId}-${target.nodeId}-${target.portId}-${randomSuffix()}`;
    manager.createLink(edgeId, from.anchorId, to.anchorId, source.nodeId, target.nodeId);
    return { ok: true, edgeId };
  };

  const removeNodes = (nodeIds: readonly string[]): void => {
    if (nodeIds.length === 0) return;
    store.transaction(nodeIds.length > 1 ? 'Delete nodes' : 'Delete node', () => nodeIds.forEach(id => manager.removeEntity(id)));
    runtime.selection.remove(nodeIds);
  };

  return { addNode, updateNodeConfig, connect, removeNodes };
};
