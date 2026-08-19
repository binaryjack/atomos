import { createProperty } from '../../factories/create-property.js';
import type { DataType } from '../../shared/data-type.js';
import type { Entity } from '../../types/entity.types.js';
import type { LinkProps } from '../../types/link.types.js';
import type { Property } from '../../types/property.types.js';
import type { ParsedSchemaResult } from './prisma-parser.js';

const mapTsToDataType = (tsType: string): DataType => {
  const clean = tsType.replace('[]', '').trim().toLowerCase();
  switch (clean) {
    case 'number':     return 'float';
    case 'boolean':    return 'boolean';
    case 'date':       return 'date';
    case 'string':
    default:           return 'string';
  }
};

export const parseTypeScriptAST = (tsCode: string, schemaName = 'TypeScriptSchema'): ParsedSchemaResult => {
  const schemaId = `schema-${Date.now()}`;
  const entities: Entity[] = [];
  const links: LinkProps[] = [];

  // Match: interface InterfaceName { ... } or type TypeName = { ... }
  const interfaceRegex = /(?:interface\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([^{]+))?\s*\{([\s\S]*?)\}|type\s+([a-zA-Z0-9_]+)\s*=\s*\{([\s\S]*?)\};?)/g;

  const typeMap = new Map<string, { id: string; name: string }>();
  interface TsExtendsRef {
    readonly childId: string;
    readonly parentName: string;
  }
  interface TsPropertyRef {
    readonly sourceId: string;
    readonly propName: string;
    readonly targetName: string;
    readonly isArray: boolean;
  }

  const extendsRefs: TsExtendsRef[] = [];
  const propertyRefs: TsPropertyRef[] = [];

  let match: RegExpExecArray | null;
  let gridX = 40;
  let gridY = 40;
  const COL_WIDTH = 300;
  const ROW_HEIGHT = 260;
  const MAX_PER_ROW = 3;
  let colIndex = 0;

  while ((match = interfaceRegex.exec(tsCode)) !== null) {
    const isInterface = !!match[1];
    const name = isInterface ? match[1]! : match[4]!;
    const extendsClause = isInterface ? match[2] : undefined;
    const body = isInterface ? match[3]! : match[5]!;

    const entityId = `e-${name.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    typeMap.set(name, { id: entityId, name });

    if (extendsClause) {
      const parents = extendsClause.split(',').map(p => p.trim());
      parents.forEach(p => extendsRefs.push({ childId: entityId, parentName: p }));
    }

    const properties: Property[] = [];
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//'));

    lines.forEach(line => {
      // propName?: type; or readonly propName: type;
      const propMatch = /^(?:readonly\s+)?([a-zA-Z0-9_]+)(\?)?\s*:\s*([^;]+);?$/i.exec(line);
      if (!propMatch) return;

      const propName = propMatch[1]!;
      const isOptional = !!propMatch[2];
      const rawType = propMatch[3]!.trim();
      const isArray = rawType.endsWith('[]') || rawType.startsWith('Array<');
      const baseType = rawType.replace('[]', '').replace(/^Array<|>$/g, '').trim();

      const isPrimitive = ['string', 'number', 'boolean', 'Date', 'any', 'unknown', 'void'].includes(baseType);

      if (isPrimitive) {
        properties.push(
          createProperty({
            key: propName,
            dataType: mapTsToDataType(baseType),
            componentType: 'input',
            ...(!isOptional ? { validation: { required: { value: true } } } : {}),
          })
        );
      } else {
        propertyRefs.push({
          sourceId: entityId,
          propName,
          targetName: baseType,
          isArray,
        });
      }
    });

    const x = gridX + (colIndex % MAX_PER_ROW) * COL_WIDTH;
    const y = gridY + Math.floor(colIndex / MAX_PER_ROW) * ROW_HEIGHT;
    colIndex++;

    entities.push({
      id: entityId,
      code: entityId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      position: { x, y },
      dimensions: { width: 220, height: Math.max(140, 60 + properties.length * 28) },
      properties,
      edges: [],
    });
  }

  // Generate inheritance links
  extendsRefs.forEach(ext => {
    const parent = typeMap.get(ext.parentName);
    if (!parent) return;

    links.push({
      id: `link-extends-${ext.childId}-${parent.id}`,
      leftEntityId: ext.childId,
      rightEntityId: parent.id,
      leftAnchorId: `${ext.childId}-anchor-top`,
      rightAnchorId: `${parent.id}-anchor-bottom`,
      leftCardinality: '1',
      rightCardinality: '1',
      renderType: 'orthogonal',
      direction: 'right',
      leftProperty: 'extends',
    });
  });

  // Generate reference links
  propertyRefs.forEach(ref => {
    const target = typeMap.get(ref.targetName);
    if (!target) return;

    links.push({
      id: `link-ref-${ref.sourceId}-${target.id}-${ref.propName}`,
      leftEntityId: ref.sourceId,
      rightEntityId: target.id,
      leftAnchorId: `${ref.sourceId}-anchor-right`,
      rightAnchorId: `${target.id}-anchor-left`,
      leftCardinality: '1',
      rightCardinality: ref.isArray ? '*' : '1',
      renderType: 'bezier',
      direction: 'right',
      leftProperty: ref.propName,
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
