import { createDropdown } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface DropdownState {
  placeholder: string;
  disabled: boolean;
  value: string;
}

export const dropdownDoc: DocDefinition<DropdownState> = {
  id: 'dropdown',
  category: 'Atomic / Form',
  title: 'Select Dropdown (createDropdown)',
  description: 'Standard select inputs structured with custom styling capabilities.',
  defaultState: {
    placeholder: 'Select a fruit...',
    disabled: false,
    value: ''
  },
  controls: [
    { key: 'value', label: 'Selected Value', type: 'string' },
    { key: 'placeholder', label: 'Default Placeholder', type: 'string' },
    { key: 'disabled', label: 'Disabled', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createDropdown({
      placeholder: state.placeholder,
      disabled: state.disabled,
      value: state.value,
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
        { label: 'Durian (Out of Season)', value: 'durian', disabled: true }
      ],
      onChange: (v) => console.log('Dropdown selected:', v)
    });
  },
  renderCode: (state) => {
    return `import { createDropdown } from '@atomos-web/prime';

const { element, cleanup } = createDropdown({
  placeholder: '${state.placeholder}',
  value: '${state.value}',
  disabled: ${state.disabled},
  options: [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Durian (Out of Season)', value: 'durian', disabled: true }
  ],
  onChange: (v) => console.log(v)
});

document.body.appendChild(element);`;
  }
};
