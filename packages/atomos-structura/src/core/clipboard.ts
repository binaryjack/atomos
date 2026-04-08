import type { DomainEntity } from './domain/entity-aggregate.js';
import type { EntityManager } from './presentation/entity-manager.js';

let _clipboard: DomainEntity | null = null;

export const copyEntity = (entity: DomainEntity): void => {
  _clipboard = entity;
};

export const hasClipboard = (): boolean => _clipboard !== null;

export const pasteEntity = (entityManager: EntityManager, offsetX = 24, offsetY = 24): void => {
  if (!_clipboard) return;
  const src = _clipboard;
  const id = crypto.randomUUID();
  const metadata: { shape?: string; color?: string; description?: string } = {};
  if (src.shape !== undefined) metadata.shape = src.shape;
  if (src.color !== undefined) metadata.color = src.color;
  if (src.description !== undefined) metadata.description = src.description;
  entityManager.createEntity(
    id,
    `${src.name} (copy)`,
    { x: src.position.x + offsetX, y: src.position.y + offsetY },
    src.dimensions,
    metadata,
  );
  if (src.properties.length > 0) {
    entityManager.updateEntityProperties(id, src.properties);
  }
};
