import { createSignal, createGlobalStore } from 'atomos-prime';

export interface NeuraNode {
  id: string;
  x: number;
  y: number;
  weight: number;
  appartenanceId: string;
  metadata: Record<string, any>;
  visible: boolean; // Managed by culling system
}

export interface NeuraEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  visible: boolean; // Managed by culling system
}

export interface NeuraViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface NeuraState {
  nodes: Record<string, NeuraNode>;
  edges: Record<string, NeuraEdge>;
  viewport: NeuraViewport;
}

export function createNeuraStore() {
  const store = createGlobalStore<NeuraState>({
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 }
  });

  const setViewport = (viewport: Partial<NeuraViewport>) => {
    store.set(state => ({
      ...state,
      viewport: { ...state.viewport, ...viewport }
    }));
  };

  const addNodes = (nodes: NeuraNode[]) => {
    store.set(state => {
      const newNodes = { ...state.nodes };
      for (const node of nodes) {
        newNodes[node.id] = node;
      }
      return { ...state, nodes: newNodes };
    });
  };

  const addEdges = (edges: NeuraEdge[]) => {
    store.set(state => {
      const newEdges = { ...state.edges };
      for (const edge of edges) {
        newEdges[edge.id] = edge;
      }
      return { ...state, edges: newEdges };
    });
  };

  return {
    store,
    setViewport,
    addNodes,
    addEdges
  };
}
