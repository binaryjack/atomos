// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import { createTypedEmitter, type TypedEmitter } from '../lib/create-typed-emitter.js';
import { createNodeTypeRegistry, type NodeTypeRegistry } from '../workflow-node/model/node-type-registry.js';
import type { CanvasEventMap } from './canvas-events.types.js';
import type { ConnectionOptions, ConnectionValidator } from './connection-validation.types.js';
import { GROUP_NODE_DEFINITION } from './group-node-type.js';
import { createOverlayStore, type OverlayController } from './overlay-store.js';
import { createSelectionModel, type SelectionModel } from './selection-model.js';

/** A rendered port handle, registered so connection previews can highlight it. */
export interface PortHandleRecord {
  readonly anchorId: string;
  readonly nodeId: string;
  readonly port: PortSpec;
  readonly element: SVGGElement;
}

/** Per-canvas-instance runtime shared by the editor layers (never global across canvases). */
export interface CanvasRuntime {
  readonly instanceId: string;
  readonly nodeTypes: NodeTypeRegistry;
  readonly events: TypedEmitter<CanvasEventMap>;
  readonly selection: SelectionModel;
  readonly overlay: OverlayController;
  readonly portHandles: Map<string, PortHandleRecord>;
  validator: ConnectionValidator | null;
  connectionOptions: ConnectionOptions;
}

const runtimes = new Map<string, CanvasRuntime>();

const createRuntime = (instanceId: string): CanvasRuntime => {
  const runtime: CanvasRuntime = {
    instanceId,
    nodeTypes: createNodeTypeRegistry(),
    events: createTypedEmitter<CanvasEventMap>(),
    selection: createSelectionModel(),
    overlay: createOverlayStore(),
    portHandles: new Map(),
    validator: null,
    connectionOptions: {},
  };
  runtime.selection.subscribe(nodeIds => runtime.events.emit('selection:changed', { nodeIds }));
  runtime.nodeTypes.register(GROUP_NODE_DEFINITION);
  return runtime;
};

/** Returns the runtime of a canvas instance, creating it on first access. */
export const getCanvasRuntime = (instanceId: string): CanvasRuntime => {
  const existing = runtimes.get(instanceId);
  if (existing) return existing;
  const runtime = createRuntime(instanceId);
  runtimes.set(instanceId, runtime);
  return runtime;
};

export const destroyCanvasRuntime = (instanceId: string): void => {
  const runtime = runtimes.get(instanceId);
  if (!runtime) return;
  runtime.events.clear();
  runtime.portHandles.clear();
  runtime.overlay.clear();
  runtimes.delete(instanceId);
};
