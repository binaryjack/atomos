import { NeuraNode, NeuraEdge, NeuraViewport } from '../core/neura-store';

/**
 * Spatial Index and Culling System
 * Handles "Render-In-Range" and Semantic Zooming ("In-Depth Swapping")
 */
export class CullingSystem {
  private overflowPadding: number; // Extra pixels to render outside viewport to avoid clipping during pan

  constructor(padding: number = 200) {
    this.overflowPadding = padding;
  }

  /**
   * Filters out nodes and edges that are not visible within the padded viewport.
   */
  public cull(
    nodes: Record<string, NeuraNode>,
    edges: Record<string, NeuraEdge>,
    viewport: NeuraViewport
  ): { visibleNodes: NeuraNode[], visibleEdges: NeuraEdge[] } {
    
    const minX = viewport.x - this.overflowPadding;
    const maxX = viewport.x + viewport.width + this.overflowPadding;
    const minY = viewport.y - this.overflowPadding;
    const maxY = viewport.y + viewport.height + this.overflowPadding;

    const visibleNodes: NeuraNode[] = [];
    const visibleNodeIds = new Set<string>();

    // 1. Cull Nodes (and determine semantic zoom level)
    for (const key in nodes) {
      const node = nodes[key];
      // Basic bounding box check
      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        // TODO: Semantic zoom logic based on viewport.zoom
        // If zoom is very low (macro), maybe we only push "cluster/appartenance" representative nodes
        // If zoom is high (micro), we push everything
        visibleNodes.push(node);
        visibleNodeIds.add(node.id);
      }
    }

    // 2. Cull Edges (only render if both source and target are visible, or at least one is)
    const visibleEdges: NeuraEdge[] = [];
    for (const key in edges) {
      const edge = edges[key];
      if (visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)) {
        visibleEdges.push(edge);
      }
    }

    return { visibleNodes, visibleEdges };
  }
}
