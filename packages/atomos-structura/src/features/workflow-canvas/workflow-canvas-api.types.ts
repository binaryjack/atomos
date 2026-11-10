// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Unsubscribe } from '../../shared/lib/create-typed-emitter.js';
import type { CanvasEventMap } from '../../shared/workflow-canvas/canvas-events.types.js';
import type { ConnectionOptions, ConnectionValidator, PortRef } from '../../shared/workflow-canvas/connection-validation.types.js';
import type { OverlayController } from '../../shared/workflow-canvas/overlay-store.js';
import type { DocumentValidationResult, WorkflowCanvasDocument } from '../../shared/workflow-document/model/document.types.js';
import type { NodeTypeRegistry } from '../../shared/workflow-node/model/node-type-registry.js';
import type { AddNodeInput } from '../../shared/workflow-node/model/node-type.types.js';
import type { ConnectResult } from './create-node-commands.js';

/** Workflow-designer API of one canvas instance (returned by `createCanvasPage`). */
export interface WorkflowCanvasApi {
  /** Per-canvas node type registry: `canvas.nodeTypes.register(def)`. */
  readonly nodeTypes: NodeTypeRegistry;
  /** Runtime execution overlay — not stored in the document, never undoable. */
  readonly overlay: OverlayController;
  /** Adds a node of a registered type (ports resolved from config). Returns the node id. */
  readonly addNode: (input: AddNodeInput) => string;
  /** Replaces a node's config, re-resolves its ports and drops links to vanished ports (one undo step). */
  readonly updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  readonly removeNodes: (nodeIds: readonly string[]) => void;
  /** Wraps nodes in a new `group` container sized to their bounds. Returns the group id. */
  readonly createGroup: (nodeIds: readonly string[], label?: string) => string;
  /** Moves a node into a group (`null` = top level). */
  readonly setNodeParent: (nodeId: string, parentId: string | null) => void;
  /** Collapse hides children and re-routes crossing edges to boundary proxy ports. */
  readonly setGroupCollapsed: (groupId: string, collapsed: boolean) => void;
  /** Programmatic, validated connection between two typed ports. */
  readonly connect: (source: PortRef, target: PortRef) => ConnectResult;
  /** Custom validator run after the built-in checks; `null` removes it. */
  readonly setConnectionValidator: (validator: ConnectionValidator | null) => void;
  /** Built-in check options: `isAssignable`, `preventCycles`, `topology`. */
  readonly setConnectionOptions: (options: ConnectionOptions) => void;
  /** Groups every change made inside `fn` into ONE undo step. */
  readonly transaction: <T>(label: string, fn: () => T) => T;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  /** Typed event subscription; returns the unsubscribe function. */
  readonly on: <K extends keyof CanvasEventMap>(event: K, handler: (payload: CanvasEventMap[K]) => void) => Unsubscribe;
  readonly exportDocument: () => WorkflowCanvasDocument;
  /** Validates (migrating v1 workspace JSON) and applies atomically; never applies partially. */
  readonly importDocument: (input: unknown) => DocumentValidationResult;
  readonly getSelection: () => readonly string[];
  readonly setSelection: (nodeIds: readonly string[]) => void;
  readonly selectAll: () => void;
  readonly clearSelection: () => void;
  readonly deleteSelection: () => void;
  readonly copySelection: () => number;
  readonly paste: () => readonly string[];
}
