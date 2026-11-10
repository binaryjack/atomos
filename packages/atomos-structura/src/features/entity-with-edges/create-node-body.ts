// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createEntitySettingsModal } from '../modal/create-entity-settings-modal.js';
import { createCompactEntityContent } from './create-compact-entity-content.js';
import { createCustomNodeContent } from './create-custom-node-content.js';
import { createEntityContent } from './create-entity-content.js';
import type { DemoEntityProps } from './types/demo-entity.types.js';

export interface NodeBody {
  readonly rootElement: SVGElement;
  readonly dragHandle: HTMLElement | SVGElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly cleanup: { readonly destroy: () => void };
}

type CompactShape = Parameters<typeof createCompactEntityContent>[0]['shape'];

const openSettings = (props: DemoEntityProps): void => {
  const modal = createEntitySettingsModal(props.instanceId, props.id);
  document.body.appendChild(modal);
  modal.open().catch((error: unknown) => console.error('[Structura] Entity settings failed:', error));
};

const createTableBody = (props: DemoEntityProps, shape: string | undefined, color: string | undefined): NodeBody =>
  createEntityContent({
    instanceId: props.instanceId,
    entityStore: props.entityStore,
    globalConfig: props.globalConfig,
    storageProvider: props.storageProvider,
    color,
    shape: shape || 'rectangle',
    isReadonly: !!props.isReadonly,
    onDelete: () => props.workspace.unregisterEntity(props.id),
    onSettingsClick: () => openSettings(props),
    // Only grow height — never shrink below the user's manually-resized value, and leave
    // logical dimensions untouched while collapsed.
    onHeightChange: (h) => {
      if (!props.entityStore.signal.value.collapsed && h > props.dimensions.value.height) {
        props.dimensions.set({ width: props.dimensions.value.width, height: h });
      }
    },
  });

const createCompactBody = (props: DemoEntityProps, shape: string, color: string | undefined): NodeBody => {
  const content = createCompactEntityContent({
    shape: shape as CompactShape,
    color,
    isReadonly: !!props.isReadonly,
    entitySignal: props.entityStore.signal,
    onDelete: () => props.workspace.unregisterEntity(props.id),
    onDoubleClick: () => {
      import('./create-entity-drawer.js').then(({ createEntityDrawer }) => {
        createEntityDrawer(props.id, content.rootElement.getBoundingClientRect(), {
          instanceId: props.instanceId,
          entityStore: props.entityStore,
          globalConfig: props.globalConfig,
          storageProvider: props.storageProvider,
          color,
          onDelete: () => props.workspace.unregisterEntity(props.id),
          onSettingsClick: () => openSettings(props),
          // Height constraints do not apply inside the floating drawer.
          onHeightChange: (h: number) => void h,
        });
      }).catch((error: unknown) => console.error('[Structura] Entity drawer failed:', error));
    },
  });
  return content;
};

/** Node body: custom node-type renderer, ER table (box/rectangle) or compact shape. */
export const createNodeBody = (
  props: DemoEntityProps, shape: string | undefined, color: string | undefined, size: { width: number; height: number }
): NodeBody => {
  if (props.renderBody) return createCustomNodeContent(props.renderBody, size);
  if (shape === 'box' || shape === 'rectangle' || !shape) return createTableBody(props, shape, color);
  return createCompactBody(props, shape, color);
};
