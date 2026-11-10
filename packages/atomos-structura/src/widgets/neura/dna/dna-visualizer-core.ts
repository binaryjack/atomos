// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraInstance } from '../create-neura-instance.js';
import type { NeuraNode, NeuraEdge } from '../core/neura-store.js';
import type {
  DnaOrganVisualPlugin,
  DnaCableVisualPlugin,
  DnaStimulusControl,
  StimulusExecutionResult,
} from './dna-plugin-types.js';

export interface DnaVisualizerListener {
  onOrganLoaded?: (organ: DnaOrganVisualPlugin) => void;
  onCableLoaded?: (cable: DnaCableVisualPlugin) => void;
  onStimulusDispatched?: (result: StimulusExecutionResult) => void;
}

export class DnaVisualizerCore {
  private readonly neura: NeuraInstance;
  private readonly organs = new Map<string, DnaOrganVisualPlugin>();
  private readonly cables = new Map<string, DnaCableVisualPlugin>();
  private readonly listeners = new Set<DnaVisualizerListener>();

  // In-memory accumulated graph
  private nodesMap = new Map<string, NeuraNode>();
  private edgesMap = new Map<string, NeuraEdge>();

  constructor(neura: NeuraInstance) {
    this.neura = neura;
  }

  public addListener(listener: DnaVisualizerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getOrgan(name: string): DnaOrganVisualPlugin | undefined {
    return this.organs.get(name);
  }

  public getCable(name: string): DnaCableVisualPlugin | undefined {
    return this.cables.get(name);
  }

  public getAllOrgans(): DnaOrganVisualPlugin[] {
    return Array.from(this.organs.values());
  }

  public getAllCables(): DnaCableVisualPlugin[] {
    return Array.from(this.cables.values());
  }

  public getAllStimulusControls(): DnaStimulusControl[] {
    const controls: DnaStimulusControl[] = [];
    for (const organ of this.organs.values()) {
      for (const ctrl of organ.stimulus_controls) {
        controls.push(ctrl);
      }
    }
    return controls;
  }

  /**
   * Loads and integrates an organ's 3D visual twin into the Neura universe.
   */
  public loadOrganPlugin(plugin: DnaOrganVisualPlugin): void {
    this.organs.set(plugin.organ_name, plugin);

    const ox = plugin.anchor_offset.x;
    const oy = plugin.anchor_offset.y;
    const oz = plugin.anchor_offset.z;

    // 1. Ingest neuron nodes
    for (const node of plugin.nodes) {
      const neuraNode: NeuraNode = {
        id: node.id,
        x: node.x + ox,
        y: node.y + oy,
        z: node.z + oz,
        weight: node.weight,
        appartenanceId: plugin.organ_name,
        visible: true,
        activity: 0.1,
        state: 'idle',
        morphology: plugin.dimension === '4D' ? 'quantum_crystal' : 'soma_spherical',
        metadata: {
          organName: plugin.organ_name,
          layerIndex: node.layer_index,
          neuronIndex: node.neuron_index,
          themeName: plugin.theme_name,
          colorTheme: plugin.color_theme,
        },
      };
      this.nodesMap.set(node.id, neuraNode);
    }

    // 2. Ingest membrane sockets as oracle/anchor nodes
    for (const socket of plugin.sockets) {
      const socketNodeId = `${plugin.organ_name}:${socket.name}`;
      const socketNode: NeuraNode = {
        id: socketNodeId,
        x: socket.x + ox,
        y: socket.y + oy,
        z: socket.z + oz,
        weight: 2.0,
        appartenanceId: plugin.organ_name,
        visible: true,
        activity: 0.6,
        state: 'active',
        morphology: 'ring_oracle',
        metadata: {
          organName: plugin.organ_name,
          socketName: socket.name,
          role: socket.role,
          tensorDim: socket.tensor_dim,
          isSocket: true,
        },
      };
      this.nodesMap.set(socketNodeId, socketNode);

      // Connect socket to first matching neurons in organ
      const candidateNeurons = plugin.nodes.filter((n) =>
        socket.role === 'ingress' ? n.layer_index === 0 : true
      );
      const targetNeuron = candidateNeurons[0] ?? plugin.nodes[0];
      if (targetNeuron) {
        const socketEdgeId = `edge_${socketNodeId}_to_${targetNeuron.id}`;
        this.edgesMap.set(socketEdgeId, {
          id: socketEdgeId,
          sourceId: socket.role === 'ingress' ? socketNodeId : targetNeuron.id,
          targetId: socket.role === 'ingress' ? targetNeuron.id : socketNodeId,
          weight: 1.0,
          visible: true,
          morphology: 'quantum_flow',
        });
      }
    }

    this.commitGraph();

    for (const listener of this.listeners) {
      listener.onOrganLoaded?.(plugin);
    }
  }

  /**
   * Loads and integrates a synaptic cable's 3D visual twin into the Neura universe.
   */
  public loadCablePlugin(plugin: DnaCableVisualPlugin): void {
    this.cables.set(plugin.cable_name, plugin);

    for (const edge of plugin.edges) {
      const neuraEdge: NeuraEdge = {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        weight: edge.weight,
        visible: true,
        morphology: plugin.has_adaptation ? 'myelinated_tube' : 'quantum_flow',
        flowVelocity: 1.5,
      };
      this.edgesMap.set(edge.id, neuraEdge);
    }

    this.commitGraph();

    for (const listener of this.listeners) {
      listener.onCableLoaded?.(plugin);
    }
  }

  /**
   * Dispatches an out-of-the-box self-describing stimulus control directly to the 3D Neura engine.
   */
  public async dispatchStimulus(controlId: string, paramValue?: number): Promise<StimulusExecutionResult> {
    const control = this.findControl(controlId);
    if (!control) {
      return {
        controlId,
        action: 'unknown',
        success: false,
        timestamp: performance.now(),
        dispatchedEffects: [],
      };
    }

    const effects: string[] = [];
    const organName = this.findOrganNameForControl(controlId);

    switch (control.action) {
      case 'dna_neural_infer': {
        effects.push('neural_inference_cascade');
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ) {
            const ingressSocket = organ.sockets.find((s) => s.role === 'ingress');
            const targetNodeId = ingressSocket ? `${organName}:${ingressSocket.name}` : organ.nodes[0]?.id;

            if (targetNodeId) {
              this.neura.pulseNode(targetNodeId, 500, organ.color_theme);
              effects.push(`pulsed_socket:${targetNodeId}`);
            }

            // Propagate along neurons
            const cycles = paramValue ?? (typeof control.default === 'number' ? control.default : 4);
            effects.push(`deliberation_cycles:${cycles}`);

            for (let i = 0; i < organ.nodes.length; i++) {
              const node = organ.nodes[i];
              if (!node) continue;
              setTimeout(() => {
                this.neura.setNodeActivity(node.id, 1.0, 'firing');
                setTimeout(() => {
                  this.neura.setNodeActivity(node.id, 0.2, 'idle');
                }, 300);
              }, i * 20);
            }

            this.neura.fireThinkingPulse(organ.color_theme, 600);
            effects.push('thinking_pulse_emitted');
          }
        }
        break;
      }

      case 'inject_surprise_residual': {
        effects.push('conflict_spike');
        this.neura.setCognitiveEmotion('conflict', 1.0);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ && organ.nodes.length >= 2) {
            const n1 = organ.nodes[0];
            const n2 = organ.nodes[organ.nodes.length - 1];
            if (n1 && n2) {
              this.neura.triggerSynapticLightning(n1.id, n2.id, '#ef4444', 800);
              effects.push(`synaptic_lightning:${n1.id}->${n2.id}`);
            }
          }
        }
        // Auto-resolve after 1200ms
        setTimeout(() => {
          this.neura.setCognitiveEmotion('harmonic_focus', 0.8);
        }, 1200);
        break;
      }

      case 'dna_atp_transfer': {
        effects.push('atp_metabolic_transfer');
        const fromOrgan = (control.args?.['from_organ'] as string) ?? 'aura_allostasis';
        const toOrgan = (control.args?.['to_organ'] as string) ?? 'aura_cns_trunk';
        const amount = (control.args?.['amount'] as number) ?? 25000;
        effects.push(`transfer:${fromOrgan}->${toOrgan}:${amount}`);

        const fromSocket = `${fromOrgan}:main_features`;
        const toSocket = `${toOrgan}:grid_ingress`;

        this.neura.triggerEnergyBeam(fromSocket, toSocket, '#8b5cf6', 800);
        this.neura.triggerTurgorPulse(toSocket, 1.8, 600, 150);
        this.neura.setCognitiveEmotion('harmonic_focus', 0.9);
        break;
      }

      case 'step_phase': {
        effects.push('thalamic_clock_phase_advance');
        this.neura.setBrainWaveOscillation('gamma', 40.0, 1.2);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ) {
            for (const n of organ.nodes) {
              this.neura.pulseNode(n.id, 250, '#10b981');
            }
          }
        }
        break;
      }

      case 'validate_syntax': {
        effects.push('compile_gate_ast_validation');
        this.neura.triggerEnergyBeam('aura_cns_trunk:main_features', 'aura_compile_gate:grid_ingress', '#ef4444', 500);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ) {
            for (const n of organ.nodes) {
              this.neura.pulseNode(n.id, 300, '#ef4444');
            }
          }
        }
        break;
      }

      case 'generate_refutation': {
        effects.push('popper_falsification_probe');
        this.neura.triggerEnergyBeam('aura_cns_trunk:main_features', 'aura_popper:grid_ingress', '#f97316', 500);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ) {
            for (const n of organ.nodes) {
              this.neura.pulseNode(n.id, 300, '#f97316');
            }
          }
        }
        break;
      }

      case 'step_mcts_tree': {
        effects.push('mcts_tree_expansion_step');
        this.neura.triggerEnergyBeam('aura_cns_trunk:main_features', 'aura_mcts:grid_ingress', '#6366f1', 500);
        this.neura.fireThinkingPulse('#6366f1', 700);
        break;
      }

      case 'audio_tension_modulate': {
        const tensionVal = paramValue ?? 50;
        effects.push(`audio_tension_set:${tensionVal}`);
        this.neura.setBrainWaveOscillation('beta', 20.0 + (tensionVal / 5.0), 1.0);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ?.nodes[0]) {
            this.neura.pulseNode(organ.nodes[0].id, 300, '#ec4899');
          }
        }
        break;
      }

      case 'condition_latents': {
        effects.push('fusion_tensor_cross_attention_conditioning');
        this.neura.triggerEnergyBeam('aura_cns_trunk:main_features', 'aura_fusion_tensor:grid_ingress', '#06b6d4', 600);
        this.neura.setCognitiveEmotion('insight', 1.0);
        break;
      }

      default: {
        effects.push(`generic_action:${control.action}`);
        if (organName) {
          const organ = this.organs.get(organName);
          if (organ?.nodes[0]) {
            this.neura.pulseNode(organ.nodes[0].id, 400);
          }
        }
        break;
      }
    }

    const result: StimulusExecutionResult = {
      controlId,
      action: control.action,
      success: true,
      timestamp: performance.now(),
      dispatchedEffects: effects,
    };

    for (const listener of this.listeners) {
      listener.onStimulusDispatched?.(result);
    }

    return result;
  }

  private findControl(controlId: string): DnaStimulusControl | undefined {
    for (const organ of this.organs.values()) {
      const match = organ.stimulus_controls.find((c) => c.id === controlId);
      if (match) return match;
    }
    return undefined;
  }

  private findOrganNameForControl(controlId: string): string | undefined {
    for (const [name, organ] of this.organs.entries()) {
      if (organ.stimulus_controls.some((c) => c.id === controlId)) {
        return name;
      }
    }
    return undefined;
  }

  private commitGraph(): void {
    const nodes = Array.from(this.nodesMap.values());
    const edges = Array.from(this.edgesMap.values());
    this.neura.loadGraph(nodes, edges);
  }
}
