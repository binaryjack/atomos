// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';

/** Workflow fields carried losslessly through the domain, repository and store layers. */
export interface WorkflowEntityFields {
  readonly nodeType?: string | undefined;
  readonly config?: Record<string, unknown> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly ports?: readonly PortSpec[] | undefined;
  /** Containing group node id (groups / subflows). */
  readonly parentId?: string | undefined;
}

/** Options accepted when creating an entity aggregate. */
export interface EntityCreationOptions extends WorkflowEntityFields {
  readonly shape?: string;
  readonly color?: string;
  readonly description?: string;
  readonly defaultCollapsed?: boolean;
  readonly collapsed?: boolean;
}

/** Appearance + workflow fields of an existing entity, as creation options (for clone / import / paste). */
export const toCreationOptions = (source: WorkflowEntityFields & {
  readonly shape?: string | undefined; readonly color?: string | undefined; readonly description?: string | undefined;
  readonly collapsed?: boolean | undefined; readonly defaultCollapsed?: boolean | undefined;
}): EntityCreationOptions => ({
  ...(source.shape !== undefined ? { shape: source.shape } : {}),
  ...(source.color !== undefined ? { color: source.color } : {}),
  ...(source.description !== undefined ? { description: source.description } : {}),
  ...(source.collapsed !== undefined ? { collapsed: source.collapsed } : {}),
  ...(source.defaultCollapsed !== undefined ? { defaultCollapsed: source.defaultCollapsed } : {}),
  ...pickWorkflowFields(source),
});

/** Copies only the workflow fields that are defined (exactOptionalPropertyTypes-safe). */
export const pickWorkflowFields = (source: WorkflowEntityFields | undefined): WorkflowEntityFields => ({
  ...(source?.nodeType !== undefined ? { nodeType: source.nodeType } : {}),
  ...(source?.config !== undefined ? { config: { ...source.config } } : {}),
  ...(source?.metadata !== undefined ? { metadata: { ...source.metadata } } : {}),
  ...(source?.ports !== undefined ? { ports: [...source.ports] } : {}),
  ...(source?.parentId !== undefined ? { parentId: source.parentId } : {}),
});
