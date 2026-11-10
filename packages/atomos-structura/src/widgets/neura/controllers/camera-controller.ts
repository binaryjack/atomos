// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraNode, NeuraViewport } from '../core/neura-store.js';

export interface CameraControllerOptions {
  canvas: HTMLCanvasElement;
  getViewport: () => NeuraViewport;
  setViewport: (vp: Partial<NeuraViewport>) => void;
  getNode: (id: string) => NeuraNode | undefined;
  onFlyComplete?: ((nodeId: string) => void) | undefined;
}

export class CameraController {
  private canvas: HTMLCanvasElement;
  private getViewport: () => NeuraViewport;
  private setViewport: (vp: Partial<NeuraViewport>) => void;
  private getNode: (id: string) => NeuraNode | undefined;
  private onFlyComplete?: ((nodeId: string) => void) | undefined;
  private animationRaf: number | null = null;

  constructor(options: CameraControllerOptions) {
    this.canvas = options.canvas;
    this.getViewport = options.getViewport;
    this.setViewport = options.setViewport;
    this.getNode = options.getNode;
    this.onFlyComplete = options.onFlyComplete;
  }

  public flyToNode(nodeId: string, targetZoom = 1.2, durationMs = 600): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    if (this.animationRaf !== null) {
      cancelAnimationFrame(this.animationRaf);
    }

    const currentVp = this.getViewport();
    const startX = currentVp.x;
    const startY = currentVp.y;
    const startZoom = currentVp.zoom;

    const endX = node.x;
    const endY = node.y;
    const endZoom = targetZoom;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

      const curX = startX + (endX - startX) * ease;
      const curY = startY + (endY - startY) * ease;
      const curZoom = startZoom + (endZoom - startZoom) * ease;

      this.setViewport({ x: curX, y: curY, zoom: curZoom });

      if (progress < 1.0) {
        this.animationRaf = requestAnimationFrame(animate);
      } else {
        this.animationRaf = null;
        if (this.onFlyComplete) {
          this.onFlyComplete(nodeId);
        }
      }
    };

    this.animationRaf = requestAnimationFrame(animate);
  }

  public setCameraRotation(yaw: number, pitch: number): void {
    this.setViewport({
      yaw,
      pitch: Math.max(-1.4, Math.min(1.4, pitch)),
    });
  }

  public setAutoRotate(enabled: boolean, speed = 0.5): void {
    this.setViewport({ autoRotate: enabled, autoRotateSpeed: speed });
  }

  public resetCamera(): void {
    const canvasW = this.canvas.width || 1200;
    const canvasH = this.canvas.height || 800;
    this.setViewport({
      x: 0,
      y: 0,
      zoom: 0.35,
      yaw: 0,
      pitch: 0,
      width: canvasW,
      height: canvasH,
    });
  }

  public updateAutoRotate(isDragging: boolean): void {
    const vp = this.getViewport();
    if (vp.autoRotate && !isDragging) {
      const currentYaw = vp.yaw ?? 0;
      const speed = (vp.autoRotateSpeed ?? 0.5) * 0.004;
      this.setViewport({ yaw: (currentYaw + speed) % (2 * Math.PI) });
    }
  }

  public destroy(): void {
    if (this.animationRaf !== null) {
      cancelAnimationFrame(this.animationRaf);
      this.animationRaf = null;
    }
  }
}
