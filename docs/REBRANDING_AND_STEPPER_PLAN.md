# Rebranding & Agnostic Stepper Plan

## 1. Rebranding Strategy
We are transitioning to a cohesive, professional ecosystem leveraging the legacy of the `atomos` brand:

* **`atomos-prime`**: The enterprise-grade, W3C-standard Web Component UI library (formerly `web-ui`).
* **`atomos-structura`**: The visual schema builder and application core (formerly `vbs`).

### Prefix Conventions (In-Code Short-hands)
To keep code clean and tag names concise, we will use the following minimal prefixes:
* **`atp-`** (Atomos Prime): Used for all UI Web Component tags and internal core naming (e.g., `<atp-stepper>`, `create-atp-stepper.ts`).
* **`ats-`** (Atomos Structura): Used for the visual schema builder components and core types (e.g., `ats-canvas`, `ats-store`).

### Package Renaming Map
* `packages/web-ui` ➡️ `packages/atomos-prime`
* `packages/vbs` ➡️ `packages/atomos-structura`
* `packages/vbs-mod` ➡️ `packages/atomos-structura-core`
* `packages/vbs-style` ➡️ `packages/atomos-prime-style`
* `packages/vbs-mcp` ➡️ `packages/atomos-structura-mcp`

## 2. Agnostic Stepper Architecture
We are porting the `atomos.dev` React Stepper into the new W3C Web Component architecture, ensuring it remains fully library-agnostic.

### Key Technical Translation
1. **Context & State (`useStepperContext`)**:
   * Translated to DOM Event dispatching and attribute mirroring.
   * State variables (`isActive`, `isValid`, `currentStep`) mapped strictly to `observedAttributes`.
2. **Component Tree (`<atp-stepper>`, `<atp-step>`, `<atp-stepper-header>`)**:
   * Built rigidly following the Enterprise W3C constraints (Static `<template>` cloning; NO `innerHTML` in constructors).
3. **Form Adapter**:
   * We will maintain the adapter pattern (`FormAdapter`) to ensure the stepper can seamlessly plug into `Formular` or any vanilla JS/DOM data collection without requiring React.

## 3. Migration Execution Steps
1. Rename all physical directories in `/packages/`.
2. Update all `"name"` fields in the `package.json` of each workspace.
3. Update `pnpm-workspace.yaml` (if applicable) and cross-dependencies.
4. Execute a global Find & Replace for old package/import names to the new ones (`vbs-mod` -> `atomos-structura-core`, etc.).
5. Scaffold the agnostic `<atp-stepper>` components.
