# VBE Architecture Roadmap: Visual Workflow Engine

This document outlines the strategic path to evolve VBE from a static schema designer into a fully functional, configurable, and framework-agnostic Visual Workflow Engine. Its ultimate goal is to serve as the visual authoring surface for the `@ai-agencee/engine` DAG orchestrator, replacing ReactFlow.

---

## 1. Core Visuals & Data Types (Visual Vocabulary)
To represent true workflows (like flowchart logic), we must break out of purely rectangular bounds.

*   **Diverse Entity Shapes**: Introduce semantic shapes mapped to nodes.
    *   *Supported shapes*: Rectangle, Diamond (decisions), Circle, Oval (Start/End), Trapeze, Parallelogram, Chevron.
    *   *Property Fallback*: Since compact shapes (like circles) cannot elegantly render large HTML property tables inline, double-clicking them will open an external Property Modal.
*   **Dynamic Property Inputs**: Properties must strictly respect data types.
    *   Instead of raw text everywhere, properties will map to specific UI controls (boolean $\rightarrow$ checkbox/toggle, enum $\rightarrow$ select, text $\rightarrow$ textarea).
    *   Integrates with `@binaryjack/formular.dev` to construct the property form dynamically from the entity's schema.

## 2. Meta-Schema & Connection Constraints (Validation Matrix)
We cannot allow arbitrary graph connections (e.g., a "Start" node looping into itself). The environment needs a configurable ruleset.

*   **Constraint Matrix**: A configurable table/JSON that dictates which source node types can connect to which target node types.
*   **Cardinality & Direction Rules**: 
    *   `Start` node: Max inputs = 0, Max outputs = 1 (or N).
    *   `End` node: Max inputs = N, Max outputs = 0.
*   **Link Authoring Interception**: The `LinkDrawController` will query this constraint matrix in real-time. If a user tries to drag a wire to an invalid shape, the drop will be rejected (with visual feedback).
*   **Editing UI**: A dedicated settings view providing a Matrix Table or raw JSON editor to configure these topological rules per VBE instance.

## 3. The Framework-Agnostic Engine API (The React Bridge)
VBE must remain pure vanilla TypeScript (no classes, declarative data) while seamlessly powering the `dag-editor` in React.

*   **Headless Store Subscription**: The VBE adapter will expose a `subscribe` method that perfectly satisfies React's `useSyncExternalStore` hook. This isolates VBE from React while allowing React components (like side panels) to re-render instantly on VBE state changes.
*   **Configurable Node Registry**: VBE will not hardcode concepts like "Lanes" or "Barriers". Instead, it will expose a registry where the consuming application can inject Definitions:
    ```typescript
    vbe.registerNodeTypes({
      'ai-lane': { shape: 'rectangle', color: '#0f172a' },
      'barrier': { shape: 'diamond', color: '#ef4444' }
    });
    ```
*   **Seamless DAG Serialization**: Adapters that instantly fold and unfold VBE's internal `Entity` and `Link` representations into the `@ai-agencee/engine`'s exact `DagDefinition` JSON (mapping Links to `dependsOn` arrays).

---

## 4. Proposed Implementation Path (Priority Ordered)

### Phase 1: Data Model & Shape Rendering
*The foundation. We need the UI to draw the shapes before we can connect them.*
1.  Extend `@vbs/vbs-mod` `Entity` schema with `shape` type and `nodeType` descriptors.
2.  Extend `Property` with `inputType` definitions (`text`, `boolean`, `enum`).
3.  Update the SVG renderer (`create-demo-entity.ts`) to substitute `<rect>` with path/polygons based on `shape`.
4.  Wire up double-click to open property `Modal` for non-rectangular shapes using `@binaryjack/formular.dev`.

### Phase 2: The Meta-Schema & Constraint Engine
*Governance. Before exposing the graph to outside worlds, it must self-regulate.*
1.  Define the `MetaSchema` interface determining connection validity (sourceType $\rightarrow$ targetType map).
2.  Update `LinkDrawController` to validate hover targets against the MetaSchema.
3.  Implement a UI view / JSON editor to allow developers to configure these rules.

### Phase 3: Headless API & React Hook Bridge
*Integration readiness. Preparing VBE for injection into the host application.*
1.  Isolate VBE state into an exposed `subscribe` signature.
2.  Create the Node Type Registry so the host can define custom behaviors and mapping.
3.  Write documentation/examples on utilizing `useSyncExternalStore` with VBE.

### Phase 4: AI-Agencee DAG Serialization
*The final mile. Creating the exact data output needed by the DAG Orchestrator.*
1.  Implement `serializeToDag()` (translates Entities to `lanes` / `barriers` and links to `dependsOn`).
2.  Implement `parseFromDag()` (translates `DagDefinition` back into VBE coordinates with an auto-layout pass).

---

## Appendix: Canvas UX Enhancements (Backlog)
*   **Grid Snapping & Smart Guidelines**
*   **Multi-Selection & Box Select**
*   **Advanced Orthogonal Link Routing**
*   **DOM-based Context Menus**
*   **Undo/Redo History**
*   **Navigation Minimap**