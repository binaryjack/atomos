# Canvas Settings & Application Architecture Plan

## 1. Architectural Layout & Navigation
- **The Top Demo Menu**: The overarching top navigation (`Components | Canevas | Modal | Formular`) remains intact. This is the main shell for the `web-ui` demo pages used to demonstrate features and components.
- **The Body View Swapping**: The "Canevas" is the main body view, which encapsulates the canvas itself, its toolbars, and its navigation panels.
- **The Settings Transition**: When entering "Settings", the application **replaces** the entire Canvas layout (body) with the Settings Page. It is not an overlay or a popup—it's a complete view swap within the body, below the main top menu.

## 2. Reusable Tabs Web-Component
- The Settings view will rely on a generic, agnostic, and reusable Tabs web-component. 
- This Tab component must be highly abstracted so it can be reused anywhere else in the application, not just tightly coupled to the settings.

## 3. The Settings Page Structure
The Settings Page is a hub for general Canvas and application configuration, broken down into distinct tabs:

### Tab 1: General Canvas Settings 
- Visual configurations (Colors).
- Import/Export utilities for the toolbox.
- System limits (e.g., "Max entities per canvas").
- Current visual notation settings depending on the use case (e.g., MERISE, UML, DB, Entity-Relation).

### Tab 2: Toolbox Editor
- A dedicated tree-based visual editor (Formular integration) used to modify the items, shapes, and categories available in the Canvas sidebar toolbox.

### Tab 3: Decision Matrix Editor
- A modular table system used to add and define rules, constraints, and operational logic for the canvas and specific entities.
- Allows dynamic addition of rows (options) and columns (criteria/rules).

---

## 4. Files Created So Far
The following files have been created during our initial drafts for the Settings Page and Decision Matrix components:

**Decision Matrix Implementation:**
- `packages/web-ui/src/features/decision-matrix/create-decision-matrix.ts`
- `packages/web-ui/src/features/decision-matrix/types/decision-matrix.types.ts` (if applicable)

**Settings Page & Sidebar Implementation:**
- `packages/web-ui/src/features/settings-page/create-settings-page.ts`
- `packages/web-ui/src/features/settings-page/create-settings-tree.ts`
- `packages/web-ui/src/features/settings-page/types/settings-page.types.ts`

**Test Integration Harnesses:**
- `packages/web-ui/test-decision-matrix.html`
- `packages/web-ui/src/test-decision-matrix.ts`
- `packages/web-ui/test-settings-page.html`
- `packages/web-ui/src/test-settings-page.ts`

*(Note: The link and overlay logic previously attempted in `create-canvas-page.ts` and `create-canvas-toolbar.ts` have been removed to respect the View-Swapping architecture detailed in Section 1).*