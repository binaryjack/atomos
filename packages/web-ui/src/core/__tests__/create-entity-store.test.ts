import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEntityStore } from '../create-entity-store.js';
import { registry } from '../create-signal-registry.js';
import type { Entity } from '@vbs/vbs-mod';

describe('createEntityStore', () => {
  const makeEntity = (id: string): Entity => ({
    id,
    code: id,
    name: `Entity ${id}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    properties: [],
    position: { x: 0, y: 0 },
    dimensions: { width: 200, height: 150 },
    edges: [],
  });

  beforeEach(() => {
    // Clear registry between tests (if possible, or mock it)
    vi.clearAllMocks();
  });

  it('should create entity store with signal', () => {
    const entity = makeEntity('test-1');
    const store = createEntityStore(entity);
    
    expect(store.signal.value).toEqual(entity);
  });

  it('should update label via updateLabel', () => {
    const entity = makeEntity('test-2');
    const store = createEntityStore(entity);
    const subscriber = vi.fn();
    
    store.signal.subscribe(subscriber);
    store.updateLabel('New Label');
    
    expect(store.signal.value.name).toBe('New Label');
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0].name).toBe('New Label');
  });

  it('should add property via addProperty', () => {
    const entity = makeEntity('test-3');
    const store = createEntityStore(entity);
    const subscriber = vi.fn();
    
    store.signal.subscribe(subscriber);
    store.addProperty({
      key: 'prop1',
      label: 'Property 1',
      value: 'test',
      dataType: 'string',
      componentType: 'input',
    });
    
    expect(store.signal.value.properties).toHaveLength(1);
    expect(store.signal.value.properties[0]?.key).toBe('prop1');
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should remove property via removeProperty', () => {
    const entity = makeEntity('test-4');
    const store = createEntityStore({ ...entity, properties: [
      { key: 'prop1', label: 'P1', value: 'v1', dataType: 'string', componentType: 'input' },
      { key: 'prop2', label: 'P2', value: 'v2', dataType: 'string', componentType: 'input' },
    ]});
    const subscriber = vi.fn();
    
    store.signal.subscribe(subscriber);
    store.removeProperty('prop1');
    
    expect(store.signal.value.properties).toHaveLength(1);
    expect(store.signal.value.properties[0]?.key).toBe('prop2');
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should return same signal instance for same entity id (via registry)', () => {
    const entity1 = makeEntity('same-id');
    const entity2 = makeEntity('same-id');
    
    const store1 = createEntityStore(entity1);
    const store2 = createEntityStore(entity2);
    
    expect(store1.signal).toBe(store2.signal);
  });

  it('should update updatedAt timestamp on changes', () => {
    const entity = makeEntity('test-5');
    const store = createEntityStore(entity);
    const originalUpdatedAt = store.signal.value.updatedAt;
    
    // Wait 1ms to ensure timestamp changes
    const delay = () => new Promise(resolve => setTimeout(resolve, 2));
    
    return delay().then(() => {
      store.updateLabel('Changed');
      expect(store.signal.value.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });
});
