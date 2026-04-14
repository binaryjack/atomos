/**
 * Domain Layer - Entity Aggregate Root
 * Manages entity lifecycle and business rules in pure domain logic
 */
import type { Property } from '@atomos-web/structura-core'

export interface EntityPosition {
  readonly x: number;
  readonly y: number;
}

export interface EntityDimensions {
  readonly width: number;
  readonly height: number;
}

export interface DomainEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly shape?: string | undefined;
  readonly color?: string | undefined;
  readonly properties: readonly Property[];
  readonly collapsed?: boolean | undefined;
  readonly position: EntityPosition;
  readonly dimensions: EntityDimensions;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface EntityRepository {
  readonly getById: (id: string) => DomainEntity | undefined;
  readonly save: (entity: DomainEntity) => void;
  readonly remove: (id: string) => void;
  readonly getAll: () => readonly DomainEntity[];
}

export const createEntityAggregate = function(
  id: string,
  name: string,
  position: EntityPosition = { x: 100, y: 100 },
  dimensions: EntityDimensions = { width: 200, height: 150 },
  options?: { shape?: string; color?: string; description?: string }
): DomainEntity {
  const now = Date.now();
  
  return {
    id,
    name,
    ...(options?.description ? { description: options.description } : {}),
    shape: options?.shape ?? 'box',
    color: options?.color ?? 'var(--vbs-bg-panel, #111111)',
    properties: [],
    position,
    dimensions, 
    createdAt: now,
    updatedAt: now
  };
};

export const moveEntity = function(
  entity: DomainEntity, 
  newPosition: EntityPosition
): DomainEntity {
  return {
    ...entity,
    position: newPosition,
    updatedAt: Date.now()
  };
};

export const resizeEntity = function(
  entity: DomainEntity,
  newDimensions: EntityDimensions  
): DomainEntity {
  return {
    ...entity,
    dimensions: newDimensions,
    updatedAt: Date.now()
  };
};

export const updateEntityProperties = function(
  entity: DomainEntity,
  properties: readonly Property[]
): DomainEntity {
  return {
    ...entity,
    properties,
    updatedAt: Date.now()
  };
};

export const updateEntityName = function(
  entity: DomainEntity,
  name: string
): DomainEntity {
  return {
    ...entity,
    name,
    updatedAt: Date.now()
  };
};

export const updateEntityMetadata = function(
  entity: DomainEntity,
  metadata: { name?: string; description?: string; shape?: string; color?: string }
): DomainEntity {
  return {
    ...entity,
    ...metadata,
    updatedAt: Date.now()
  };
};

export const updateEntityCollapse = function(
  entity: DomainEntity,
  collapsed: boolean
): DomainEntity {
  return {
    ...entity,
    collapsed,
    updatedAt: Date.now()
  };
};

// Link Domain Entity - Same pattern as Entity
export interface DomainLink {
  readonly id: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly sourceCardinality?: string | undefined;
  readonly targetCardinality?: string | undefined;
  readonly sourceProperty?: string | undefined;
  readonly targetProperty?: string | undefined;
  readonly renderType?: string | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface LinkRepository {
  readonly getById: (id: string) => DomainLink | undefined;
  readonly save: (link: DomainLink) => void;
  readonly remove: (id: string) => void;
  readonly getAll: () => readonly DomainLink[];
}

export const createLinkAggregate = function(
  id: string,
  sourceAnchorId: string,
  targetAnchorId: string,
  sourceEntityId: string,
  targetEntityId: string,
  sourceCardinality?: string,
  targetCardinality?: string,
  sourceProperty?: string,
  targetProperty?: string,
  renderType?: string
): DomainLink {
  const now = Date.now();

  return {
    id,
    sourceAnchorId,
    targetAnchorId,
    sourceEntityId,
    targetEntityId,
    sourceCardinality: sourceCardinality ?? '1',
    targetCardinality: targetCardinality ?? '1',
    sourceProperty,
    targetProperty,
    renderType,
    createdAt: now,
    updatedAt: now
  };
};

export const updateLinkProperties = function(
  link: DomainLink,
  updates: {
    readonly sourceCardinality?: string | undefined;
    readonly targetCardinality?: string | undefined;
    readonly sourceProperty?: string | undefined;
    readonly targetProperty?: string | undefined;
    readonly renderType?: string | undefined;
  }
): DomainLink {
  return {
    ...link,
    sourceCardinality: updates.sourceCardinality ?? link.sourceCardinality,
    targetCardinality: updates.targetCardinality ?? link.targetCardinality,
    sourceProperty: updates.sourceProperty !== undefined ? updates.sourceProperty : link.sourceProperty,
    targetProperty: updates.targetProperty !== undefined ? updates.targetProperty : link.targetProperty,
    renderType: updates.renderType !== undefined ? updates.renderType : link.renderType,
    updatedAt: Date.now()
  };
};

export const updateLinkEndpoints = function(
  link: DomainLink,
  sourceAnchorId: string,
  targetAnchorId: string,
  sourceEntityId: string,
  targetEntityId: string
): DomainLink {
  return {
    ...link,
    sourceAnchorId,
    targetAnchorId,
    sourceEntityId,
    targetEntityId,
    updatedAt: Date.now() 
  };
};


