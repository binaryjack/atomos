# Session Handoff — April 2, 2026

---

## Work Done This Session

### 1. Settings Page Styling Fix (`canvas.html`)
**Problem:** `createSettingsPage` uses Tailwind classes throughout but `canvas.html` had zero CSS — every class was a dead no-op, making the overlay render as an invisible/broken layout.  
**Fix:** Added `<link rel="stylesheet" href="/atomos-prime-style/dist/styles.css">` to `canvas.html`. The file already existed and was pre-compiled with all JIT/arbitrary-value classes.  
**File:** `packages/atomos-prime/demos/canvas.html`

---

### 2. TypeScript TS6305 — `formular-dev` Missing Declaration Files
**Problem:** `atomos-prime` watch-mode compiler threw 26× `error TS6305: Output file ... has not been built from source file` for every `@binaryjack/formular.dev` import. TypeScript project references require `dist/src/**/*.d.ts` (flat declaration tree), but `formular-dev` only had `dist/types/formular-dev.es.d.ts` (Vite bundle output).  
**Root cause:** The build script is `vite build && tsc --emitDeclarationOnly` — the `tsc` half had never run after the last Vite build.  
**Fix:** `cd packages/formular-dev && npx tsc --emitDeclarationOnly` → generated `dist/src/index.d.ts` and full declaration tree. Watch compiler healed automatically.

> **Recurring risk:** Any time `formular-dev` is rebuilt via `pnpm dev` (Vite-only watch), the declaration files go stale again. Always run `npx tsc --emitDeclarationOnly` in `formular-dev` after a Vite-only rebuild, or switch `dev` to also run `tsc --watch --emitDeclarationOnly`.

---

### 3. `atp-dropdown` White Background Bug
**Problem:** All dropdowns on entity cards (componentType + dataType) rendered white-on-white in the canvas after Tailwind CSS was loaded.  
**Root cause (3-part):**
1. `create-dropdown.ts` set a hardcoded `baseClasses = 'bg-white text-gray-700 border-gray-300 ...'` on the host element via `setAttribute('class', baseClasses)`.
2. `atp-dropdown.ts` `attributeChangedCallback` for `class` forwarded those classes directly into the shadow `<select>` via `classList.add()` — bypassing the CSS custom property system entirely.
3. `atp-dropdown-style.ts` had light-mode fallback values (`#d1d5db` border, `0.5rem 1.5rem` padding, `1rem` font-size).

**Fix:**
- Removed `baseClasses` and `setAttribute('class', ...)` from `create-dropdown.ts`
- Removed the `class` forwarding block from `atp-dropdown.ts` `attributeChangedCallback`
- Changed all fallback defaults in `atp-dropdown-style.ts` to dark design-system values (`#09090b` bg, `#27272a` border, `#a1a1aa` text, `2px` radius, compact `0 20px 0 6px` padding)

**Files:**
- `packages/atomos-prime/src/features/dropdown/create-dropdown.ts`
- `packages/atomos-prime/src/features/dropdown/atp-dropdown/atp-dropdown.ts`
- `packages/atomos-prime/src/features/dropdown/atp-dropdown/style/atp-dropdown-style.ts`

---

### 4. Default Entity Colors — Visibility
**Problem:** All toolbox items had `baseColor: 'var(--vbs-bg-panel)'` which resolves to `#111111` — nearly invisible against the `#0f172a` canvas background.  
**Fix:** Replaced with distinct, shape-semantic dark-but-visible hex values:

| Shape | Color | Semantic |
|---|---|---|
| Box | `#1c3557` | Steel blue — standard entity |
| Diamond | `#252060` | Deep indigo — decision/logic node |
| Cylinder | `#103b35` | Dark teal — storage/DB |
| Actor | `#331a5c` | Deep violet — person/system |
| Note | `#3d2a0a` | Dark amber — text annotation |

Also fixed the entity settings modal color default from `'var(--vbs-bg-panel, #111111)'` → `'#1c3557'`.

**Files:**
- `packages/atomos-prime/src/core/default-toolbox.config.ts`
- `packages/atomos-prime/src/features/modal/create-entity-settings-modal.ts`

> Colors are now configurable per-tool via Settings → Toolbox Configuration → Edit item → `baseColor` field.

---

## Architecture Notes / Key Invariants

### Shadow DOM + CSS Custom Properties
The `atp-dropdown` Web Component uses `attachShadow({ mode: 'open' })`. Styling the inner `<select>` must go through CSS custom properties (`--dropdown-bg-color`, `--dropdown-text-color`, etc.) set on the host, or `::part(select)` selectors.  
**Never** use `classList` forwarding from host to shadow internals — external Tailwind classes will overwrite internal shadow styles.

### Build Pipeline
```
formular-dev:        vite build (bundles) + tsc --emitDeclarationOnly (declarations for project references)
atomos-prime:        tsc -p tsconfig.build.json  ← needs formular-dev declarations to exist first
atomos-prime-style:  tailwindcss -i src/styles/index.css -o dist/styles.css
```
`canvas.html` and all demo HTMLs load from `/atomos-prime/dist/` — always rebuild after source changes.

### Toolbox → Entity Color Flow
```
defaultToolboxConfig.toolsets[].tools[].baseColor
  → getToolboxConfig()  (merged with localStorage overrides via toolbox-config-manager)
  → palette button drag/click  → entity created with { shape, color } in metadata
  → getEntityManager().createEntity(...)
  → entity persisted with color in domain layer + localStorage
  → createDemoEntity() renders with entity.color as fill
```

---

## Pending / Follow-Up

- [ ] **`formular-dev` dev script** — only runs Vite watch; declarations go stale. Add `tsc --watch --emitDeclarationOnly` (via `concurrently`) to the `dev` script.
- [ ] **Existing entity colors** — entities already on canvas keep `#111111` (persisted in localStorage). Users must open ⚙ settings on each entity and save to apply new color. Consider a one-time migration on startup.
- [ ] **`create-property-settings-modal.ts` / `create-validation-modal.ts`** — still use old manual field extraction `(form.getField(x)?.input as any)?.value`. Should be replaced with `form.getData()` now that the Web Component arrow-field fix is in.
- [ ] **`VbsMcpServer`** in `atomos-structura-mcp` is still an ES6 class — not an `HTMLElement` subclass so the W3C exception does not apply. Needs refactor to prototype pattern per coding standards.
- [ ] **`SCHEMA_ID = 'schema-default'`** hardcoded in `selectors.ts` and `entity-repository.ts` — multi-schema support blocked until parameterized.

## Prompt for Next Session
*Copy and paste the following prompt to the assistant when you resume at your work desk:*

```text
Please review `CANVAS_SETTINGS_PLAN.md` and `SESSION_HANDOFF.md` to get up to speed. 

We recently built a W3C-compliant generic generic Web Component for tabs (`<vbs-tabs>`). 
Right now, the `create-settings-page.ts` file is still using a custom vanilla DOM left-hand sidebar for navigation. 

Your task is to refactor `packages/web-ui/src/features/settings-page/create-settings-page.ts` to use our new `<vbs-tabs>` component instead of the custom sidebar. It needs to implement the three tabs defined in our plan:
1. General Settings
2. Toolbox Editor
3. Decision Matrices

Make sure to preserve the internal content generation for "Toolbox Editor" (Formular tree) and "Decision Matrices" (Modular table), but wrap them inside the `<vbs-tab-panel>` elements.
```