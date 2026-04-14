# @atomos-web/prime

Headless Web Component UI primitives for the Atomos design system.  
Vanilla TypeScript — no framework required, works in any browser environment.

## Install

```bash
pnpm add @atomos-web/prime @atomos-web/prime-style
# or
npm i @atomos-web/prime @atomos-web/prime-style
```

---

## Components

All components follow the same factory pattern: `createX(props) → { element, ... }`.  
`element` is a native `HTMLElement` — append it anywhere.

### Core

| Factory | Description |
|---|---|
| `createButton(props)` | Button with variant, size, icon support |
| `createInput(props)` | Text input with label, validation, formular integration |
| `createTextarea(props)` | Multiline text input |
| `createCheckbox(props)` | Boolean toggle with label |
| `createDropdown(props)` | Select dropdown |
| `createIcon(props)` | SVG icon by name |
| `createTypography(props)` | Heading / paragraph / label |
| `createCard(props)` | Content card container |
| `createAccordion(props)` | Collapsible section |

### Feedback

| Factory | Description |
|---|---|
| `createBadge(props)` | Status badge (variant, size) |
| `createSpinner(props)` | Loading spinner |
| `createProgressBar(props)` | Horizontal progress bar |
| `createCircularProgress(props)` | Radial progress indicator |
| `createSkeleton(props)` | Loading placeholder skeleton |
| `createToggle(props)` | On/off toggle switch |

### Canvas

| Factory | Description |
|---|---|
| `createVbsCanvas(props)` | SVG/HTML hybrid canvas surface |
| `createAnchor(props)` | Connection anchor point for edges |
| `vbsElement(props)` | Base draggable/resizable element |

---

## Reactivity

`@atomos-web/prime` ships a lightweight signal system for reactive UI:

```ts
import { createSignal } from '@atomos-web/prime';

const count = createSignal(0);

count.subscribe(v => console.log('count:', v));
count.set(1); // → "count: 1"
count.update(v => v + 1); // → "count: 2"
```

---

## Formular integration

Inputs have first-class support for `@binaryjack/formular.dev`:

```ts
import { createFormularInput, createFormularDropdown, createFormularCheckbox } from '@atomos-web/prime';

const nameField = createFormularInput({ name: 'username', label: 'Username' });
document.body.appendChild(nameField.element);
```

---

## Styling

Apply the design system stylesheet from `@atomos-web/prime-style`:

```ts
import '@atomos-web/prime-style/dist/styles.css';
```

Or import design tokens directly:

```ts
import { lightTheme, darkTheme, colors, spacing } from '@atomos-web/prime-style';
```

---

## License

MIT
