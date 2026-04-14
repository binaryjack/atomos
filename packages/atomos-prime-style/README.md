# @atomos-web/prime-style

Design tokens, Tailwind config, and compiled CSS for the Atomos design system.

## Install

```bash
pnpm add @atomos-web/prime-style
# or
npm i @atomos-web/prime-style
```

---

## Usage

### Compiled CSS (recommended)

Import the pre-built stylesheet in your entry point:

```ts
import '@atomos-web/prime-style/dist/styles.css';
```

Or link it in HTML:

```html
<link rel="stylesheet" href="node_modules/@atomos-web/prime-style/dist/styles.css" />
```

### Design tokens

```ts
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  animation,
  transition,
  lightTheme,
  darkTheme,
} from '@atomos-web/prime-style';

// Apply a theme
document.body.style.setProperty('--color-primary', lightTheme.primary);
```

### Tailwind config

Extend your `tailwind.config.js` with the Atomos preset:

```js
// tailwind.config.js
import atomosConfig from '@atomos-web/prime-style/tailwind.config.js';

export default {
  presets: [atomosConfig],
  content: ['./src/**/*.{ts,tsx,html}'],
};
```

---

## Token reference

| Token group | Export | Example |
|---|---|---|
| Colors | `colors` | `colors.primary[500]` |
| Typography | `typography` | `typography.fontFamily.sans` |
| Spacing | `spacing` | `spacing[4]` → `'1rem'` |
| Border radius | `borderRadius` | `borderRadius.lg` |
| Shadows | `shadows` | `shadows.md` |
| Animation | `animation` | `animation.spin` |
| Transition | `transition` | `transition.DEFAULT` |
| Light theme | `lightTheme` | `lightTheme.background` |
| Dark theme | `darkTheme` | `darkTheme.background` |

---

## License

MIT
