import { createProgressBar } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface ProgressBarState {
  value: number;
  orientation: 'horizontal' | 'vertical';
  variant: 'primary' | 'success' | 'warn' | 'danger' | 'info';
  size: 'sm' | 'md' | 'lg';
  showLabel: boolean;
}

export const progressBarDoc: DocDefinition<ProgressBarState> = {
  id: 'progress-bar',
  category: 'Feedback / Display',
  title: 'Linear Progress (createProgressBar)',
  description: 'Displays deterministic operation progress horizontally or vertically based on a 0-100% bound.',
  defaultState: {
    value: 45,
    orientation: 'horizontal',
    variant: 'primary',
    size: 'md',
    showLabel: true
  },
  controls: [
    { key: 'value', label: 'Progress (%)', type: 'number' },
    { key: 'orientation', label: 'Orientation', type: 'select', options: ['horizontal', 'vertical'] },
    { key: 'variant', label: 'Color Variant', type: 'select', options: ['primary', 'success', 'warn', 'danger', 'info'] },
    { key: 'size', label: 'Thickness Size', type: 'select', options: ['sm', 'md', 'lg'] },
    { key: 'showLabel', label: 'Show text label', type: 'boolean' }
  ],
  renderPreview: (state) => {
    const parent = document.createElement('div');
    parent.style.cssText = state.orientation === 'vertical' ? 'height:200px;' : 'width:300px;';
    const comp = createProgressBar({
      value: state.value,
      orientation: state.orientation,
      variant: state.variant,
      size: state.size,
      showLabel: state.showLabel
    });
    parent.appendChild(comp.element);
    return { element: parent, cleanup: comp.cleanup };
  },
  renderCode: (state) => {
    return `import { createProgressBar } from '@atomos-web/prime';

const { element, cleanup } = createProgressBar({
  value: ${state.value},
  orientation: '${state.orientation}',
  variant: '${state.variant}',
  size: '${state.size}',
  showLabel: ${state.showLabel}
});

document.body.appendChild(element);`;
  }
};