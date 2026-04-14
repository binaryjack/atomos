import { createSpinner } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface SpinnerState {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label: string;
}

export const spinnerDoc: DocDefinition<SpinnerState> = {
  id: 'spinner',
  category: 'Feedback / Display',
  title: 'Spinner (createSpinner)',
  description: 'An animated loading spinner indicating that content or background tasks are executing.',
  defaultState: {
    size: 'md',
    label: 'Loading...',
  },
  controls: [
    { key: 'size', label: 'Spinner Size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    { key: 'label', label: 'Screen reader label', type: 'string' }
  ],
  renderPreview: (state) => {
    return createSpinner({
      size: state.size,
      label: state.label
    });
  },
  renderCode: (state) => {
    return `import { createSpinner } from '@atomos-web/prime';

const { element } = createSpinner({
  size: '${state.size}',
  label: '${state.label}'
});

document.body.appendChild(element);`;
  }
};
