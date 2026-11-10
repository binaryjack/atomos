// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxAction, ReduxState, ReduxStore } from '../../shared/types/redux-state.types.js';
import type { AppSettings } from '../settings-page/types/settings-page.types.js';

export interface McpWorkspaceEvent {
  readonly type: 'settings-updated' | 'schema-created' | 'schema-renamed' | 'schema-deleted' | 'schema-activated' | 'state-loaded'
    | 'canvas-created' | 'canvas-renamed' | 'canvas-deleted' | 'canvas-activated';
  readonly settings?: AppSettings;
  readonly id?: string;
  readonly name?: string;
  readonly state?: ReduxState;
}

type ToAction = (ev: McpWorkspaceEvent) => ReduxAction | null;

const named = (type: 'schema-created' | 'schema-renamed' | 'canvas-created' | 'canvas-renamed'): ToAction =>
  ev => (ev.id && ev.name ? { type, id: ev.id, name: ev.name } : null);

const byId = (type: 'schema-deleted' | 'schema-activated' | 'canvas-deleted' | 'canvas-activated'): ToAction =>
  ev => (ev.id ? { type, id: ev.id } : null);

const TRANSLATORS: Readonly<Record<McpWorkspaceEvent['type'], ToAction>> = {
  'state-loaded': ev => (ev.state ? { type: 'state-loaded', state: ev.state } : null),
  'settings-updated': ev => (ev.settings ? { type: 'settings-updated', settings: ev.settings } : null),
  'schema-created': named('schema-created'),
  'schema-renamed': named('schema-renamed'),
  'schema-deleted': byId('schema-deleted'),
  'schema-activated': byId('schema-activated'),
  'canvas-created': named('canvas-created'),
  'canvas-renamed': named('canvas-renamed'),
  'canvas-deleted': byId('canvas-deleted'),
  'canvas-activated': byId('canvas-activated'),
};

/** Translates a server `workspace` SSE event into a store action (ignores unknown / incomplete events). */
export const applyMcpWorkspaceEvent = (store: ReduxStore, ev: McpWorkspaceEvent): void => {
  const translate = TRANSLATORS[ev.type];
  const action = translate ? translate(ev) : null;
  if (action) store.dispatch(action);
};
