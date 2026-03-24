import type { WorkspaceManager, EntityInstance } from '../../core/workspace-manager.js';
import { createSignal } from '../../core/create-signal.js';
import { createDemoEntity } from './create-demo-entity.js';


interface DemoConfig {
  readonly id: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const createInteractiveEntityDemo = function(workspace: WorkspaceManager) {
  const configs: DemoConfig[] = [
    { id: 'entity-a', title: 'Data Source',  x: 80,  y: 100, width: 200, height: 80 },
    { id: 'entity-b', title: 'Processor',    x: 400, y: 150, width: 180, height: 80 },
    { id: 'entity-c', title: 'Output',       x: 250, y: 330, width: 160, height: 80 },
  ];

  configs.forEach(cfg => {
    const position   = createSignal({ x: cfg.x, y: cfg.y });
    const dimensions = createSignal({ width: cfg.width, height: cfg.height });

    const entity = createDemoEntity({
      id:         cfg.id,
      title:      cfg.title,
      position,
      dimensions,
      workspace,
    });

    const instance: EntityInstance = {
      id: cfg.id,
      element: entity.element,
      position,
      dimensions,
      cleanup: entity.cleanup,
    };

    // Register entity on canvas (appends entity.element to svgContainer)
    workspace.registerEntity(instance);

    // Edges live in world-space; must be appended AFTER entity so they render above
    entity.edgeElements.forEach(el => workspace.appendToCanvas(el));
  });
};