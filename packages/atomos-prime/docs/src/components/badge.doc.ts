import { createBadge } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface BadgeState {
  text: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size: 'sm' | 'md' | 'lg';
}

export const badgeDoc: DocDefinition<BadgeState> = {
  id: 'badge',
  category: 'Asset / Visual',
  title: 'Badge (createBadge)',
  description: 'A small badge component used to display statuses or tags.',
  defaultState: {
    text: 'Active',
    variant: 'success',
    size: 'md'
  },
  controls: [
    { key: 'text', label: 'Badge Text', type: 'string' },
    { key: 'variant', label: 'Variant Theme', type: 'select', options: ['success', 'warning', 'error', 'info', 'neutral'] },
    { key: 'size', label: 'Size', type: 'select', options: ['sm', 'md', 'lg'] }
  ],
  renderPreview: (state) => {
    return createBadge({
      text: state.text,
      variant: state.variant,
      size: state.size
    });
  },
  renderCode: (state) => {
    return `import { createBadge } from '@atomos-web/prime';

const { element, cleanup } = createBadge({
  text: '${state.text}',
  variant: '${state.variant}',
  size: '${state.size}'
});

document.body.appendChild(element);`;
  }
};
