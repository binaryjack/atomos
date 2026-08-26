import React, { useEffect, useRef } from 'react';
import { createNeuraInstance, type NeuraInstance } from '../create-neura-instance.js';
import type { NeuraNode } from '../core/neura-store.js';
import type { ShaderTheme } from '../renderer/webgl-engine.js';
import type { PhysicsParams } from '../physics/worker.js';

export interface NanoMeshNeuraBackdropHandle {
  setCognitiveCharge: (level: number, originSlotId?: number) => void;
  fireThinkingPulse: (color?: string) => void;
  releaseCognitiveCharge: (activeSlotId: number) => void;
  getInstance: () => NeuraInstance | null;
}

export interface NeuraBackdropProps {
  readonly initialNodeCount?: number;
  readonly theme?: ShaderTheme;
  readonly physicsParams?: Partial<PhysicsParams>;
  readonly cognitiveCharge?: number;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly onNodeClick?: (node: NeuraNode | null) => void;
  readonly onNodeHover?: (node: NeuraNode | null) => void;
  readonly onFPS?: (fps: number) => void;
  readonly onInstanceReady?: (instance: NeuraInstance) => void;
  readonly handleRef?: React.MutableRefObject<NanoMeshNeuraBackdropHandle | null>;
}

export function NeuraBackdrop({
  initialNodeCount = 500,
  theme = 'cyber',
  physicsParams,
  cognitiveCharge = 0.0,
  className,
  style,
  onNodeClick,
  onNodeHover,
  onFPS,
  onInstanceReady,
  handleRef,
}: NeuraBackdropProps) {
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

    const handle: NanoMeshNeuraBackdropHandle = {
      setCognitiveCharge: (level: number, originSlotId?: number) => {
        instanceRef.current?.setCognitiveCharge(level, originSlotId);
      },
      fireThinkingPulse: (color?: string) => {
        instanceRef.current?.fireThinkingPulse(color);
      },
      releaseCognitiveCharge: (activeSlotId: number) => {
        instanceRef.current?.releaseCognitiveCharge(activeSlotId);
      },
      getInstance: () => instanceRef.current,
    };

    if (handleRef) {
      handleRef.current = handle;
    }

    if (onInstanceReady) {
      onInstanceReady(instance);
    }

    return () => {
      if (handleRef) {
        handleRef.current = null;
      }
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (instanceRef.current && theme) {
      instanceRef.current.setShaderTheme(theme);
    }
  }, [theme]);

  const isFirstPhysicsRender = useRef(true);
  useEffect(() => {
    if (isFirstPhysicsRender.current) {
      isFirstPhysicsRender.current = false;
      return;
    }
    if (instanceRef.current && physicsParams) {
      instanceRef.current.setPhysicsParams(physicsParams);
    }
  }, [physicsParams]);

  useEffect(() => {
    if (instanceRef.current && cognitiveCharge !== undefined) {
      instanceRef.current.setCognitiveCharge(cognitiveCharge);
    }
  }, [cognitiveCharge]);

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
