// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec, TopologicalRules } from '@atomos-web/structura-core';
import type { PortRef } from '../workflow-node/model/port-anchor.js';

export type { PortRef };

export type ConnectionVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface ConnectionGraphNode {
  readonly id: string;
  readonly nodeType?: string;
  /** Empty for ER entities (side anchors); port-level checks are skipped for such nodes. */
  readonly ports: readonly PortSpec[];
}

export interface ConnectionGraphEdge {
  readonly id: string;
  readonly source: PortRef;
  readonly target: PortRef;
}

/** Read-only snapshot of the canvas graph handed to connection validators. */
export interface ConnectionGraph {
  readonly nodes: ReadonlyMap<string, ConnectionGraphNode>;
  readonly edges: readonly ConnectionGraphEdge[];
}

/** Custom validator registered with `canvas.setConnectionValidator`. Runs after the built-in checks pass. */
export type ConnectionValidator = (source: PortRef, target: PortRef, graph: ConnectionGraph) => ConnectionVerdict;

export interface ConnectionOptions {
  /** Data type compatibility. Default: equal types, or either side is `'any'`. */
  readonly isAssignable?: (from: string, to: string) => boolean;
  /** Reject connections that would close a directed cycle. Default: false. */
  readonly preventCycles?: boolean;
  /** Node-type topology rules (allowed sources/targets, max in/out degree). */
  readonly topology?: TopologicalRules;
}

export const ACCEPT: ConnectionVerdict = { ok: true };
export const reject = (reason: string): ConnectionVerdict => ({ ok: false, reason });

export const defaultIsAssignable = (from: string, to: string): boolean =>
  from === to || from === 'any' || to === 'any';
