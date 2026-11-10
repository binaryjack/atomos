// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkflowDocumentEdge, WorkflowDocumentNode } from '../workflow-document/model/document.types.js';
import type { PortRef } from '../workflow-node/model/port-anchor.js';

/** Typed payloads of `canvas.on(event, handler)`. */
export interface CanvasEventMap {
  /** Any document change (nodes, edges, configs, positions). `revision` increases monotonically. */
  readonly change: { readonly revision: number };
  readonly 'node:added': { readonly node: WorkflowDocumentNode };
  readonly 'node:removed': { readonly nodeId: string };
  readonly 'node:config-changed': {
    readonly nodeId: string;
    readonly config: Readonly<Record<string, unknown>>;
    readonly previous: Readonly<Record<string, unknown>>;
  };
  readonly 'edge:added': { readonly edge: WorkflowDocumentEdge };
  readonly 'edge:removed': { readonly edgeId: string };
  readonly 'selection:changed': { readonly nodeIds: readonly string[] };
  readonly 'connection:rejected': { readonly source: PortRef; readonly target: PortRef; readonly reason: string };
}

export type CanvasEventName = keyof CanvasEventMap;
