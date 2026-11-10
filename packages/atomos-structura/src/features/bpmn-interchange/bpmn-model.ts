// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';

export const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
export const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
export const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
export const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';

/**
 * Supported BPMN 2.0 subset. Node `type` in the canvas document equals the BPMN element name;
 * `subProcess` maps to the canvas `group` container.
 */
export const BPMN_FLOW_NODES = [
  'startEvent', 'endEvent', 'task', 'serviceTask', 'userTask', 'exclusiveGateway', 'parallelGateway',
] as const;

export type BpmnFlowNodeType = (typeof BPMN_FLOW_NODES)[number];

export const isBpmnFlowNode = (value: string | undefined): value is BpmnFlowNodeType =>
  value !== undefined && (BPMN_FLOW_NODES as readonly string[]).includes(value);

const IN: PortSpec = { id: 'in', direction: 'in', dataType: 'any', multiple: true };
const OUT: PortSpec = { id: 'out', direction: 'out', dataType: 'any', multiple: true };

/** Ports given to imported BPMN nodes: events have one side, tasks and gateways both. */
export const bpmnPorts = (type: BpmnFlowNodeType): PortSpec[] => {
  if (type === 'startEvent') return [OUT];
  if (type === 'endEvent') return [IN];
  return [IN, OUT];
};

/** Default diagram sizes (BPMN modeler conventions). */
export const bpmnDefaultSize = (type: BpmnFlowNodeType | 'subProcess'): { width: number; height: number } => {
  if (type === 'startEvent' || type === 'endEvent') return { width: 36, height: 36 };
  if (type === 'exclusiveGateway' || type === 'parallelGateway') return { width: 50, height: 50 };
  if (type === 'subProcess') return { width: 350, height: 200 };
  return { width: 100, height: 80 };
};
