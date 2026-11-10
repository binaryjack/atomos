// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { type EdgeState, isNodeStatus, type NodeState, normalizeProgress } from '../workflow-node/model/node-state.types.js';

/** A collaborator shown on the overlay layer (remote selection). */
export interface PeerPresence {
  readonly name: string;
  readonly color: string;
  readonly nodeIds: readonly string[];
}

export type OverlayChange =
  | { readonly kind: 'node'; readonly id: string; readonly state: NodeState | undefined }
  | { readonly kind: 'edge'; readonly id: string; readonly state: EdgeState | undefined }
  | { readonly kind: 'presence'; readonly peerId: string; readonly presence: PeerPresence | undefined }
  | { readonly kind: 'clear' };

/**
 * Runtime overlay (execution status) — lives outside the document and the undo history.
 * Writing to it never dispatches to the store.
 */
export interface OverlayController {
  readonly setNodeState: (nodeId: string, state: NodeState) => void;
  readonly setEdgeState: (edgeId: string, state: EdgeState) => void;
  readonly clearNode: (nodeId: string) => void;
  readonly clear: () => void;
  readonly getNodeState: (nodeId: string) => NodeState | undefined;
  readonly getEdgeState: (edgeId: string) => EdgeState | undefined;
  /** Sets (or removes with `null`) a collaborator's presence; never touches the document. */
  readonly setPresence: (peerId: string, presence: PeerPresence | null) => void;
  /** Collaborators whose selection includes `nodeId`. */
  readonly peersOn: (nodeId: string) => readonly PeerPresence[];
  readonly subscribe: (listener: (change: OverlayChange) => void) => () => void;
}

const sanitize = (state: NodeState): NodeState => {
  if (!isNodeStatus(state.status)) throw new Error(`Unknown node status '${String(state.status)}'`);
  const progress = normalizeProgress(state.progress);
  return {
    status: state.status,
    ...(state.label !== undefined ? { label: state.label } : {}),
    ...(progress !== undefined ? { progress } : {}),
  };
};

export const createOverlayStore = function(): OverlayController {
  const nodes = new Map<string, NodeState>();
  const edges = new Map<string, EdgeState>();
  const peers = new Map<string, PeerPresence>();
  const listeners = new Set<(change: OverlayChange) => void>();
  const notify = (change: OverlayChange): void => listeners.forEach(listener => listener(change));

  return {
    setNodeState: (nodeId, state) => {
      const clean = sanitize(state);
      nodes.set(nodeId, clean);
      notify({ kind: 'node', id: nodeId, state: clean });
    },
    setEdgeState: (edgeId, state) => {
      const clean: EdgeState = { active: Boolean(state.active) };
      edges.set(edgeId, clean);
      notify({ kind: 'edge', id: edgeId, state: clean });
    },
    clearNode: nodeId => {
      if (nodes.delete(nodeId)) notify({ kind: 'node', id: nodeId, state: undefined });
    },
    clear: () => {
      nodes.clear();
      edges.clear();
      notify({ kind: 'clear' });
    },
    getNodeState: nodeId => nodes.get(nodeId),
    getEdgeState: edgeId => edges.get(edgeId),
    setPresence: (peerId, presence) => {
      if (presence) peers.set(peerId, { ...presence, nodeIds: [...presence.nodeIds] });
      else if (!peers.delete(peerId)) return;
      notify({ kind: 'presence', peerId, presence: presence ?? undefined });
    },
    peersOn: nodeId => Array.from(peers.values()).filter(peer => peer.nodeIds.includes(nodeId)),
    subscribe: listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
};
