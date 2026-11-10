// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Direction of a typed node port. Inputs render on the left, outputs on the right. */
export type PortDirection = 'in' | 'out';

/**
 * Typed connection handle declared by a workflow node.
 *
 * - `dataType` is matched by the canvas connection validator (`'any'` is a wildcard by default).
 * - `multiple`: for inputs, whether more than one incoming link is accepted (default `false`);
 *   for outputs, whether more than one outgoing link is accepted (default `true`).
 */
export interface PortSpec {
  readonly id: string;
  readonly label?: string;
  readonly direction: PortDirection;
  readonly dataType: string;
  readonly required?: boolean;
  readonly multiple?: boolean;
}
