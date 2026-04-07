# Session Handoff — April 7, 2026

## What We Did

### Context
Working on `@atomos/structura` — a schema designer canvas application inside the `d:\Sources\vbe2` pnpm monorepo.

### Problem
The previous AI session introduced commit `7bf3c91` ("feat: enhance appearance settings and styling options") which caused a **visual regression**: all shaped entities (diamond, cylinder, actor, note, etc.) lost their visible design — shapes appeared invisible or unstyled.

---

## Root Causes Found & Fixed

### 1. `contrast.textColor` removed from compact entity text nodes
**File:** `create-compact-entity-content.ts`  
**Issue:** AI replaced adaptive per-entity contrast text color with a global CSS class. Text became a fixed color regardless of entity background — invisible on dark entities.  
**Fix:** Restored `textNode.style.fill = contrast.textColor` and `propsNode.style.fill = contrast.mutedColor` as inline styles (inline wins over CSS class).

### 2. `getComputedStyle` inside hot `updateSize()` path
**File:** `create-compact-entity-content.ts`  
**Issue:** `getComputedStyle(document.documentElement)` was called inside `updateSize()`, which fires on every drag/resize — causing layout thrashing (previously fixed by commit `edd0785` with rAF batching).  
**Fix:** Moved to construction time, cached in `namePy` / `propsPy` constants.

### 3. `applyCommonStyles` stomping element classes
**File:** `apply-common-styles.ts`  
**Issue:** `element.setAttribute('class', 'vbs-entity-shape')` overwrote any existing classes on polygon/ellipse SVG shapes.  
**Fix:** Removed the `setAttribute('class', ...)` call. Fill/stroke set via `element.style.*` (inline style always wins, no need for CSS class override).

### 4. Invalid SVG CSS properties in design-system
**File:** `design-system.ts`  
**Issue:** `.vbs-entity-rect { rx: ...; ry: ...; }` — `rx` and `ry` are SVG **presentation attributes**, not CSS properties. CSS cannot set them. They were silently ignored.  
**Fix:** Removed those CSS rules from both `injectDesignSystemTokens` and `applyAppearanceTokens`. `rx/ry` are now set directly via `rect.setAttribute('rx', '4')`.

### 5. `defaultShapes` repository shadowing native built-in renderers
**File:** `create-svg-shape.ts`  
**Issue:** The shapes repository (`defaultShapes`) contains entries for `diamond`, `circle`, `oval`, etc. — IDs that match the built-in native renderers. The custom-shape lookup ran **first**, so `diamond` always hit the SVG-string path instead of `createDiamond()`. The custom SVG path used `setAttribute('fill', 'var(...)')` — CSS `var()` does not resolve in SVG presentation attributes.  
**Fix:** Reordered `createSVGShape` — native built-ins switch runs first; custom repository only applies for truly unknown IDs. Also fixed the custom path to use `setAttribute('style', '...')` since `DOMParser` nodes have no `.style` CSSStyleDeclaration before adoption into the main document.

### 6. Font appearance settings only applied to compact SVG shapes, not box entities
**Files:** `create-entity-content.ts`, `create-entity-header.ts`, `create-entity-property-row.ts`, `create-entity-footer.ts`, `create-link-finalizer.ts`  
**Issue:** Box entities render HTML inside `<foreignObject>`. The CSS `.vbs-entity-name` rules only target SVG `<text>` elements — they never hit HTML. Font family/size/weight were hardcoded to `system-ui, sans-serif`, `12px`, `11px`, etc.  
**Fix:** Wired all text-rendering sites to `--vbs-entity-name-*` and `--vbs-entity-props-*` CSS custom properties via inline `style`:
- Entity title (header editable label): `--vbs-entity-name-font-family/size/weight`
- Body container font-family: `--vbs-entity-name-font-family`
- Property key label: `--vbs-entity-props-font-family/size/weight/color`
- Component-type and data-type dropdowns: `--vbs-entity-props-font-size`
- Footer "Add property" button: `--vbs-entity-props-font-family/size`
- Link midpoint label: `--vbs-entity-props-font-family/size`

---

## Architecture Facts Confirmed

- **Shape system:** `createSVGShape()` → native renderers first (diamond, circle, oval, parallelogram, chevron, trapeze + aliases cylinder/actor/document/note) → then user custom shapes by ID → fallback rect.
- **Custom shapes** live in `defaultShapes` (seeded) and are user-editable via Settings > Shapes Editor, persisted to `localStorage` under key `atomos_custom_shapes`.
- **Appearance settings** persist under key `atomos_appearance_settings`. Applied via `applyAppearanceTokens()` which injects/updates a `<style id="vbs-appearance-tokens">` tag, overriding `<style id="vbs-design-system">` defaults.
- **CSS vars hierarchy:** `--vbs-entity-name-*` (title) and `--vbs-entity-props-*` (property rows, link labels, footer). Both groups are injected as `:root` vars so they work in both SVG `<text>` via CSS class AND HTML elements via inline `style: var(--...)`.
- **Box entities** use `foreignObject` + HTML DOM. **Compact shapes** use SVG `<text>` nodes. Both now read from the same CSS vars.
- `applyCommonStyles()` sets fill/stroke via `element.style.*` (inline) — never class attributes.
- `DOMParser` elements have no `.style` CSSOM before document adoption — always use `setAttribute('style', '...')` for cross-document XML nodes.

---

## Commits Made This Session

| SHA | Message |
|---|---|
| `7bf3c91` | (previous AI — regression introduced here) |
| `4fcd355` | fix: update styling to use CSS variables for improved consistency and adaptability |

---

## Next Session Prompt

```
Read the file SESSION_HANDOFF_2026-04-07.md at the root of the workspace before doing anything.

Context: d:\Sources\vbe2 — pnpm monorepo, `@atomos/structura` package is a schema designer canvas.

Where we left off:
- All shape regressions from commit 7bf3c91 are fixed (commit 4fcd355).
- All font appearance settings now apply to both compact SVG shapes AND regular box entities.
- Diamond and all other built-in shapes render correctly.
- Custom shapes from the repository work for non-built-in IDs.

Possible next priorities (confirm with user):
1. Test appearance settings end-to-end: change font family/size in Settings > Appearance and verify all entity types update live.
2. Appearance settings live-update: currently tokens are injected once on page load and on settings save — consider wiring a Redux subscription so `applyAppearanceTokens` fires whenever `settings-updated` is dispatched.
3. Property row label font color is now `--vbs-entity-props-color` — verify it contrasts well against dark entity backgrounds.
4. Schema panel (`create-schema-panel.ts`) — check if it has its own hardcoded fonts that also need the CSS var treatment.
5. Any other follow-up items the user wants.

Always run `npx tsc --noEmit` inside `packages/atomos-structura` after any code changes.
```
