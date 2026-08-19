import type { DomainEntity } from './domain/entity-aggregate.js';
import type { EntityManager } from './presentation/entity-manager.js';

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
  if (!_clipboard || _clipboard.entities.length === 0) return [];

  const oldToNewId = new Map<string, string>();
  const createdIds: string[] = [];

  // 1. Clone all entities with new IDs
  _clipboard.entities.forEach(src => {
    const newId = crypto.randomUUID();
    oldToNewId.set(src.id, newId);
    createdIds.push(newId);

    const metadata: { shape?: string; color?: string; description?: string } = {};
    if (src.shape !== undefined) metadata.shape = src.shape;
    if (src.color !== undefined) metadata.color = src.color;
    if (src.description !== undefined) metadata.description = src.description;

    entityManager.createEntity(
      newId,
      `${src.name} (copy)`,
      { x: src.position.x + offsetX, y: src.position.y + offsetY },
      src.dimensions,
      metadata,
    );

    if (src.properties.length > 0) {
      entityManager.updateEntityProperties(newId, src.properties);
    }
  });

  // 2. Re-create internal links between copied entities
  _clipboard.links.forEach(link => {
    const newSourceId = oldToNewId.get(link.sourceEntityId);
    const newTargetId = oldToNewId.get(link.targetEntityId);

    if (newSourceId && newTargetId) {
      const linkId = crypto.randomUUID();
      const sAnchor = link.sourceAnchorId ?? `${newSourceId}-anchor-right`;
      const tAnchor = link.targetAnchorId ?? `${newTargetId}-anchor-left`;
      entityManager.createLink(linkId, sAnchor, tAnchor, newSourceId, newTargetId);
    }
  });

  return createdIds;
};

export const pasteEntity = (entityManager: EntityManager, offsetX = 24, offsetY = 24): void => {
  pasteSubgraph(entityManager, offsetX, offsetY);
};
