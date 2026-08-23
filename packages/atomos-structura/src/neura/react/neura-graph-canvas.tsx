import React, { useEffect, useRef } from 'react';
import { createNeuraInstance, type NeuraInstance, type NeuraInstanceOptions } from '../create-neura-instance.js';
import type { NeuraNode } from '../core/neura-store.js';
import type { ShaderTheme } from '../renderer/webgl-engine.js';
import type { PhysicsParams } from '../physics/worker.js';

export interface NeuraGraphCanvasProps {
  readonly initialNodeCount?: number;
  readonly theme?: ShaderTheme;
  readonly physicsParams?: Partial<PhysicsParams>;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly onNodeClick?: (node: NeuraNode | null) => void;
  readonly onNodeHover?: (node: NeuraNode | null) => void;
  readonly onFPS?: (fps: number) => void;
  readonly onInstanceReady?: (instance: NeuraInstance) => void;
}

export function NeuraGraphCanvas({
  initialNodeCount = 1000,
  theme = 'normal',
  physicsParams,
  className,
  style,
  onNodeClick,
  onNodeHover,
  onFPS,
  onInstanceReady,
}: NeuraGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<NeuraInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const instance = createNeuraInstance(canvasRef.current, {
      theme,
      physicsParams,
      onNodeClick,
      onNodeHover,
      onFPS,
    });

    instanceRef.current = instance;
    instance.generateMockData(initialNodeCount);

    if (onInstanceReady) {
      onInstanceReady(instance);
    }

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (instanceRef.current && theme) {
      instanceRef.current.setShaderTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (instanceRef.current && physicsParams) {
      instanceRef.current.setPhysicsParams(physicsParams);
    }
  }, [physicsParams]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          outline: 'none',
        }}
      />
    </div>
  );
}

export function useNeuraGraph(canvasRef: React.RefObject<HTMLCanvasElement | null>, options: NeuraInstanceOptions = {}) {
  const instanceRef = useRef<NeuraInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const instance = createNeuraInstance(canvasRef.current, options);
    instanceRef.current = instance;

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [canvasRef]);

  return instanceRef;
}
