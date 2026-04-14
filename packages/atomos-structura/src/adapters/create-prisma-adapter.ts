import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import type { Property } from '@atomos-web/structura-core';

const mapTypeToPrisma = (dataType: string): string => {
  switch (dataType) {
    case 'string':  return 'String';
    case 'integer': return 'Int';
    case 'number':  return 'Int';
    case 'float':   return 'Float';
    case 'boolean': return 'Boolean';
    case 'date':    return 'DateTime';
    default:        return 'String';
  }
};

export const createPrismaAdapter = (kernel: SchemaGraphKernel) => {
  return Object.freeze({
    generatePrismaSchema: (): string => {
      const { entities, links } = kernel.getSnapshot();

      let output = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n`;

      Object.values(entities).forEach(entity => {
        output += `model ${entity.name} {\n`;

        const hasId = entity.properties.some(p => p.key === 'id');
        if (!hasId) {
          output += `  id  String  @id @default(uuid())\n`;
        }

        // Properties
        entity.properties.forEach((prop: Property) => {
          const pType = mapTypeToPrisma(prop.dataType);
          const optional = prop.validation?.required ? '' : '?';
          const atId = prop.key === 'id' ? '  @id @default(uuid())' : '';
          output += `  ${prop.key}  ${pType}${optional}${atId}\n`;
        });

        // Outgoing relations
        const outgoing = Object.values(links).filter(l => l.leftEntityId === entity.id);
        outgoing.forEach(link => {
          const target = entities[link.rightEntityId];
          if (!target) return;
          const isRightMany = link.rightCardinality === '*' || link.rightCardinality === '1..*';
          const isLeftMany  = link.leftCardinality  === '*' || link.leftCardinality  === '1..*';
          const relName = `${entity.name}To${target.name}`;
          const fieldName = target.name.charAt(0).toLowerCase() + target.name.slice(1);

          if (isLeftMany && isRightMany) {
            output += `  ${fieldName}  ${target.name}[]  @relation("${relName}")\n`;
          } else if (isRightMany) {
            output += `  ${fieldName}  ${target.name}[]  @relation("${relName}")\n`;
          } else {
            output += `  ${fieldName}  ${target.name}?  @relation("${relName}", fields: [${fieldName}Id], references: [id])\n`;
            output += `  ${fieldName}Id  String?\n`;
          }
        });

        // Incoming back-references
        const incoming = Object.values(links).filter(l => l.rightEntityId === entity.id);
        incoming.forEach(link => {
          const source = entities[link.leftEntityId];
          if (!source) return;
          const isLeftMany  = link.leftCardinality  === '*' || link.leftCardinality  === '1..*';
          const isRightMany = link.rightCardinality === '*' || link.rightCardinality === '1..*';
          const relName = `${source.name}To${entity.name}`;
          const fieldName = source.name.charAt(0).toLowerCase() + source.name.slice(1);

          if (isLeftMany && isRightMany) {
            output += `  ${fieldName}  ${source.name}[]  @relation("${relName}")\n`;
          } else if (!isRightMany) {
            // FK is on this side — already handled above
          } else {
            output += `  ${fieldName}  ${source.name}?  @relation("${relName}")\n`;
          }
        });

        output += `}\n\n`;
      });

      return output;
    },
  });
};

