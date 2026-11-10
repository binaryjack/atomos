// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import type { WorkflowCanvasApi } from '../workflow-canvas/workflow-canvas-api.types.js';
import { readSharedDocument, sharedGraphOf, sharedMatches, writeDocumentToShared } from './yjs-document-sync.js';

export interface YjsBindingOptions {
  /** Presence channel: local selection is published, remote selections drawn on the overlay. */
  readonly awareness?: Awareness;
  readonly user?: { readonly name: string; readonly color: string };
}

export interface YjsBinding {
  readonly destroy: () => void;
}

type BindableCanvas = Pick<WorkflowCanvasApi, 'exportDocument' | 'importDocument' | 'on' | 'overlay' | 'getSelection' | 'setSelection'>;

const LOCAL_ORIGIN = Symbol('structura-local');

interface RemotePresence { readonly name?: unknown; readonly color?: unknown; readonly nodeIds?: unknown }
interface AwarenessChange { readonly added: number[]; readonly updated: number[]; readonly removed: number[] }

const showPeer = (canvas: BindableCanvas, awareness: Awareness, id: number): void => {
  const presence = (awareness.getStates().get(id) as { presence?: RemotePresence | null } | undefined)?.presence;
  if (!presence) {
    canvas.overlay.setPresence(String(id), null);
    return;
  }
  canvas.overlay.setPresence(String(id), {
    name: typeof presence.name === 'string' ? presence.name : `Peer ${id}`,
    color: typeof presence.color === 'string' ? presence.color : '#f472b6',
    nodeIds: Array.isArray(presence.nodeIds) ? presence.nodeIds.filter((n): n is string => typeof n === 'string') : [],
  });
};

const bindAwareness = (canvas: BindableCanvas, awareness: Awareness, user: { name: string; color: string }): (() => void) => {
  const publish = (nodeIds: readonly string[]): void => awareness.setLocalStateField('presence', { ...user, nodeIds: [...nodeIds] });
  publish(canvas.getSelection());
  const offSelection = canvas.on('selection:changed', ({ nodeIds }) => publish(nodeIds));
  const onChange = ({ added, updated, removed }: AwarenessChange): void => {
    [...added, ...updated].filter(id => id !== awareness.clientID).forEach(id => showPeer(canvas, awareness, id));
    removed.forEach(id => canvas.overlay.setPresence(String(id), null));
  };
  awareness.on('change', onChange);
  return () => {
    offSelection();
    awareness.off('change', onChange);
    awareness.setLocalStateField('presence', null);
  };
};

/**
 * Optional Yjs binding: nodes and edges live in Y.Maps of `ydoc`. Local edits are written in
 * one Yjs transaction per canvas change; remote edits are validated and applied as one canvas
 * transaction (one undo step). Remote selections are shown on the overlay layer via awareness.
 */
export const createYjsBinding = (canvas: BindableCanvas, ydoc: Y.Doc, options: YjsBindingOptions = {}): YjsBinding => {
  const graph = sharedGraphOf(ydoc);
  let applyingRemote = false;

  const pushLocal = (): void => {
    if (applyingRemote) return;
    const doc = canvas.exportDocument();
    if (!sharedMatches(graph, doc)) ydoc.transact(() => writeDocumentToShared(graph, doc), LOCAL_ORIGIN);
  };

  const applyShared = (): void => {
    const current = canvas.exportDocument();
    if (sharedMatches(graph, current)) return;
    const selection = canvas.getSelection();
    applyingRemote = true;
    try {
      const result = canvas.importDocument(readSharedDocument(graph, current.viewport));
      if (!result.ok) console.error('[Structura] Rejected remote Yjs document:', result.errors);
      else canvas.setSelection(selection.filter(id => result.document.nodes.some(n => n.id === id)));
    } finally {
      applyingRemote = false;
    }
  };

  const pullRemote = (_event: unknown, transaction: Y.Transaction): void => {
    if (transaction.origin !== LOCAL_ORIGIN) applyShared();
  };

  // Seed: an empty shared doc adopts the local canvas; otherwise the shared state wins.
  if (graph.nodes.size === 0 && graph.edges.size === 0) pushLocal();
  else applyShared();

  const offChange = canvas.on('change', pushLocal);
  graph.nodes.observe(pullRemote);
  graph.edges.observe(pullRemote);
  const offAwareness = options.awareness
    ? bindAwareness(canvas, options.awareness, { name: options.user?.name ?? 'Anonymous', color: options.user?.color ?? '#38bdf8' })
    : () => undefined;

  return {
    destroy: () => {
      offChange();
      graph.nodes.unobserve(pullRemote);
      graph.edges.unobserve(pullRemote);
      offAwareness();
    },
  };
};
