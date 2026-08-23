import type { NeuraNode, NeuraEdge, NeuraViewport } from '../core/neura-store.js';

/**
 * Spatial Index and Culling System
 * Handles "Render-In-Range" and Semantic Zooming ("In-Depth Swapping")
 */
export class CullingSystem {
  private overflowPadding: number;

  constructor(padding: number = 600) {
    this.overflowPadding = padding;
  }

  /**
   * Filters out nodes and edges that are not visible within the padded viewport.
   * Screen coordinate formula:
   * screenX = (worldX + viewport.x) * viewport.zoom
   * worldX = screenX / viewport.zoom - viewport.x
   */
  public cull(
    nodes: Record<string, NeuraNode>,
    edges: Record<string, NeuraEdge>,
    viewport: NeuraViewport
  ): { visibleNodes: NeuraNode[]; visibleEdges: NeuraEdge[] } {
    const zoom = Math.max(0.001, viewport.zoom);
    const canvasW = viewport.width || 1920;
    const canvasH = viewport.height || 1080;

    // Convert screen corners (0,0) and (canvasW, canvasH) with generous padding to world coordinates
    const padding = this.overflowPadding / zoom;
    const minWorldX = -viewport.x - padding;
    const maxWorldX = canvasW / zoom - viewport.x + padding;
    const minWorldY = -viewport.y - padding;
    const maxWorldY = canvasH / zoom - viewport.y + padding;

    const visibleNodes: NeuraNode[] = [];
    const visibleNodeIds = new Set<string>();

    for (const key in nodes) {
      const node = nodes[key]!;
      if (
        node.x >= minWorldX &&
        node.x <= maxWorldX &&
        node.y >= minWorldY &&
        node.y <= maxWorldY
      ) {
        visibleNodes.push(node);
        visibleNodeIds.add(node.id);
      }
    }

    const visibleEdges: NeuraEdge[] = [];
    for (const key in edges) {
      const edge = edges[key]!;
      if (visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId)) {
        visibleEdges.push(edge);
      }
    }

    return { visibleNodes, visibleEdges };
  }
}
