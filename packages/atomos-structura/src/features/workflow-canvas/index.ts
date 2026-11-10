// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
// Public API of the workflow-designer canvas (re-exported from the package root).
export type { PortDirection, PortSpec } from '@atomos-web/structura-core';
export type { WorkflowCanvasApi } from './workflow-canvas-api.types.js';
export type { ConnectResult } from './create-node-commands.js';
export type { CanvasEventMap, CanvasEventName } from '../../shared/workflow-canvas/canvas-events.types.js';
export {
  defaultIsAssignable,
  type ConnectionGraph,
  type ConnectionGraphEdge,
  type ConnectionGraphNode,
  type ConnectionOptions,
  type ConnectionValidator,
  type ConnectionVerdict,
  type PortRef,
} from '../../shared/workflow-canvas/connection-validation.types.js';
export { validateConnection } from '../../shared/workflow-canvas/validate-connection.js';
export type { OverlayChange, OverlayController } from '../../shared/workflow-canvas/overlay-store.js';
export type { SelectionModel } from '../../shared/workflow-canvas/selection-model.js';
export { createNodeTypeRegistry, type NodeTypeRegistry } from '../../shared/workflow-node/model/node-type-registry.js';
export type { AddNodeInput, NodeRenderContext, NodeTypeDefinition } from '../../shared/workflow-node/model/node-type.types.js';
export {
  NODE_STATUSES,
  type EdgeState,
  type NodeState,
  type NodeStatus,
} from '../../shared/workflow-node/model/node-state.types.js';
export { PORT_ANCHOR_SEPARATOR, parsePortAnchorId, toPortAnchorId } from '../../shared/workflow-node/model/port-anchor.js';
export { layoutPorts, type PortPlacement } from '../../shared/workflow-node/model/port-layout.js';
export { bindCanvasKeyboard, CANVAS_SHORTCUTS, type CanvasKeyboardActions } from '../canvas-keyboard/bind-canvas-keyboard.js';
export type { ViewerEntityPatch, ViewerExecutionPatch } from '../../widgets/structura-viewer/lib/patch-viewer-entity.js';
export type { PeerPresence } from '../../shared/workflow-canvas/overlay-store.js';
// Layout (ELK layered), groups, culling, BPMN interchange, collaboration
export { runElkLayout, type ElkLayoutResult } from '../../shared/core/application/layout/elk-layered-layout.js';
export { buildElkGraph, type ElkLayoutSettings } from '../../shared/core/application/layout/elk-graph.js';
export {
  GROUP_NODE_TYPE, ancestorsOf, computeProxyPorts, descendantsOf, isHiddenByCollapse, visibleEndpoint,
} from '../../shared/workflow-canvas/group-model.js';
export { GROUP_NODE_DEFINITION } from '../../shared/workflow-canvas/group-node-type.js';
export { createDomCuller, type CullStats, type DomCullerOptions } from '../viewport-culling/create-dom-culler.js';
export { mountViewportCulling, type ViewportCullingHandle } from '../viewport-culling/mount-viewport-culling.js';
export { exportBpmn } from '../bpmn-interchange/export-bpmn.js';
export { importBpmn, type XmlParser } from '../bpmn-interchange/import-bpmn.js';
export { BPMN_FLOW_NODES, type BpmnFlowNodeType } from '../bpmn-interchange/bpmn-model.js';
export { createYjsBinding, type YjsBinding, type YjsBindingOptions } from '../collaboration/create-yjs-binding.js';
