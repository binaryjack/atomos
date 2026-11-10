// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraNode, NeuraViewport } from '../core/neura-store.js';
import type { WebGLEngine } from '../renderer/webgl-engine.js';

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement;
  webgl: WebGLEngine;
  getViewport: () => NeuraViewport;
  setViewport: (vp: Partial<NeuraViewport>) => void;
  getNodes: () => Record<string, NeuraNode>;
  getHoveredNodeId: () => string | null;
  getSelectedNodeId: () => string | null;
  setHoveredNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  onNodeClick?: ((node: NeuraNode | null) => void) | undefined;
  onNodeHover?: ((node: NeuraNode | null) => void) | undefined;
}

export class InteractionController {
  private canvas: HTMLCanvasElement;
  private webgl: WebGLEngine;
  private getViewport: () => NeuraViewport;
  private setViewport: (vp: Partial<NeuraViewport>) => void;
  private getNodes: () => Record<string, NeuraNode>;
  private getHoveredNodeId: () => string | null;
  private getSelectedNodeId: () => string | null;
  private setHoveredNodeId: (id: string | null) => void;
  private setSelectedNodeId: (id: string | null) => void;
  private onNodeClick?: ((node: NeuraNode | null) => void) | undefined;
  private onNodeHover?: ((node: NeuraNode | null) => void) | undefined;

  private isDraggingState = false;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;

  private onContextMenu: (e: MouseEvent) => void;
  private onMouseDown: (e: MouseEvent) => void;
  private onMouseUp: () => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onClick: () => void;
  private onWheel: (e: WheelEvent) => void;

  constructor(options: InteractionControllerOptions) {
    this.canvas = options.canvas;
    this.webgl = options.webgl;
    this.getViewport = options.getViewport;
    this.setViewport = options.setViewport;
    this.getNodes = options.getNodes;
    this.getHoveredNodeId = options.getHoveredNodeId;
    this.getSelectedNodeId = options.getSelectedNodeId;
    this.setHoveredNodeId = options.setHoveredNodeId;
    this.setSelectedNodeId = options.setSelectedNodeId;
    this.onNodeClick = options.onNodeClick;
    this.onNodeHover = options.onNodeHover;

    this.onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    this.onMouseDown = (e: MouseEvent) => {
      this.isDraggingState = true;
      this.isPanning = e.button === 2 || e.button === 1 || e.shiftKey;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    };

    this.onMouseUp = () => {
      this.isDraggingState = false;
      this.isPanning = false;
    };

    this.onMouseMove = (e: MouseEvent) => {
      if (this.isDraggingState) {
        this.handleDragMove(e);
      } else {
        this.handleHoverDetection(e);
      }
    };

    this.onClick = () => {
      const hoveredId = this.getHoveredNodeId();
      const selectedId = this.getSelectedNodeId();
      const newSelectedId = hoveredId !== selectedId ? hoveredId : null;
      this.setSelectedNodeId(newSelectedId);
      if (this.onNodeClick) {
        const nodes = this.getNodes();
        this.onNodeClick(newSelectedId ? nodes[newSelectedId] ?? null : null);
      }
    };

    this.onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = this.getViewport();
      const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
      const oldZoom = vp.zoom;
      const newZoom = Math.max(0.02, Math.min(oldZoom * zoomDelta, 8.0));

      if (newZoom !== oldZoom) {
        this.setViewport({ zoom: newZoom });
      }
    };

    this.bindEvents();
  }

  public get isDragging(): boolean {
    return this.isDraggingState;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('wheel', this.onWheel);
  }

  private handleDragMove(e: MouseEvent): void {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    const vp = this.getViewport();

    if (this.isPanning) {
      // 3D Camera Pan in screen space
      const zoom = Math.max(0.01, vp.zoom);
      const panSpeed = (950 / zoom) / (this.canvas.clientHeight || 600);
      const yaw = vp.yaw ?? 0;

      const panX = -(dx * Math.cos(yaw) * panSpeed);
      const panY = dy * panSpeed;

      this.setViewport({
        x: vp.x + panX,
        y: vp.y + panY,
      });
    } else {
      // 3D Orbital Rotation (Left Click Drag)
      const currentYaw = vp.yaw ?? 0;
      const currentPitch = vp.pitch ?? 0;

      const newYaw = currentYaw - dx * 0.007;
      const newPitch = Math.max(-1.4, Math.min(1.4, currentPitch + dy * 0.007));

      this.setViewport({
        yaw: newYaw,
        pitch: newPitch,
      });
    }
  }

  private handleHoverDetection(e: MouseEvent): void {
    const vp = this.getViewport();
    const mvp = this.webgl.computeMVPMatrix(vp);
    const canvasW = this.canvas.width || 800;
    const canvasH = this.canvas.height || 600;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestNodeId: string | null = null;
    let minDistance = 22;
    const nodes = this.getNodes();

    for (const key in nodes) {
      const n = nodes[key]!;
      const nx = n.x;
      const ny = n.y;
      const nz = n.z ?? 0;

      const clipX = (mvp[0] ?? 0) * nx + (mvp[4] ?? 0) * ny + (mvp[8] ?? 0) * nz + (mvp[12] ?? 0);
      const clipY = (mvp[1] ?? 0) * nx + (mvp[5] ?? 0) * ny + (mvp[9] ?? 0) * nz + (mvp[13] ?? 0);
      const clipW = (mvp[3] ?? 0) * nx + (mvp[7] ?? 0) * ny + (mvp[11] ?? 0) * nz + (mvp[15] ?? 0);

      if (clipW > 0.1) {
        const sx = ((clipX / clipW) * 0.5 + 0.5) * canvasW;
        const sy = (1.0 - ((clipY / clipW) * 0.5 + 0.5)) * canvasH;

        const dist = Math.hypot(mouseX - sx, mouseY - sy);
        const hitRadius = minDistance + Math.min(20, n.weight) * 2;

        if (dist < hitRadius && dist < minDistance) {
          minDistance = dist;
          closestNodeId = n.id;
        }
      }
    }

    const currentHoveredId = this.getHoveredNodeId();
    if (currentHoveredId !== closestNodeId) {
      this.setHoveredNodeId(closestNodeId);
      if (this.onNodeHover) {
        this.onNodeHover(closestNodeId ? nodes[closestNodeId] ?? null : null);
      }
    }
  }

  public destroy(): void {
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
