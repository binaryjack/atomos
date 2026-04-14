import { createCheckbox } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface CheckboxState {
  checked: boolean;
  disabled: boolean;
}

export const checkboxDoc: DocDefinition<CheckboxState> = {
  id: 'checkbox',
  category: 'Atomic / Form',
  title: 'Checkbox (createCheckbox)',
  description: 'Standard boolean input wrapped in a controlled interface.',
  defaultState: {
    checked: false,
    disabled: false
  },
  controls: [
    { key: 'checked', label: 'Checked State', type: 'boolean' },
    { key: 'disabled', label: 'Disabled', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createCheckbox({
      checked: state.checked,
      disabled: state.disabled,
      onChange: (v) => console.log('Checkbox changed:', v)
    });
  },
  renderCode: (state) => {
    return `import { createCheckbox } from '@atomos-web/prime';

const { element, input, cleanup } = createCheckbox({
  checked: ${state.checked},
  disabled: ${state.disabled},
  onChange: (v) => console.log('Checkbox changed:', v)
});

document.body.appendChild(element);`;
  }
};
