import type { Entity } from '../types/entity.types.js';
import type { LinkProps } from '../types/link.types.js';

export interface ProposedDiff {
  readonly diffId: string;
  readonly schemaId: string;
  readonly rationale?: string;
  readonly addedEntities?: Entity[];
  readonly modifiedEntities?: Entity[];
  readonly deletedEntityIds?: string[];
  readonly addedLinks?: LinkProps[];
  readonly deletedLinkIds?: string[];
  readonly createdAt: number;
}

export interface DiffApplicationResult {
  readonly entities: Entity[];
  readonly links: LinkProps[];
  readonly appliedCount: number;
}

export const createProposedDiff = (
  schemaId: string,
  options: Partial<Omit<ProposedDiff, 'diffId' | 'schemaId' | 'createdAt'>>
): ProposedDiff => ({
  diffId: `diff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  schemaId,
  ...options,
  createdAt: Date.now(),
});

export const applyArchitectureDiff = (
  currentEntities: Entity[],
  currentLinks: LinkProps[],
  diff: ProposedDiff
): DiffApplicationResult => {
  let entities = [...currentEntities];
  let links = [...currentLinks];
  let count = 0;

  if (diff.deletedEntityIds?.length) {
    const toDelete = new Set(diff.deletedEntityIds);
    entities = entities.filter((e) => !toDelete.has(e.id));
    links = links.filter((l) => !toDelete.has(l.leftEntityId) && !toDelete.has(l.rightEntityId));
    count += diff.deletedEntityIds.length;
  }

  if (diff.deletedLinkIds?.length) {
    const toDeleteLinks = new Set(diff.deletedLinkIds);
    links = links.filter((l) => !toDeleteLinks.has(l.id));
    count += diff.deletedLinkIds.length;
  }

  if (diff.modifiedEntities?.length) {
    const modMap = new Map(diff.modifiedEntities.map((e) => [e.id, e]));
    entities = entities.map((e) => modMap.get(e.id) ?? e);
    count += diff.modifiedEntities.length;
  }

  if (diff.addedEntities?.length) {
    const existing = new Set(entities.map((e) => e.id));
    const toAdd = diff.addedEntities.filter((e) => !existing.has(e.id));
    entities = [...entities, ...toAdd];
    count += toAdd.length;
  }

  if (diff.addedLinks?.length) {
    const existingLinks = new Set(links.map((l) => l.id));
    const toAddLinks = diff.addedLinks.filter((l) => !existingLinks.has(l.id));
    links = [...links, ...toAddLinks];
    count += toAddLinks.length;
  }

  return { entities, links, appliedCount: count };
};
