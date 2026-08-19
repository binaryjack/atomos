import { createProperty } from '../../factories/create-property.js';
import type { DataType } from '../../shared/data-type.js';
import type { Entity } from '../../types/entity.types.js';
import type { LinkProps } from '../../types/link.types.js';
import type { Property } from '../../types/property.types.js';

export interface ParsedSchemaResult {
  readonly schema: {
    readonly id: string;
    readonly name: string;
    readonly entities: Entity[];
    readonly links: LinkProps[];
  };
}

const mapPrismaToDataType = (prismaType: string): DataType => {
  const clean = prismaType.replace('?', '').replace('[]', '').toLowerCase();
  switch (clean) {
    case 'int':
    case 'bigint':     return 'integer';
    case 'float':
    case 'decimal':    return 'float';
    case 'boolean':    return 'boolean';
    case 'datetime':   return 'date';
    case 'json':
    case 'bytes':
    case 'string':
    default:           return 'string';
  }
};

export const parsePrismaSchema = (prismaCode: string, schemaName = 'PrismaSchema'): ParsedSchemaResult => {
  const schemaId = `schema-${Date.now()}`;
  const entities: Entity[] = [];
  const links: LinkProps[] = [];

  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch: RegExpExecArray | null;

  interface ModelRelationField {
    readonly modelName: string;
    readonly fieldName: string;
    readonly targetModel: string;
    readonly isList: boolean;
    readonly isOptional: boolean;
  }

  const modelMap = new Map<string, { id: string; name: string }>();
  const relationFields: ModelRelationField[] = [];

  let gridX = 40;
  let gridY = 40;
  const COL_WIDTH = 300;
  const ROW_HEIGHT = 260;
  const MAX_PER_ROW = 3;
  let colIndex = 0;

  // Pass 1: Extract model names and create entities
  while ((modelMatch = modelRegex.exec(prismaCode)) !== null) {
    const modelName = modelMatch[1]!;
    const body = modelMatch[2]!;
    const entityId = `e-${modelName.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    modelMap.set(modelName, { id: entityId, name: modelName });

    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('@@'));
    const properties: Property[] = [];

    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) return;
      const fieldName = parts[0]!;
      const fieldType = parts[1]!;

      // Check if this is a primitive field or relation to another model
      const isList = fieldType.endsWith('[]');
      const isOptional = fieldType.endsWith('?');
      const baseType = fieldType.replace('?', '').replace('[]', '');

      const isPrimitive = ['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(baseType);

      if (isPrimitive) {
        const isRequired = !isOptional && !isList;
        properties.push(
          createProperty({
            key: fieldName,
            dataType: mapPrismaToDataType(fieldType),
            componentType: 'input',
            ...(isRequired ? { validation: { required: { value: true } } } : {}),
          })
        );
      } else {
        relationFields.push({
          modelName,
          fieldName,
          targetModel: baseType,
          isList,
          isOptional,
        });
      }
    });

    const x = gridX + (colIndex % MAX_PER_ROW) * COL_WIDTH;
    const y = gridY + Math.floor(colIndex / MAX_PER_ROW) * ROW_HEIGHT;
    colIndex++;

    entities.push({
      id: entityId,
      code: entityId,
      name: modelName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      position: { x, y },
      dimensions: { width: 220, height: Math.max(140, 60 + properties.length * 28) },
      properties,
      edges: [],
    });
  }

  // Pass 2: Extract relations and generate links
  const processedRelations = new Set<string>();

  relationFields.forEach(rel => {
    const source = modelMap.get(rel.modelName);
    const target = modelMap.get(rel.targetModel);
    if (!source || !target) return;

    const relKey = [rel.modelName, rel.targetModel].sort().join('::');
    if (processedRelations.has(relKey)) return;
    processedRelations.add(relKey);

    const targetBackRel = relationFields.find(
      r => r.modelName === rel.targetModel && r.targetModel === rel.modelName
    );

    const is1ToMany = rel.isList && (!targetBackRel || !targetBackRel.isList);
    const isManyToMany = rel.isList && targetBackRel?.isList;

    let leftCardinality: LinkProps['leftCardinality'] = '1';
    let rightCardinality: LinkProps['rightCardinality'] = '1';

    if (isManyToMany) {
      leftCardinality = '*';
      rightCardinality = '*';
    } else if (is1ToMany) {
      leftCardinality = '1';
      rightCardinality = '*';
    } else if (targetBackRel?.isList) {
      leftCardinality = '*';
      rightCardinality = '1';
    }

    const linkId = `link-${source.id}-${target.id}`;
    links.push({
      id: linkId,
      leftEntityId: source.id,
      rightEntityId: target.id,
      leftAnchorId: `${source.id}-anchor-right`,
      rightAnchorId: `${target.id}-anchor-left`,
      leftCardinality,
      rightCardinality,
      renderType: 'bezier',
      direction: 'right',
      leftProperty: rel.fieldName,
      rightProperty: targetBackRel?.fieldName,
    });
  });

  return {
    schema: {
      id: schemaId,
      name: schemaName,
      entities,
      links,
    },
  };
};
