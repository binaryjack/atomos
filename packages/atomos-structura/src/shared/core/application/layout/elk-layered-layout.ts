// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity } from '@atomos-web/structura-core';
import ELK from 'elkjs/lib/elk.bundled.js';
import { getActiveSchema } from '../../../workflow-canvas/connection-graph.js';
import { descendantsOf } from '../../../workflow-canvas/group-model.js';
import { getInstanceReduxStore } from '../../create-redux-store.js';
import type { EntityManager } from '../../presentation/entity-manager.js';
import { autoRouteLinks } from '../dag-service.js';
import { buildElkGraph, type ElkLayoutSettings, readElkContainerSizes, readElkPositions } from './elk-graph.js';
import { LayoutRegistry, type LayoutStrategy } from './layout-strategy.js';

export type ElkLayoutResult =
  | { readonly applied: true; readonly moved: number }
  | { readonly applied: false; readonly reason: 'empty' | 'stale' };

const elk = new ELK();

/** Hidden descendants of collapsed groups follow their group by the same delta. */
const withHiddenDescendants = (
  positions: Map<string, { x: number; y: number }>,
  entities: readonly Entity[]
): Map<string, { x: number; y: number }> => {
  entities.filter(e => e.collapsed && positions.has(e.id)).forEach(group => {
    const target = positions.get(group.id) as { x: number; y: number };
    const dx = target.x - group.position.x;
    const dy = target.y - group.position.y;
    descendantsOf(entities, group.id).forEach(id => {
      const child = entities.find(e => e.id === id);
      if (child) positions.set(id, { x: child.position.x + dx, y: child.position.y + dy });
    });
  });
  return positions;
};

/**
 * ELK "layered" layout: port-aware (FIXED_ORDER, inputs west / outputs east), size-aware and
 * hierarchical (expanded groups lay out their children). Async-safe: if the document changed
 * while ELK was computing, nothing is written. Positions + link routing are ONE undo step.
 */
export const runElkLayout = async (
  entityManager: EntityManager, settings: ElkLayoutSettings = {}, amendHistory?: number
): Promise<ElkLayoutResult> => {
  const store = getInstanceReduxStore(entityManager.instanceId);
  const before = getActiveSchema(store.get_state());
  if (!before || before.entities.length === 0) return { applied: false, reason: 'empty' };
  const laidOut = await elk.layout(buildElkGraph(before.entities, before.links, settings));
  const now = getActiveSchema(store.get_state());
  if (!now || now.entities !== before.entities || now.links !== before.links) return { applied: false, reason: 'stale' };
  const positions = withHiddenDescendants(readElkPositions(laidOut), before.entities);
  store.transaction('Auto layout', () => {
    positions.forEach((position, id) => entityManager.moveEntity(id, position));
    readElkContainerSizes(laidOut).forEach((size, id) => entityManager.resizeEntity(id, size));
    autoRouteLinks(entityManager);
  }, { amend: amendHistory });
  return { applied: true, moved: positions.size };
};

const settingsFrom = (options: Record<string, unknown> | undefined): ElkLayoutSettings => {
  const direction = options?.['direction'];
  return direction === 'DOWN' || direction === 'RIGHT' || direction === 'LEFT' || direction === 'UP' ? { direction } : {};
};

/** `options.amendHistory`: history entry to fold the layout into (e.g. the DAG import step). */
const amendFrom = (options: Record<string, unknown> | undefined): number | undefined => {
  const value = options?.['amendHistory'];
  return typeof value === 'number' ? value : undefined;
};

const createElkStrategy = (name: string): LayoutStrategy => ({
  name,
  execute: (entityManager, options) => runElkLayout(entityManager, settingsFrom(options), amendFrom(options)).then(
    () => undefined,
    (error: unknown) => console.error('[Structura] ELK layout failed:', error),
  ),
});

/** 'layered' is the canonical name; 'sugiyama' is kept as an alias for existing callers. */
LayoutRegistry.register(createElkStrategy('layered'));
LayoutRegistry.register(createElkStrategy('sugiyama'));
