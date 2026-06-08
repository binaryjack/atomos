import type { SchemaGraphKernel } from "@atomos-web/structura/dist/core/create-schema-graph-kernel.js";
import type { EntityManager } from "@atomos-web/structura/dist/core/presentation/entity-manager.js";
import { applySchemaCommands } from "@atomos-web/structura/dist/core/application/dag-service.js";

export const load_preset = (kernel: SchemaGraphKernel, entityManager: EntityManager, preset: string) => {
  const presets: Record<string, { entities: any[]; links: any[]; applyAfterLoad?: string[] }> = {
    'mvc': {
      entities: [
        { id: 'mvc-view', name: 'View (UI)', nodeType: 'box', position: { x: 100, y: 100 } },
        { id: 'mvc-controller', name: 'Controller', nodeType: 'box', position: { x: 400, y: 100 } },
        { id: 'mvc-model', name: 'Model (Data)', nodeType: 'box', position: { x: 250, y: 300 } },
      ],
      links: [
        { source: 'mvc-view', target: 'mvc-controller' },
        { source: 'mvc-controller', target: 'mvc-model' },
        { source: 'mvc-model', target: 'mvc-view' },
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'mvvm': {
      entities: [
        { id: 'mvvm-view', name: 'View', position: { x: 100, y: 200 } },
        { id: 'mvvm-viewmodel', name: 'ViewModel', position: { x: 350, y: 200 } },
        { id: 'mvvm-model', name: 'Model', position: { x: 600, y: 200 } },
      ],
      links: [
        { source: 'mvvm-view', target: 'mvvm-viewmodel' },
        { source: 'mvvm-viewmodel', target: 'mvvm-model' },
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'cqrs': {
      entities: [
        { id: 'cqrs-client', name: 'Client', position: { x: 350, y: 50 } },
        { id: 'cqrs-command', name: 'Command API', position: { x: 150, y: 200 } },
        { id: 'cqrs-query', name: 'Query API', position: { x: 550, y: 200 } },
        { id: 'cqrs-write-db', name: 'Write Database', nodeType: 'cylinder', position: { x: 150, y: 400 } },
        { id: 'cqrs-read-db', name: 'Read Database', nodeType: 'cylinder', position: { x: 550, y: 400 } },
        { id: 'cqrs-bus', name: 'Event Bus', position: { x: 350, y: 400 } },
      ],
      links: [
        { source: 'cqrs-client', target: 'cqrs-command' },
        { source: 'cqrs-client', target: 'cqrs-query' },
        { source: 'cqrs-command', target: 'cqrs-write-db' },
        { source: 'cqrs-write-db', target: 'cqrs-bus' },
        { source: 'cqrs-bus', target: 'cqrs-read-db' },
        { source: 'cqrs-query', target: 'cqrs-read-db' },
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'flux': {
      entities: [
        { id: 'flux-view', name: 'View', position: { x: 350, y: 50 } },
        { id: 'flux-action', name: 'Action', position: { x: 600, y: 200 } },
        { id: 'flux-dispatcher', name: 'Dispatcher', position: { x: 350, y: 350 } },
        { id: 'flux-store', name: 'Store', position: { x: 100, y: 200 } },
      ],
      links: [
        { source: 'flux-view', target: 'flux-action' },
        { source: 'flux-action', target: 'flux-dispatcher' },
        { source: 'flux-dispatcher', target: 'flux-store' },
        { source: 'flux-store', target: 'flux-view' },
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'database': {
      entities: [
        { id: 'db-users', name: 'Users', position: { x: 100, y: 100 }, properties: [{key:'id', label:'ID', type:'uuid'}, {key:'email', label:'Email', type:'string'}] },
        { id: 'db-posts', name: 'Posts', position: { x: 400, y: 100 }, properties: [{key:'id', label:'ID', type:'uuid'}, {key:'user_id', label:'User ID', type:'uuid'}, {key:'title', label:'Title', type:'string'}] },
        { id: 'db-comments', name: 'Comments', position: { x: 400, y: 350 }, properties: [{key:'id', label:'ID', type:'uuid'}, {key:'post_id', label:'Post ID', type:'uuid'}, {key:'content', label:'Content', type:'text'}] },
      ],
      links: [
        { source: 'db-users', target: 'db-posts' },
        { source: 'db-posts', target: 'db-comments' }
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'class-diagram': {
      entities: [
        { id: 'cls-animal', name: 'Animal', position: { x: 350, y: 50 }, properties: [{key:'age', label:'Age', type:'number'}, {key:'move()', label:'move()', type:'void'}] },
        { id: 'cls-dog', name: 'Dog', position: { x: 150, y: 250 }, properties: [{key:'bark()', label:'bark()', type:'void'}] },
        { id: 'cls-bird', name: 'Bird', position: { x: 550, y: 250 }, properties: [{key:'fly()', label:'fly()', type:'void'}] },
      ],
      links: [
        { source: 'cls-dog', target: 'cls-animal' },
        { source: 'cls-bird', target: 'cls-animal' }
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'uml': {
      entities: [
        { id: 'uml-actor', name: 'User (Actor)', position: { x: 100, y: 200 } },
        { id: 'uml-uc1', name: 'Login', nodeType: 'ellipse', position: { x: 400, y: 100 } },
        { id: 'uml-uc2', name: 'Checkout', nodeType: 'ellipse', position: { x: 400, y: 300 } },
      ],
      links: [
        { source: 'uml-actor', target: 'uml-uc1' },
        { source: 'uml-actor', target: 'uml-uc2' }
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'activity-workflow': {
      entities: [
        { id: 'act-start', name: 'Start', position: { x: 300, y: 50 }, dimensions: {width: 100, height: 50} },
        { id: 'act-process', name: 'Process Order', position: { x: 300, y: 200 } },
        { id: 'act-decision', name: 'Is Valid?', position: { x: 300, y: 350 } },
        { id: 'act-end', name: 'End', position: { x: 300, y: 500 }, dimensions: {width: 100, height: 50} },
      ],
      links: [
        { source: 'act-start', target: 'act-process' },
        { source: 'act-process', target: 'act-decision' },
        { source: 'act-decision', target: 'act-end' }
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    },
    'security-schema': {
      entities: [
        { id: 'sec-internet', name: 'Public Internet', position: { x: 100, y: 200 } },
        { id: 'sec-waf', name: 'WAF / Firewall', position: { x: 350, y: 200 } },
        { id: 'sec-api', name: 'API Gateway', position: { x: 600, y: 200 } },
        { id: 'sec-auth', name: 'Auth Service', position: { x: 600, y: 400 } },
        { id: 'sec-db', name: 'Secure DB', position: { x: 850, y: 200 } },
      ],
      links: [
        { source: 'sec-internet', target: 'sec-waf' },
        { source: 'sec-waf', target: 'sec-api' },
        { source: 'sec-api', target: 'sec-auth' },
        { source: 'sec-api', target: 'sec-db' }
      ],
      applyAfterLoad: ['auto-layout', 'optimize-connections', 'center-to-schema', 'fit-to-screen']
    }
  };

  const p = presets[preset];
  if (!p) return;

  p.entities.forEach((e: any) => {
    entityManager.createEntity(
      e.id,
      e.name,
      e.position || { x: 0, y: 0 },
      e.dimensions || { width: 220, height: 120 },
      { shape: e.nodeType || 'box' }
    );
    const props = e.properties || [
      { key: 'id', label: 'Identifier', type: 'uuid' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'description', label: 'Description', type: 'string' }
    ];
    entityManager.updateEntityProperties(e.id, props);
  });

  p.links.forEach((l: any, i: number) => {
    entityManager.createLink(
      `link-${preset}-${i}`,
      `${l.source}-anchor-right`,
      `${l.target}-anchor-left`,
      l.source,
      l.target
    );
  });

  if (p.applyAfterLoad && Array.isArray(p.applyAfterLoad)) {
    applySchemaCommands(entityManager, p.applyAfterLoad);
  }
};
