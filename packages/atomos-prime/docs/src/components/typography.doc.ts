import { createTypography } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface TypographyState {
  children: string;
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export const typographyDoc: DocDefinition<TypographyState> = {
  id: 'typography',
  category: 'Asset / Visual',
  title: 'Typography (createTypography)',
  description: 'A deeply reactive typography component configured with standard font scales matching the theme.',
  defaultState: {
    children: 'The quick brown fox jumps over the lazy dog.',
    variant: 'h1'
  },
  controls: [
    { key: 'children', label: 'Preview Text', type: 'string' },
    { key: 'variant', label: 'Typography Variant', type: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'] }
  ],
  renderPreview: (state) => {
    return createTypography({
      children: state.children,
      variant: state.variant
    });
  },
  renderCode: (state) => {
    return `import { createTypography } from '@atomos-web/prime';

const { element, cleanup } = createTypography({
  children: '${state.children}',
  variant: '${state.variant}'
});

document.body.appendChild(element);`;
  }
};
