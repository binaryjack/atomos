import { createButton } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface ButtonState {
  children: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
  size: 'sm' | 'md' | 'lg';
  shape: 'rounded' | 'pill' | 'icon-only';
  disabled: boolean;
  loading: boolean;
}

export const buttonDoc: DocDefinition<ButtonState> = {
  id: 'button',
  category: 'Atomic / Form',
  title: 'Button (createButton)',
  description: 'A deeply reactive Button wrapper providing multiple variants, shapes, and sizes.',
  defaultState: {
    children: 'Click Me',
    variant: 'primary',
    size: 'md',
    shape: 'rounded',
    disabled: false,
    loading: false
  },
  controls: [
    { key: 'children', label: 'Text content', type: 'string' },
    { key: 'variant', label: 'Variant', type: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'soft'] },
    { key: 'size', label: 'Size', type: 'select', options: ['sm', 'md', 'lg'] },
    { key: 'shape', label: 'Shape', type: 'select', options: ['rounded', 'pill', 'icon-only'] },
    { key: 'disabled', label: 'Disabled', type: 'boolean' },
    { key: 'loading', label: 'Loading State', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createButton({
      children: state.children,
      variant: state.variant,
      size: state.size,
      shape: state.shape,
      disabled: state.disabled,
      loading: state.loading
    });
  },
  renderCode: (state) => {
    return `import { createButton } from '@atomos-web/prime';

const { element, cleanup } = createButton({
  children: '${state.children}',
  variant: '${state.variant}',
  size: '${state.size}',
  shape: '${state.shape}',
  disabled: ${state.disabled},
  loading: ${state.loading}
});

document.body.appendChild(element);`;
  }
};
