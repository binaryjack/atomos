import { createSignal } from '@atomos-web/prime'
import type { EntityInstance } from '../core/types/entity-instance.types.js'
import { createCompactEntityContent } from '../features/entity-with-edges/create-compact-entity-content.js'
import { createEntityContent } from '../features/entity-with-edges/create-entity-content.js'

export interface ViewerEntityProps {
  id: string;
  shape?: string;
  color?: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  properties?: any[];
  // Static context
  workspace: any; 
}

export const createViewerEntity = function(props: ViewerEntityProps): EntityInstance {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  root.dataset.entityId = props.id;
  const cleanups: Array<() => void> = [];

  const positionSignal = createSignal(props.position);
  const dimensionsSignal = createSignal(props.dimensions);
  
  // Dummy store for createEntityContent to read collapsed state etc
  const dummyStore = {
    signal: createSignal({ collapsed: false, properties: props.properties || [] }),
    updateProperties: () => {},
    setCollapsed: () => {},
  };
  
  // Dummy global config
  const dummyGlobalConfig = createSignal({
    topology: { allowedConnections: [] }
  });

  let currentShape = props.shape;
  let currentColor = props.color;
  let contentElement: SVGElement | null = null;
  let updateSize: ((w: number, h: number) => void) | null = null;
  let contentCleanup: (() => void) | null = null;

  const buildContent = (shape?: string, color?: string) => {
    if (contentCleanup) contentCleanup();
    if (contentElement && contentElement.parentNode) {
      contentElement.parentNode.removeChild(contentElement);
    }

    if (shape === 'box' || shape === 'rectangle' || !shape) {   
      const content = createEntityContent({
        instanceId: 'viewer',
        entityStore: dummyStore as any,
        globalConfig: dummyGlobalConfig as any,
        storageProvider: {} as any,
        color: color,
        shape: shape || 'rectangle',
        onDelete: () => {},
        onSettingsClick: () => {},
        onHeightChange: (h) => {
          if (h > dimensionsSignal.value.height) {
            dimensionsSignal.set({ width: dimensionsSignal.value.width, height: h });
          }
        },
      });
      contentElement = content.rootElement;
      updateSize = content.updateSize;
      contentCleanup = content.cleanup.destroy;
    } else {
      const content = createCompactEntityContent({
        shape: shape as any,
        color: color,
        entitySignal: dummyStore.signal as any,
        onDelete: () => {},
        onDoubleClick: () => {}
      });
      contentElement = content.rootElement;
      updateSize = content.updateSize;
      contentCleanup = content.cleanup.destroy;
    }

    if (root.firstChild) {
      root.insertBefore(contentElement, root.firstChild);
    } else {
      root.appendChild(contentElement);
    }
  };

  buildContent(currentShape, currentColor);
  cleanups.push(() => { if (contentCleanup) contentCleanup(); });

  const syncGeometry = (): void => {
    const { x, y } = positionSignal.value;
    const { width, height } = dimensionsSignal.value;
    root.setAttribute('transform', `translate(${x},${y})`);
    if (updateSize) updateSize(width, height);
  };

  cleanups.push(positionSignal.subscribe(syncGeometry));
  cleanups.push(dimensionsSignal.subscribe(syncGeometry));
  
  // Initial sync
  syncGeometry();

  const instance: EntityInstance = {
    id: props.id,
    element: root,
    position: positionSignal,
    dimensions: dimensionsSignal,
    cleanup: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; },
    notifyAnchorConnected: () => {},
    updateMetadata: (metadata: any) => {
      let needsRebuild = false;
      if (metadata.shape !== undefined && metadata.shape !== currentShape) {
        currentShape = metadata.shape;
        needsRebuild = true;
      }
      if (metadata.color !== undefined && metadata.color !== currentColor) {
        currentColor = metadata.color;
        needsRebuild = true;
      }
      if (metadata.properties !== undefined) {
        dummyStore.signal.set({ ...dummyStore.signal.value, properties: metadata.properties } as any);
      }
      if (needsRebuild) {
        buildContent(currentShape, currentColor);
        syncGeometry(); 
      }
    }
  };

  return instance;
};
