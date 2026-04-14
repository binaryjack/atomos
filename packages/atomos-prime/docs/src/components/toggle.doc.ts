import { createToggle } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface ToggleState {
  checked: boolean;
  disabled: boolean;
  error: boolean;
  size: 'sm' | 'md' | 'lg';
  label: string;
  labelPosition: 'left' | 'right';
}

export const toggleDoc: DocDefinition<ToggleState> = {
  id: 'toggle',
  category: 'Atomic / Form',
  title: 'Toggle (createToggle)',
  description: 'A customizable switch element providing boolean user input with a native feel.',
  defaultState: {
    checked: true,
    disabled: false,
    error: false,
    size: 'md',
    label: 'Enable Feature',
    labelPosition: 'right'
  },
  controls: [
    { key: 'checked', label: 'Checked State', type: 'boolean' },
    { key: 'label', label: 'Toggle Label', type: 'string' },
    { key: 'labelPosition', label: 'Label Position', type: 'select', options: ['left', 'right'] },
    { key: 'size', label: 'Size', type: 'select', options: ['sm', 'md', 'lg'] },
    { key: 'disabled', label: 'Disabled', type: 'boolean' },
    { key: 'error', label: 'Error State', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createToggle({
      checked: state.checked,
      disabled: state.disabled,
      error: state.error,
      size: state.size,
      label: state.label,
      labelPosition: state.labelPosition,
      onChange: (v) => console.log('Toggled to', v)
    });
  },
  renderCode: (state) => {
    return `import { createToggle } from '@atomos-web/prime';

const { element, getChecked, cleanup } = createToggle({
  checked: ${state.checked},
  label: '${state.label}',
  labelPosition: '${state.labelPosition}',
  size: '${state.size}',
  disabled: ${state.disabled},
  error: ${state.error},
  onChange: (v) => console.log('Toggled to', v)
});

document.body.appendChild(element);`;
  }
};
