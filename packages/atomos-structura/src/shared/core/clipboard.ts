import type { DomainEntity } from './domain/entity-aggregate.js';
import type { EntityManager } from './presentation/entity-manager.js';
import { remapSubgraph } from '../workflow-canvas/remap-subgraph.js';
import { getInstanceReduxStore } from './create-redux-store.js';
import { toCreationOptions } from './domain/entity-options.types.js';

export interface ClipboardLink {
  readonly id?: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly sourceAnchorId?: string;
  readonly targetAnchorId?: string;
  readonly direction?: string;
  readonly label?: string;
}

export interface ClipboardSubgraph {
  readonly entities: readonly DomainEntity[];
  readonly links: readonly ClipboardLink[];
}

let _clipboard: ClipboardSubgraph | null = null;

export const copyEntity = (entity: DomainEntity): void => {
  _clipboard = {
    entities: [entity],
    links: [],
  };
};

export const copySubgraph = (subgraph: ClipboardSubgraph): void => {
  _clipboard = {
    entities: [...subgraph.entities],
    links: [...subgraph.links],
  };
};

export const hasClipboard = (): boolean => _clipboard !== null && _clipboard.entities.length > 0;

export const getClipboard = (): ClipboardSubgraph | null => _clipboard;

export const pasteSubgraph = (
  entityManager: EntityManager,
  offsetX = 24,
  offsetY = 24
): string[] => {
  const snapshot = _clipboard;
  if (!snapshot || snapshot.entities.length === 0) return [];
  // New ids, remapped port/side anchors, links kept only between copied nodes — ONE undo step.
  return getInstanceReduxStore(entityManager.instanceId).transaction('Paste', () => {
    const copy = remapSubgraph(snapshot, () => crypto.randomUUID(), { x: offsetX, y: offsetY }, name => `${name} (copy)`);
    copy.entities.forEach(src => {
      entityManager.createEntity(src.id, src.name, src.position, src.dimensions, toCreationOptions(src));
      if (src.properties.length > 0) entityManager.updateEntityProperties(src.id, src.properties);
    });
    copy.links.forEach(link => entityManager.createLink(link.id, link.sourceAnchorId, link.targetAnchorId, link.sourceEntityId, link.targetEntityId));
    return copy.entities.map(entity => entity.id);
  });
};

export const pasteEntity = (entityManager: EntityManager, offsetX = 24, offsetY = 24): void => {
  pasteSubgraph(entityManager, offsetX, offsetY);
};
