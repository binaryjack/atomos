// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity } from '@atomos-web/structura-core';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { ReduxStore, SchemaModel } from '../../shared/types/redux-state.types.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import { ancestorsOf, computeProxyPorts, GROUP_NODE_TYPE } from '../../shared/workflow-canvas/group-model.js';

export interface GroupCommands {
  /** Wraps the given nodes in a new group sized to their bounds. Returns the group id. */
  readonly createGroup: (nodeIds: readonly string[], label?: string) => string;
  /** Moves a node into a group (`null` = top level). Rejects non-groups and containment cycles. */
  readonly setNodeParent: (nodeId: string, parentId: string | null) => void;
  /** Collapses / expands a group; collapsed groups expose boundary proxy ports for crossing links. */
  readonly setGroupCollapsed: (groupId: string, collapsed: boolean) => void;
}

const COLLAPSED_SIZE = { width: 240, height: 72 };
const PADDING = 32;

const requireSchema = (store: ReduxStore): SchemaModel => {
  const schema = getActiveSchema(store.get_state());
  if (!schema) throw new Error('No active schema');
  return schema;
};

const requireGroup = (schema: SchemaModel, groupId: string): Entity => {
  const group = schema.entities.find(e => e.id === groupId);
  if (!group || group.nodeType !== GROUP_NODE_TYPE) throw new Error(`'${groupId}' is not a group node`);
  return group;
};

const replaceEntity = (store: ReduxStore, schemaId: string, entity: Entity): void =>
  store.dispatch({ type: 'entity-updated', schema_id: schemaId, entity: { ...entity, updatedAt: Date.now() } });

const boundsOf = (entities: readonly Entity[]) => {
  const xs = entities.flatMap(e => [e.position.x, e.position.x + e.dimensions.width]);
  const ys = entities.flatMap(e => [e.position.y, e.position.y + e.dimensions.height]);
  return { x: Math.min(...xs) - PADDING, y: Math.min(...ys) - PADDING * 2, right: Math.max(...xs) + PADDING, bottom: Math.max(...ys) + PADDING };
};

const collapsedEntity = (group: Entity, schema: SchemaModel, collapsed: boolean): Entity => {
  const expanded = group.metadata?.['expandedSize'] as { width: number; height: number } | undefined;
  const entities = schema.entities.map(e => (e.id === group.id ? { ...e, collapsed } : e));
  return {
    ...group,
    collapsed,
    ports: collapsed ? computeProxyPorts(entities, schema.links, group.id) : [],
    dimensions: collapsed ? COLLAPSED_SIZE : expanded ?? group.dimensions,
    metadata: { ...(group.metadata ?? {}), ...(collapsed ? { expandedSize: group.dimensions } : {}) },
  };
};

export const createGroupCommands = (instanceId: string, store: ReduxStore, afterChange: () => void): GroupCommands => {
  const setNodeParent = (nodeId: string, parentId: string | null): void => {
    const schema = requireSchema(store);
    const node = schema.entities.find(e => e.id === nodeId);
    if (!node) throw new Error(`Unknown node '${nodeId}'`);
    if (parentId !== null) {
      requireGroup(schema, parentId);
      if (parentId === nodeId || ancestorsOf(schema.entities, parentId).includes(nodeId)) throw new Error('Containment cycle');
    }
    const { parentId: _previous, ...rest } = node;
    replaceEntity(store, schema.id, parentId === null ? rest : { ...rest, parentId });
    afterChange();
  };

  const createGroup = (nodeIds: readonly string[], label = 'Group'): string => {
    const schema = requireSchema(store);
    const members = schema.entities.filter(e => nodeIds.includes(e.id));
    if (members.length === 0) throw new Error('createGroup needs at least one existing node');
    const box = boundsOf(members);
    const groupId = `group-${Math.random().toString(36).slice(2, 10)}`;
    store.transaction('Group nodes', () => {
      getEntityManager(instanceId).createEntity(groupId, label, { x: box.x, y: box.y },
        { width: box.right - box.x, height: box.bottom - box.y }, { nodeType: GROUP_NODE_TYPE, ports: [], config: {} });
      members.forEach(member => setNodeParent(member.id, groupId));
    });
    return groupId;
  };

  const setGroupCollapsed = (groupId: string, collapsed: boolean): void => {
    const schema = requireSchema(store);
    const group = requireGroup(schema, groupId);
    if (Boolean(group.collapsed) === collapsed) return;
    store.transaction(collapsed ? 'Collapse group' : 'Expand group', () => replaceEntity(store, schema.id, collapsedEntity(group, schema, collapsed)));
    afterChange();
  };

  return { createGroup, setNodeParent, setGroupCollapsed };
};
