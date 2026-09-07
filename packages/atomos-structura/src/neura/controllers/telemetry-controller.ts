// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type {
  NeuraEdge,
  NeuraEnergyBeam,
  NeuraNode,
  NodeActivityState,
  NodeMorphology,
  EdgeMorphology,
  CognitiveEmotion,
  BrainWaveType,
  ThinkingPulseState,
  SynapticLightningState,
} from '../core/neura-store.js';
import { generateBeamId, bfsShortestPath } from '../core/neura-telemetry.js';

export interface TelemetryStoreBridge {
  getNodes: () => Record<string, NeuraNode>;
  getEdges: () => Record<string, NeuraEdge>;
  getCognitiveCharge: () => number;
  setNodeActivity: (nodeId: string, activity: number, state?: NodeActivityState) => void;
  setNodeMorphology: (nodeId: string, morphology: NodeMorphology) => void;
  setEdgeMorphology: (edgeId: string, morphology: EdgeMorphology) => void;
  setCognitiveEmotion: (emotion: CognitiveEmotion, intensity?: number) => void;
  setBrainWaveOscillation: (waveType: BrainWaveType, freq?: number, amp?: number) => void;
  triggerTurgorPulse: (nodeId: string, peakDilation?: number, durationMs?: number, attackMs?: number) => void;
  triggerSynapticLightning: (lightning: SynapticLightningState) => void;
  addEnergyBeam: (beam: NeuraEnergyBeam) => void;
  setCognitiveChargeStore: (charge: number) => void;
  setThinkingPulseStore: (pulse: ThinkingPulseState | null) => void;
  resetAllActivities: () => void;
}

export class TelemetryController {
  private bridge: TelemetryStoreBridge;

  constructor(bridge: TelemetryStoreBridge) {
    this.bridge = bridge;
  }

  public setNodeActivity(nodeId: string, activity: number, nodeState?: NodeActivityState): void {
    this.bridge.setNodeActivity(nodeId, activity, nodeState);
  }

  public triggerEnergyBeam(
    sourceId: string,
    targetId: string,
    color = '#00d4ff',
    durationMs = 800
  ): void {
    const beam: NeuraEnergyBeam = {
      id: generateBeamId(),
      sourceId,
      targetId,
      progress: 0,
      color,
      durationMs,
      startedAt: performance.now(),
    };
    this.bridge.addEnergyBeam(beam);
  }

  public pulseNode(nodeId: string, durationMs = 400, _color?: string): void {
    const nodes = this.bridge.getNodes();
    const node = nodes[nodeId];
    if (!node) return;

    const previousActivity = node.activity ?? 0;
    this.bridge.setNodeActivity(nodeId, 1.0, node.state ?? 'firing');

    // Quadratic ease-out decay back to baseline
    const startTime = performance.now();
    const decayLoop = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 2);
      const currentActivity = 1.0 - (1.0 - previousActivity) * ease;

      this.bridge.setNodeActivity(nodeId, currentActivity);

      if (progress < 1.0) {
        requestAnimationFrame(decayLoop);
      }
    };
    requestAnimationFrame(decayLoop);
  }

  public resetAllActivities(): void {
    this.bridge.resetAllActivities();
  }

  public highlightRoute(sourceId: string, targetId: string, keepActive = false): void {
    const edges = this.bridge.getEdges();
    const edgePath = bfsShortestPath(sourceId, targetId, edges);
    if (!edgePath || edgePath.length === 0) return;

    this.bridge.setNodeActivity(sourceId, 0.8, 'routing');
    this.bridge.setNodeActivity(targetId, 0.8, 'active');

    let delay = 0;
    const beamDuration = 600;
    const stepDelay = 300;

    for (const edgeId of edgePath) {
      const edge = edges[edgeId];
      if (!edge) continue;

      const capturedSourceId = edge.sourceId;
      const capturedTargetId = edge.targetId;

      setTimeout(() => {
        this.triggerEnergyBeam(capturedSourceId, capturedTargetId, '#00d4ff', beamDuration);
        if (keepActive) {
          this.bridge.setNodeActivity(capturedSourceId, 0.6, 'routing');
          this.bridge.setNodeActivity(capturedTargetId, 0.6, 'routing');
        }
      }, delay);

      delay += stepDelay;
    }
  }

  public setCognitiveCharge(level: number, originSlotId?: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, level));
    this.bridge.setCognitiveChargeStore(clamped);

    if (clamped > 0.05) {
      const nodes = this.bridge.getNodes();
      const centralNodeId = originSlotId !== undefined
        ? (`slot-${originSlotId}` in nodes ? `slot-${originSlotId}` : `n${originSlotId}`)
        : (nodes['n0'] ? 'n0' : Object.keys(nodes)[0]);

      if (centralNodeId && nodes[centralNodeId]) {
        const edges = this.bridge.getEdges();
        const connectedEdges = Object.values(edges).filter(
          e => e.sourceId === centralNodeId || e.targetId === centralNodeId
        );

        if (connectedEdges.length > 0) {
          const edge = connectedEdges[Math.floor(Math.random() * connectedEdges.length)];
          if (edge) {
            this.triggerEnergyBeam(edge.sourceId, edge.targetId, '#38bdf8', 600);
          }
        }
      }
    }
  }

  public fireThinkingPulse(
    colorOrOrigin: string | [number, number, number] = '#38bdf8',
    durationOrColor: number | string = 1500,
    maybeColor = '#38bdf8'
  ): void {
    let color = '#38bdf8';
    let origin: [number, number, number] = [0, 0, 0];
    let durationMs = 1500;

    if (Array.isArray(colorOrOrigin) && colorOrOrigin.length >= 3) {
      origin = [colorOrOrigin[0], colorOrOrigin[1], colorOrOrigin[2]];
      if (typeof durationOrColor === 'number') durationMs = durationOrColor;
      if (typeof maybeColor === 'string') color = maybeColor;
    } else if (typeof colorOrOrigin === 'string') {
      color = colorOrOrigin;
      if (typeof durationOrColor === 'number') durationMs = durationOrColor;
    }

    const nodes = this.bridge.getNodes();
    let maxR = 1200;
    for (const key in nodes) {
      const n = nodes[key]!;
      const r = Math.hypot(n.x, n.y, n.z ?? 0);
      if (r > maxR) maxR = r;
    }

    this.bridge.setThinkingPulseStore({
      active: true,
      startTime: performance.now(),
      durationMs,
      color,
      origin,
      maxRadius: maxR * 1.2,
    });
  }

  public releaseCognitiveCharge(activeSlotId: number): void {
    const nodes = this.bridge.getNodes();
    const targetSlotId = `slot-${activeSlotId}` in nodes
      ? `slot-${activeSlotId}`
      : `n${activeSlotId}` in nodes
      ? `n${activeSlotId}`
      : Object.keys(nodes)[0];

    if (targetSlotId && nodes[targetSlotId]) {
      const edges = this.bridge.getEdges();
      const connectedEdges = Object.values(edges).filter(
        e => e.sourceId === targetSlotId || e.targetId === targetSlotId
      );

      for (const edge of connectedEdges) {
        const source = edge.sourceId === targetSlotId ? edge.targetId : edge.sourceId;
        this.triggerEnergyBeam(source, targetSlotId, '#f59e0b', 700);
      }

      this.bridge.setNodeActivity(targetSlotId, 1.0, 'active');
    }

    const startCharge = this.bridge.getCognitiveCharge();
    const startTime = performance.now();

    const decayLoop = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / 800);
      const ease = 1 - Math.pow(1 - progress, 2);
      const currentCharge = startCharge * (1.0 - ease);

      this.bridge.setCognitiveChargeStore(currentCharge);

      if (progress < 1.0) {
        requestAnimationFrame(decayLoop);
      }
    };

    requestAnimationFrame(decayLoop);
  }

  public setNodeMorphology(nodeId: string, morphology: NodeMorphology): void {
    this.bridge.setNodeMorphology(nodeId, morphology);
  }

  public setEdgeMorphology(edgeId: string, morphology: EdgeMorphology): void {
    this.bridge.setEdgeMorphology(edgeId, morphology);
  }

  public setCognitiveEmotion(emotion: CognitiveEmotion, intensity = 1.0): void {
    this.bridge.setCognitiveEmotion(emotion, intensity);
  }

  public triggerTurgorPulse(
    nodeId: string,
    peakDilation = 1.6,
    durationMs = 700,
    attackMs = 120
  ): void {
    this.bridge.triggerTurgorPulse(nodeId, peakDilation, durationMs, attackMs);
  }

  public triggerSynapticLightning(
    sourceId: string,
    targetId: string,
    color = '#00FFFF',
    durationMs = 450
  ): void {
    const id = `lightning_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.bridge.triggerSynapticLightning({
      id,
      sourceId,
      targetId,
      color,
      durationMs,
      startedAt: performance.now(),
      jaggedness: 0.8,
      branches: 3,
    });
  }

  public setBrainWaveOscillation(waveType: BrainWaveType, freq?: number, amp = 0.5): void {
    this.bridge.setBrainWaveOscillation(waveType, freq, amp);
  }
}
