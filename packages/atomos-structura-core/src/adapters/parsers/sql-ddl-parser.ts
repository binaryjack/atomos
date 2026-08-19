import { createProperty } from '../../factories/create-property.js';
import type { DataType } from '../../shared/data-type.js';
import type { Entity } from '../../types/entity.types.js';
import type { LinkProps } from '../../types/link.types.js';
import type { Property } from '../../types/property.types.js';
import type { ParsedSchemaResult } from './prisma-parser.js';

const mapSqlToDataType = (sqlType: string): DataType => {
  const clean = sqlType.toUpperCase();
  if (clean.includes('INT') || clean.includes('SERIAL')) return 'integer';
  if (clean.includes('FLOAT') || clean.includes('DOUBLE') || clean.includes('DECIMAL') || clean.includes('NUMERIC')) return 'float';
  if (clean.includes('BOOL')) return 'boolean';
  if (clean.includes('DATE') || clean.includes('TIME')) return 'date';
  return 'string';
};

export const parseSqlDDL = (sqlContent: string, schemaName = 'DatabaseSchema'): ParsedSchemaResult => {
  const schemaId = `schema-${Date.now()}`;
  const entities: Entity[] = [];
  const links: LinkProps[] = [];

  // Match CREATE TABLE [IF NOT EXISTS] tableName (...)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\(([\s\S]*?)\);/gi;

  const tableMap = new Map<string, { id: string; name: string }>();
  interface ForeignKeyRef {
    readonly sourceTable: string;
    readonly sourceCol: string;
    readonly targetTable: string;
    readonly targetCol: string;
  }
  const foreignKeys: ForeignKeyRef[] = [];

  let match: RegExpExecArray | null;
  let gridX = 40;
  let gridY = 40;
  const COL_WIDTH = 300;
  const ROW_HEIGHT = 260;
  const MAX_PER_ROW = 3;
  let colIndex = 0;

  // Pass 1: Parse tables and columns
  while ((match = createTableRegex.exec(sqlContent)) !== null) {
    const tableName = match[1]!;
    const body = match[2]!;
    const entityId = `e-${tableName.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    tableMap.set(tableName.toLowerCase(), { id: entityId, name: tableName });

    const lines = body.split(',\n').map(l => l.trim()).filter(l => l.length > 0);
    const properties: Property[] = [];

    lines.forEach(line => {
      // Check for standalone FOREIGN KEY (col) REFERENCES target (targetCol)
      const fkMatch = /FOREIGN\s+KEY\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)\s*REFERENCES\s*(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)/i.exec(line);
      if (fkMatch) {
        foreignKeys.push({
          sourceTable: tableName.toLowerCase(),
          sourceCol: fkMatch[1]!,
          targetTable: fkMatch[2]!.toLowerCase(),
          targetCol: fkMatch[3]!,
        });
        return;
      }

      // Check for PRIMARY KEY (col)
      if (/^PRIMARY\s+KEY/i.test(line) || /^CONSTRAINT/i.test(line)) {
        return;
      }

      // Column definition: name TYPE [NOT NULL] [PRIMARY KEY] [REFERENCES target(col)]
      const colMatch = /^(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s+([a-zA-Z0-9_]+(?:\([0-9,\s]+\))?)([\s\S]*)$/i.exec(line);
      if (!colMatch) return;

      const colName = colMatch[1]!;
      const colType = colMatch[2]!;
      const colRest = colMatch[3] || '';

      const isRequired = /NOT\s+NULL/i.test(colRest) || /PRIMARY\s+KEY/i.test(colRest);

      properties.push(
        createProperty({
          key: colName,
          dataType: mapSqlToDataType(colType),
          componentType: 'input',
          ...(isRequired ? { validation: { required: { value: true } } } : {}),
        })
      );

      // Inline REFERENCES target(col)
      const inlineFk = /REFERENCES\s+(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)/i.exec(colRest);
      if (inlineFk) {
        foreignKeys.push({
          sourceTable: tableName.toLowerCase(),
          sourceCol: colName,
          targetTable: inlineFk[1]!.toLowerCase(),
          targetCol: inlineFk[2]!,
        });
      }
    });

    const x = gridX + (colIndex % MAX_PER_ROW) * COL_WIDTH;
    const y = gridY + Math.floor(colIndex / MAX_PER_ROW) * ROW_HEIGHT;
    colIndex++;

    entities.push({
      id: entityId,
      code: entityId,
      name: tableName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      position: { x, y },
      dimensions: { width: 220, height: Math.max(140, 60 + properties.length * 28) },
      properties,
      edges: [],
    });
  }

  // Pass 2: Generate links from foreign keys
  foreignKeys.forEach(fk => {
    const source = tableMap.get(fk.sourceTable);
    const target = tableMap.get(fk.targetTable);
    if (!source || !target) return;

    const linkId = `link-${source.id}-${target.id}-${fk.sourceCol}`;
    links.push({
      id: linkId,
      leftEntityId: source.id,
      rightEntityId: target.id,
      leftAnchorId: `${source.id}-anchor-right`,
      rightAnchorId: `${target.id}-anchor-left`,
      leftCardinality: '*',
      rightCardinality: '1',
      renderType: 'orthogonal',
      direction: 'right',
      leftProperty: fk.sourceCol,
      rightProperty: fk.targetCol,
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
