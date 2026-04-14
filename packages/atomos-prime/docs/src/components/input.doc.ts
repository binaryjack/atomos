import { createInput } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface InputState {
  type: 'text' | 'number' | 'email' | 'password' | 'search' | 'color';
  value: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
}

export const inputDoc: DocDefinition<InputState> = {
  id: 'input',
  category: 'Atomic / Form',
  title: 'Input Field (createInput)',
  description: 'Standard text inputs wrapped in reactive state management.',
  defaultState: {
    type: 'text',
    value: '',
    placeholder: 'Enter something...',
    disabled: false,
    readonly: false
  },
  controls: [
    { key: 'value', label: 'Value Output', type: 'string' },
    { key: 'placeholder', label: 'Placeholder text', type: 'string' },
    { key: 'type', label: 'Input Type', type: 'select', options: ['text', 'number', 'email', 'password', 'search', 'color'] },
    { key: 'disabled', label: 'Disabled', type: 'boolean' },
    { key: 'readonly', label: 'Read-only', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createInput({
      type: state.type,
      value: state.value,
      placeholder: state.placeholder,
      disabled: state.disabled,
      readonly: state.readonly,
      onChange: (v) => console.log('Input value:', v)
    });
  },
  renderCode: (state) => {
    return `import { createInput } from '@atomos-web/prime';

const { element, cleanup } = createInput({
  type: '${state.type}',
  value: '${state.value}',
  placeholder: '${state.placeholder}',
  disabled: ${state.disabled},
  readonly: ${state.readonly},
  onChange: (v) => console.log('Input value:', v)
});

document.body.appendChild(element);`;
  }
};
