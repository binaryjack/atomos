# @atomos-web/renderer-svg

Standalone high-fidelity SVG vector presentation engine for Atomos Structura schema graphs.

---

## Technical Overview

`@atomos-web/renderer-svg` provides zero-dependency SVG string generation for graph snapshots. Designed for server-side rendering (SSR), static documentation generation, vector presentation modes, and high-DPI export without requiring a DOM environment.

---

## Core Capabilities

- **Zero-Dependency SVG Generation**: Pure string builder producing clean, standard SVG output.
- **Color Theme Presets**:
  - `sovereign-dark`: High-contrast dark theme.
  - `clean-paper`: Light mode documentation style.
  - `transparent-vector`: Vector presentation overlay mode for transparent backgrounds.
- **Directional Relationship Markers**:
  - `right` / `default`: Target arrowhead (`-->`)
  - `left`: Source arrowhead (`<--`)
  - `both` / `bidirectional`: Dual arrowheads (`<-->`)
  - `none`: Plain connection line (`---`)
- **Relationship Badges**: Inline stroke labels and highlight formatting.

---

## Installation

```bash
npm install @atomos-web/renderer-svg
# or
pnpm add @atomos-web/renderer-svg
```

---

## Usage

```typescript
import { renderToSVG } from '@atomos-web/renderer-svg';

const snapshot = {
  entities: [
    {
      id: 'usr',
      name: 'User',
      position: { x: 50, y: 50 },
      dimensions: { width: 200, height: 120 },
      properties: [
        { key: 'id', label: 'ID', value: 'UUID' }
      ]
    },
    {
      id: 'ord',
      name: 'Order',
      position: { x: 320, y: 50 },
      dimensions: { width: 200, height: 120 },
      properties: [
        { key: 'total', label: 'Total', value: 'DECIMAL' }
      ]
    }
  ],
  links: [
    {
      id: 'l1',
      leftEntityId: 'usr',
      rightEntityId: 'ord',
      direction: 'both',
      label: 'Places'
    }
  ]
};

const svgOutput = renderToSVG(snapshot, {
  theme: 'sovereign-dark',
  padding: 30,
  responsive: true
});
```

---

## API Reference

### `renderToSVG(snapshot, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `theme` | `'sovereign-dark' \| 'clean-paper' \| 'transparent-vector'` | `'sovereign-dark'` | Color scheme for vector rendering. |
| `padding` | `number` | `40` | ViewBox margin around diagram bounds in pixels. |
| `responsive` | `boolean` | `false` | Sets `width="100%" height="100%"` for scaling responsive containers. |

---

## License

Licensed under AGPLv3. See [LICENSE](LICENSE) for details.
