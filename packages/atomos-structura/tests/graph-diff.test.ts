import { describe, expect, it } from 'vitest';
import { compareDAGSchemas } from '../src/features/diff/create-graph-diff-engine.js';
import type { DAGExchange } from '../src/core/application/dag-service.js';

describe('Graph Diff Engine', () => {
  it('correctly identifies added, modified, deleted, and unchanged entities', () => {
    const baseSchema: DAGExchange = {
      type: 'DAGExchange',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', name: 'Auth API', x: 0, y: 0, collapsed: false, properties: [] },
        { id: 'node-2', name: 'Legacy DB', x: 100, y: 100, collapsed: false, properties: [] },
      ],
      edges: [
        { id: 'edge-1', fromId: 'node-1', toId: 'node-2' },
      ],
    };

    const headSchema: DAGExchange = {
      type: 'DAGExchange',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', name: 'Auth API v2', x: 0, y: 0, collapsed: false, properties: [] }, // Modified
        { id: 'node-3', name: 'Redis Cache', x: 200, y: 200, collapsed: false, properties: [] }, // Added
      ], // Legacy DB (node-2) deleted
      edges: [
        { id: 'edge-2', fromId: 'node-1', toId: 'node-3' }, // Added
      ],
    };

    const result = compareDAGSchemas(baseSchema, headSchema);

    expect(result.addedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    expect(result.deletedCount).toBe(1);

    const addedNode = result.entities.find(e => e.changeType === 'added');
    expect(addedNode?.entity.id).toBe('node-3');

    const modifiedNode = result.entities.find(e => e.changeType === 'modified');
    expect(modifiedNode?.entity.id).toBe('node-1');

    const deletedNode = result.entities.find(e => e.changeType === 'deleted');
    expect(deletedNode?.entity.id).toBe('node-2');
  });
});
