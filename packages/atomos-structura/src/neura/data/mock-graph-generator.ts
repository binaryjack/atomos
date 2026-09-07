// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraNode, NeuraEdge } from '../core/neura-store.js';

/**
 * Generates a synthetic scale-free 3D graph (Barabási–Albert preferential attachment)
 * partitioned into modular clusters with spherical distribution.
 */
export function generateMockGraph(numNodes: number): { nodes: NeuraNode[]; edges: NeuraEdge[] } {
  const nodes: NeuraNode[] = [];
  const edges: NeuraEdge[] = [];
  const degrees: Record<string, number> = {};
  let totalDegree = 0;
  const m = 2;
  const m0 = Math.min(5, numNodes);
  const numClusters = Math.max(4, Math.floor(numNodes / 150));

  for (let i = 0; i < numNodes; i++) {
    const id = `n${i}`;
    degrees[id] = 0;
    let clusterIdx = i % numClusters;

    if (i < m0) {
      for (let j = 0; j < i; j++) {
        const targetId = `n${j}`;
        edges.push({ id: `e${edges.length}`, sourceId: id, targetId, weight: 1, visible: true });
        degrees[id] = (degrees[id] ?? 0) + 1;
        degrees[targetId] = (degrees[targetId] ?? 0) + 1;
        totalDegree += 2;
      }
    } else {
      const targets = new Set<string>();
      let attempts = 0;
      while (targets.size < m && targets.size < i && attempts < 40) {
        attempts++;
        let r = Math.random() * totalDegree;
        let selectedTarget = 'n0';
        for (let j = 0; j < i; j++) {
          const tj = `n${j}`;
          r -= degrees[tj] || 0;
          if (r <= 0) {
            selectedTarget = tj;
            break;
          }
        }
        targets.add(selectedTarget);
      }

      let first = true;
      for (const targetId of targets) {
        edges.push({ id: `e${edges.length}`, sourceId: id, targetId, weight: 1, visible: true });
        degrees[id] = (degrees[id] ?? 0) + 1;
        degrees[targetId] = (degrees[targetId] ?? 0) + 1;
        totalDegree += 2;

        if (first) {
          const targetNode = nodes.find(n => n.id === targetId);
          if (targetNode) {
            const clusterMatch = targetNode.appartenanceId.match(/\d+/);
            if (clusterMatch) clusterIdx = Number(clusterMatch[0]);
          }
          first = false;
        }
      }
    }

    // Spherical distribution in 3D space
    const spread = Math.sqrt(numNodes) * 45;
    const rPos = Math.sqrt(Math.random()) * spread;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    nodes.push({
      id,
      x: rPos * Math.sin(phi) * Math.cos(theta),
      y: rPos * Math.sin(phi) * Math.sin(theta),
      z: rPos * Math.cos(phi) * 0.7,
      weight: 0,
      appartenanceId: `cluster_${clusterIdx}`,
      metadata: {
        label: `Node ${i}`,
        appartenance: `Cluster ${clusterIdx}`,
      },
      visible: true,
    });
  }

  // Normalize degrees to determine node weights
  let maxDegree = 1;
  for (const id in degrees) {
    const d = degrees[id] ?? 0;
    if (d > maxDegree) maxDegree = d;
  }
  for (const node of nodes) {
    node.weight = (degrees[node.id] ?? 0) / maxDegree;
  }

  return { nodes, edges };
}
