// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Cardinality, PortSpec, Property, RenderType } from '@atomos-web/structura-core';

export const CURRENT_DOCUMENT_SCHEMA_VERSION = 2 as const;

export interface DocumentPoint {
  readonly x: number;
  readonly y: number;
}

export interface DocumentSize {
  readonly width: number;
  readonly height: number;
}

/** One node of a versioned canvas document. ER fields (properties, shape, …) are optional. */
export interface WorkflowDocumentNode {
  readonly id: string;
  readonly type?: string;
  readonly label: string;
  readonly position: DocumentPoint;
  readonly size: DocumentSize;
  readonly config: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly ports: readonly PortSpec[];
  readonly properties?: readonly Property[];
  readonly shape?: string;
  readonly color?: string;
  readonly description?: string;
  readonly collapsed?: boolean;
}

/** One edge of a versioned canvas document. Port ids are set for workflow links. */
export interface WorkflowDocumentEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly sourcePortId?: string;
  readonly targetPortId?: string;
  readonly sourceAnchorId?: string;
  readonly targetAnchorId?: string;
  readonly sourceCardinality?: Cardinality;
  readonly targetCardinality?: Cardinality;
  readonly sourceProperty?: string;
  readonly targetProperty?: string;
  readonly renderType?: RenderType;
  readonly direction?: 'default' | 'left' | 'right';
}

export interface DocumentViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Versioned, self-describing canvas document (`exportDocument` / `importDocument`). */
export interface WorkflowCanvasDocument {
  readonly schemaVersion: typeof CURRENT_DOCUMENT_SCHEMA_VERSION;
  readonly nodes: readonly WorkflowDocumentNode[];
  readonly edges: readonly WorkflowDocumentEdge[];
  readonly viewport: DocumentViewport;
}

export type DocumentErrorCode =
  | 'invalid-json'
  | 'invalid-type'
  | 'missing-field'
  | 'invalid-value'
  | 'duplicate-id'
  | 'dangling-edge'
  | 'unknown-port'
  | 'unsupported-version';

export interface DocumentValidationError {
  /** JSON-pointer-like location, e.g. `/nodes/3/position/x`. */
  readonly path: string;
  readonly code: DocumentErrorCode;
  readonly message: string;
}

export type DocumentValidationResult =
  | { readonly ok: true; readonly document: WorkflowCanvasDocument; readonly migratedFrom?: 1 }
  | { readonly ok: false; readonly errors: readonly DocumentValidationError[] };
