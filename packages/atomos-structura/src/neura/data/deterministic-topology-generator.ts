// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraNode, NeuraEdge } from '../core/neura-store.js';

/**
 * Generates a deterministic, mathematical 3D spherical topology based on
 * the golden-ratio Fibonacci sphere lattice. Bit-for-bit reproducible, zero randomness.
 */
export function generateDeterministicTopology(numNodes: number): { nodes: NeuraNode[]; edges: NeuraEdge[] } {
  const nodes: NeuraNode[] = [];
  const edges: NeuraEdge[] = [];
  if (numNodes <= 0) return { nodes, edges };

  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const numClusters = Math.max(4, Math.floor(numNodes / 150));
  const spread = 240;

  for (let i = 0; i < numNodes; i++) {
    const id = `n${i}`;
    const clusterIdx = i % numClusters;

    // Fibonacci sphere mapping (deterministic coordinates)
    const yNorm = 1 - (i / Math.max(1, numNodes - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = 2 * Math.PI * i / phi;

    const x = Math.cos(theta) * radiusAtY * spread;
    const z = Math.sin(theta) * radiusAtY * spread;
    const y = yNorm * spread;

    nodes.push({
      id,
      x,
      y,
      z,
      weight: 1.0,
      appartenanceId: `cluster_${clusterIdx}`,
      metadata: { label: `Node ${i}`, cluster: clusterIdx },
      visible: true,
      activity: 0.1,
      state: 'idle',
      morphology: 'soma_spherical',
    });

    // Deterministic k-regular circular lattice connections
    if (i > 0) {
      const parentId = `n${Math.floor((i - 1) / 2)}`;
      edges.push({
        id: `e${edges.length}`,
        sourceId: id,
        targetId: parentId,
        weight: 1,
        visible: true,
        morphology: 'wire',
      });
    }
  }

  return { nodes, edges };
}
