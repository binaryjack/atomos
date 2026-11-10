// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';

/** Context handed to a custom node renderer. */
export interface NodeRenderContext {
  readonly nodeId: string;
  readonly type: string;
  readonly label: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly ports: readonly PortSpec[];
  readonly size: { readonly width: number; readonly height: number };
}

/** Declarative definition of a workflow node type, registered per canvas instance. */
export interface NodeTypeDefinition {
  readonly type: string;
  readonly label: string;
  readonly category?: string;
  readonly ports: readonly PortSpec[] | ((config: Readonly<Record<string, unknown>>) => readonly PortSpec[]);
  /** JSON Schema describing `config`. Stored for consumers (inspectors, validators). */
  readonly configSchema?: Record<string, unknown>;
  /** Optional custom body renderer. The returned element is mounted inside the node frame. */
  readonly render?: (ctx: NodeRenderContext) => HTMLElement;
  /** Default node size when the caller does not supply one. */
  readonly defaultSize?: { readonly width: number; readonly height: number };
}

/** Input of `canvas.addNode`. */
export interface AddNodeInput {
  readonly type: string;
  readonly id?: string;
  readonly label?: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly size?: { readonly width: number; readonly height: number };
  readonly config?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}
