// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { copySubgraph, pasteSubgraph } from '../../shared/core/clipboard.js';
import type { DomainEntity } from '../../shared/core/domain/entity-aggregate.js';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { CanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';

export interface SelectionCommands {
  /** Copies the selected nodes and the links between them. Returns the number of copied nodes. */
  readonly copySelection: () => number;
  /** Pastes the clipboard with new ids (links between copied nodes kept) and selects the copies. */
  readonly paste: () => readonly string[];
  readonly selectAll: () => void;
}

const PASTE_OFFSET = 32;

export const createSelectionCommands = (instanceId: string, runtime: CanvasRuntime): SelectionCommands => {
  const manager = getEntityManager(instanceId);

  const copySelection = (): number => {
    const ids = new Set(runtime.selection.get());
    const entities = Array.from(ids).flatMap(id => {
      const entity: DomainEntity | undefined = manager.getEntity(id);
      return entity ? [entity] : [];
    });
    if (entities.length === 0) return 0;
    const links = manager.getAllLinks()
      .filter(link => ids.has(link.sourceEntityId) && ids.has(link.targetEntityId))
      .map(({ id, sourceEntityId, targetEntityId, sourceAnchorId, targetAnchorId }) =>
        ({ id, sourceEntityId, targetEntityId, sourceAnchorId, targetAnchorId }));
    copySubgraph({ entities, links });
    return entities.length;
  };

  const paste = (): readonly string[] => {
    const created = pasteSubgraph(manager, PASTE_OFFSET, PASTE_OFFSET);
    if (created.length > 0) runtime.selection.set(created);
    return created;
  };

  const selectAll = (): void => runtime.selection.set(manager.getAllEntities().map(entity => entity.id));

  return { copySelection, paste, selectAll };
};
