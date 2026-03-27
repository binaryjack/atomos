import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAppStore, __clearAppStoreCaches } from '../create-app-store.js';
import { __clearSchemaStoreCaches } from '../create-schema-store.js';
import type { Entity } from '@vbs/vbs-mod';

describe('Persistence Integration Tests', () => {
  let testId = 0;
  
  beforeEach(() => {
    // Clear localStorage and module caches before each test
    localStorage.clear();
    __clearAppStoreCaches();
    __clearSchemaStoreCaches();
    vi.clearAllMocks();
    testId++;
  });

  const makeSchema = () => ({
    id: `schema-test-${testId}`,
    name: `Test Schema ${testId}`,
    entities: [],
    links: [],
    canvasStates: [],
  });

  const setupTest = () => {
    const schema = makeSchema();
    localStorage.setItem('vbe2-schemas', JSON.stringify([schema]));
    localStorage.setItem('vbe2-app', JSON.stringify({ activeSchemaId: schema.id }));
    const appStore = createAppStore();
    const schemaStore = appStore.getSchemaStore(schema.id)!;
    return { appStore, schemaStore, schemaId: schema.id };
  };

  const makeEntity = (id: string, name: string): Entity => ({
    id,
    code: id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    properties: [],
    position: { x: 100, y: 100 },
    dimensions: { width: 200, height: 150 },
    edges: [],
  });

  describe('Entity CRUD persistence', () => {
    it('should persist entity creation to localStorage', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-1', 'Test Entity');
      schemaStore.addEntity(entity);
      
      // Wait for debounce (400ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved).toBeTruthy();
      expect(saved[0].entities).toHaveLength(1);
      expect(saved[0].entities[0].id).toBe('entity-1');
    });

    it('should persist entity label update', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-2', 'Initial Name');
      schemaStore.addEntity(entity);
      
      // Get entity store and update
      const entityStore = schemaStore.getEntityStore('entity-2')!;
      entityStore.updateLabel('Updated Name');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].entities[0].name).toBe('Updated Name');
    });

    it('should persist entity deletion', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-3', 'To Delete');
      schemaStore.addEntity(entity);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      schemaStore.removeEntity('entity-3');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].entities).toHaveLength(0);
    });
  });

  describe('Property CRUD persistence', () => {
    it('should persist property addition', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-4', 'Entity with Props');
      schemaStore.addEntity(entity);
      
      const entityStore = schemaStore.getEntityStore('entity-4')!;
      entityStore.addProperty({
        key: 'prop1',
        label: 'Property 1',
        value: 'test',
        dataType: 'string',
        componentType: 'input',
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].entities[0].properties).toHaveLength(1);
      expect(saved[0].properties[0].key).toBe('prop1');
    });

    it('should persist property validation update', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-5', 'Entity');
      const entityWithProps = {
        ...entity,
        properties: [{
          key: 'prop1',
          label: 'Prop',
          value: '',
          dataType: 'string' as const,
          componentType: 'input' as const,
        }]
      };
      schemaStore.addEntity(entityWithProps);
      
      const entityStore = schemaStore.getEntityStore('entity-5')!;
      const updated = {
        ...entityStore.signal.value,
        properties: entityStore.signal.value.properties.map(p =>
          p.key === 'prop1'
            ? { ...p, validation: { required: { value: true } } }
            : p
        ),
        updatedAt: Date.now(),
      };
      entityStore.signal.set(updated);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].entities[0].properties[0].validation).toBeTruthy();
      expect(saved[0].entities[0].properties[0].validation.required.value).toBe(true);
    });
  });

  describe('Canvas position persistence', () => {
    it('should persist entity canvas position', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-6', 'Movable');
      schemaStore.addEntity(entity, {
        entityId: 'entity-6',
        x: 100,
        y: 200,
        width: 300,
        height: 250,
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      const canvas = saved[0].canvasStates.find((c: any) => c.entityId === 'entity-6');
      expect(canvas).toBeTruthy();
      expect(canvas.x).toBe(100);
      expect(canvas.y).toBe(200);
    });

    it('should persist entity canvas position update', async () => {
      const { schemaStore } = setupTest();
      
      const entity = makeEntity('entity-7', 'Draggable');
      schemaStore.addEntity(entity);
      
      schemaStore.updateEntityCanvas('entity-7', { x: 500, y: 600 });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      const canvas = saved[0].canvasStates.find((c: any) => c.entityId === 'entity-7');
      expect(canvas.x).toBe(500);
      expect(canvas.y).toBe(600);
    });
  });

  describe('Link persistence', () => {
    it('should persist link creation', async () => {
      const { schemaStore } = setupTest();
      
      const entity1 = makeEntity('entity-8', 'Source');
      const entity2 = makeEntity('entity-9', 'Target');
      schemaStore.addEntity(entity1);
      schemaStore.addEntity(entity2);
      
      schemaStore.addLink({
        id: 'link-1',
        leftEntityId: 'entity-8',
        rightEntityId: 'entity-9',
        leftAnchorId: 'entity-8-anchor-right',
        rightAnchorId: 'entity-9-anchor-left',
        leftCardinality: '1',
        rightCardinality: '1..*',
        renderType: 'bezier',
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].links).toHaveLength(1);
      expect(saved[0].links[0].id).toBe('link-1');
    });

    it('should persist link deletion', async () => {
      const { schemaStore } = setupTest();
      
      schemaStore.addLink({
        id: 'link-2',
        leftEntityId: 'e1',
        rightEntityId: 'e2',
        leftAnchorId: 'a1',
        rightAnchorId: 'a2',
        leftCardinality: '1',
        rightCardinality: '1',
        renderType: 'bezier',
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      schemaStore.removeLink('link-2');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const saved = JSON.parse(localStorage.getItem('vbe2-schemas')!);
      expect(saved[0].links).toHaveLength(0);
    });
  });

  describe('Reload from localStorage', () => {
    it('should restore entities on reload', () => {
      const schemaId = `schema-reload-${testId}`;
      const schema = {
        id: schemaId,
        name: 'Test Schema',
        entities: [makeEntity('entity-10', 'Saved Entity')],
        links: [],
        canvasStates: [{
          entityId: 'entity-10',
          x: 150,
          y: 250,
          width: 200,
          height: 150,
        }],
      };
      
      localStorage.setItem('vbe2-schemas', JSON.stringify([schema]));
      localStorage.setItem('vbe2-app', JSON.stringify({ activeSchemaId: schemaId }));
      
      const appStore = createAppStore();
      const schemaStore = appStore.getSchemaStore(schemaId)!;
      
      expect(schemaStore.signal.value.entities).toHaveLength(1);
      expect(schemaStore.signal.value.entities[0]?.id).toBe('entity-10');
      expect(schemaStore.signal.value.canvasStates[0]?.x).toBe(150);
    });
  });
});
