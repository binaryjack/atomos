import { describe, expect, it } from 'vitest';
import {
  findCycles,
  parsePrismaSchema,
  parseSqlDDL,
  parseTypeScriptAST,
} from '../src/index.js';

describe('Bidirectional AST Parsers & Graph Analytics', () => {
  it('parses Prisma schema models and relations correctly', () => {
    const prismaCode = `
      model User {
        id        String   @id @default(uuid())
        email     String   @unique
        name      String?
        posts     Post[]
      }

      model Post {
        id        String   @id @default(uuid())
        title     String
        published Boolean  @default(false)
        author    User     @relation(fields: [authorId], references: [id])
        authorId  String
      }
    `;

    const result = parsePrismaSchema(prismaCode, 'BlogSchema');
    expect(result.schema.entities).toHaveLength(2);
    expect(result.schema.entities.map(e => e.name)).toEqual(['User', 'Post']);
    expect(result.schema.links).toHaveLength(1);

    const userEntity = result.schema.entities.find(e => e.name === 'User')!;
    expect(userEntity.properties.some(p => p.key === 'email')).toBe(true);

    const postEntity = result.schema.entities.find(e => e.name === 'Post')!;
    expect(postEntity.properties.some(p => p.key === 'title')).toBe(true);
  });

  it('parses SQL DDL CREATE TABLE statements and foreign keys', () => {
    const sqlCode = `
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL
      );

      CREATE TABLE orders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id),
        total_amount NUMERIC NOT NULL
      );
    `;

    const result = parseSqlDDL(sqlCode, 'ECommerceSchema');
    expect(result.schema.entities).toHaveLength(2);
    expect(result.schema.entities.map(e => e.name)).toEqual(['users', 'orders']);
    expect(result.schema.links).toHaveLength(1);
    expect(result.schema.links[0]!.leftProperty).toBe('user_id');
  });

  it('parses TypeScript interfaces and inheritance', () => {
    const tsCode = `
      export interface BaseNode {
        id: string;
        createdAt: number;
      }

      export interface ServiceNode extends BaseNode {
        endpoint: string;
        port: number;
        isActive?: boolean;
      }
    `;

    const result = parseTypeScriptAST(tsCode, 'MicroservicesAST');
    expect(result.schema.entities).toHaveLength(2);
    expect(result.schema.links).toHaveLength(1);
    expect(result.schema.links[0]!.leftProperty).toBe('extends');
  });

  it('detects cycles accurately with Tarjan algorithm', () => {
    const entities = [
      { id: 'node-A', name: 'Node A', code: 'A', createdAt: 0, updatedAt: 0, position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 }, properties: [], edges: [] },
      { id: 'node-B', name: 'Node B', code: 'B', createdAt: 0, updatedAt: 0, position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 }, properties: [], edges: [] },
      { id: 'node-C', name: 'Node C', code: 'C', createdAt: 0, updatedAt: 0, position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 }, properties: [], edges: [] },
    ];

    // A -> B -> C -> A
    const cyclicLinks = [
      { id: 'l1', leftEntityId: 'node-A', rightEntityId: 'node-B', leftAnchorId: 'a1', rightAnchorId: 'a2', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
      { id: 'l2', leftEntityId: 'node-B', rightEntityId: 'node-C', leftAnchorId: 'a3', rightAnchorId: 'a4', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
      { id: 'l3', leftEntityId: 'node-C', rightEntityId: 'node-A', leftAnchorId: 'a5', rightAnchorId: 'a6', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
    ];

    const cycleCheck = findCycles(entities, cyclicLinks);
    expect(cycleCheck.hasCycles).toBe(true);
    expect(cycleCheck.cycles).toHaveLength(1);
    expect(cycleCheck.cycles[0]).toContain('node-A');
    expect(cycleCheck.cycles[0]).toContain('node-B');
    expect(cycleCheck.cycles[0]).toContain('node-C');

    // Acyclic: A -> B -> C
    const acyclicLinks = [
      { id: 'l1', leftEntityId: 'node-A', rightEntityId: 'node-B', leftAnchorId: 'a1', rightAnchorId: 'a2', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
      { id: 'l2', leftEntityId: 'node-B', rightEntityId: 'node-C', leftAnchorId: 'a3', rightAnchorId: 'a4', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
    ];

    const acyclicCheck = findCycles(entities, acyclicLinks);
    expect(acyclicCheck.hasCycles).toBe(false);
    expect(acyclicCheck.cycles).toHaveLength(0);
  });
});
