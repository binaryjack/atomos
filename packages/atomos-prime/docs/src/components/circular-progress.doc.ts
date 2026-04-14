import { createCircularProgress } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface CircularProgressState {
  value: number;
  size: number;
  strokeWidth: number;
  variant: 'primary' | 'success' | 'warn' | 'danger' | 'info';
  showLabel: boolean;
}

export const circularProgressDoc: DocDefinition<CircularProgressState> = {
  id: 'circular-progress',
  category: 'Feedback / Display',
  title: 'Circular Progress',
  description: 'Radial determinstic progress indicator, great for minimal profile or task loading UI.',
  defaultState: {
    value: 75,
    size: 80,
    strokeWidth: 8,
    variant: 'success',
    showLabel: true
  },
  controls: [
    { key: 'value', label: 'Progress (%)', type: 'number' },
    { key: 'size', label: 'Diameter Size (px)', type: 'number' },
    { key: 'strokeWidth', label: 'Stroke border width', type: 'number' },
    { key: 'variant', label: 'Color Theme', type: 'select', options: ['primary', 'success', 'warn', 'danger', 'info'] },
    { key: 'showLabel', label: 'Show Label', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createCircularProgress({
      value: state.value,
      size: state.size,
      strokeWidth: state.strokeWidth,
      variant: state.variant,
      showLabel: state.showLabel
    });
  },
  renderCode: (state) => {
    return `import { createCircularProgress } from '@atomos-web/prime';

const { element, cleanup } = createCircularProgress({
  value: ${state.value},
  size: ${state.size},
  strokeWidth: ${state.strokeWidth},
  variant: '${state.variant}',
  showLabel: ${state.showLabel}
});

document.body.appendChild(element);`;
  }
};