import { describe, expect, it } from 'vitest';
import {
  applyArchitectureDiff,
  createProposedDiff,
  executeStructuraCli,
  findCanvasForSchema,
  makeDefaultSchema,
  makeInitialState,
  updateSchemaById,
} from '../src/index.js';

describe('Structura Core — Workspace & Diff Invariants', () => {
  it('creates initial workspace state with default canvas and schema', () => {
    const state = makeInitialState();
    expect(state.workspace.name).toBe('Untitled Workspace');
    expect(findCanvasForSchema(state, 'schema-default')).toBeDefined();
  });

  it('updates schema by id immutably', () => {
    const state = makeInitialState();
    const updated = updateSchemaById(state, 'schema-default', (s) => ({
      ...s,
      name: 'Updated Schema Name',
    }));
    expect(findCanvasForSchema(updated, 'schema-default')?.schemas['schema-default']?.name).toBe('Updated Schema Name');
  });

  it('applies architecture diff additions and deletions', () => {
    const entity1 = {
      id: 'e1',
      name: 'Service A',
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 50 },
      properties: [],
      edges: [],
    };
    const entity2 = {
      id: 'e2',
      name: 'Service B',
      position: { x: 100, y: 100 },
      dimensions: { width: 100, height: 50 },
      properties: [],
      edges: [],
    };
    const diff = createProposedDiff('schema-default', {
      addedEntities: [entity2],
      deletedEntityIds: ['e1'],
    });

    const result = applyArchitectureDiff([entity1], [], diff);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]?.id).toBe('e2');
    expect(result.appliedCount).toBe(2);
  });

  it('executes CLI version and help commands returning SdkEnvelope', () => {
    const versionRes = executeStructuraCli(['version', '--json']);
    expect(versionRes.ok).toBe(true);
    expect(versionRes.namespace).toBe('@atomos-web/structura');
    expect(versionRes.data).toEqual({ name: '@atomos-web/structura', version: '5.0.0' });

    const helpRes = executeStructuraCli(['help']);
    expect(helpRes.ok).toBe(true);
    expect(helpRes.namespace).toBe('@atomos-web/structura');
  });
});
