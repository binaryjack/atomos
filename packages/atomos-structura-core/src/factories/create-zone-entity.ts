import type { BoundaryType, Dimensions, Position, ZoneEntity } from '../types/entity.types.js';

export interface CreateZoneOptions {
  readonly id: string;
  readonly name: string;
  readonly code?: string;
  readonly position: Position;
  readonly dimensions: Dimensions;
  readonly boundaryType?: BoundaryType;
  readonly tintColor?: string;
  readonly containedEntityIds?: string[];
  readonly isLocked?: boolean;
}

export const createZoneEntity = (opts: CreateZoneOptions): ZoneEntity => {
  const boundaryType = opts.boundaryType ?? 'vpc';
  const tintColor = opts.tintColor ?? 'rgba(59, 130, 246, 0.08)';

  return {
    id: opts.id,
    code: opts.code ?? opts.id,
    name: opts.name,
    nodeType: 'zone',
    boundaryType,
    tintColor,
    containedEntityIds: opts.containedEntityIds ?? [],
    isLocked: opts.isLocked ?? false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    position: opts.position,
    dimensions: opts.dimensions,
    properties: [],
    edges: [],
    metadata: {
      isZone: true,
      boundaryType,
      tintColor,
    },
  };
};
