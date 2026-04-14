import { createTextarea } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface TextareaState {
  value: string;
  placeholder: string;
  rows: number;
  cols: number;
  disabled: boolean;
}

export const textareaDoc: DocDefinition<TextareaState> = {
  id: 'textarea',
  category: 'Atomic / Form',
  title: 'Text Area (createTextarea)',
  description: 'Standard multi-line text input with reactive value bindings and auto-resizing defaults.',
  defaultState: {
    value: '',
    placeholder: 'Write your content here...',
    rows: 4,
    cols: 50,
    disabled: false
  },
  controls: [
    { key: 'value', label: 'Value Content', type: 'string' },
    { key: 'placeholder', label: 'Placeholder text', type: 'string' },
    { key: 'rows', label: 'Rows', type: 'number' },
    { key: 'cols', label: 'Cols', type: 'number' },
    { key: 'disabled', label: 'Disabled', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createTextarea({
      value: state.value,
      placeholder: state.placeholder,
      rows: state.rows,
      cols: state.cols,
      disabled: state.disabled,
      onChange: (v) => console.log('Textarea Value:', v)
    });
  },
  renderCode: (state) => {
    return `import { createTextarea } from '@atomos-web/prime';

const { element, cleanup } = createTextarea({
  value: '${state.value}',
  placeholder: '${state.placeholder}',
  rows: ${state.rows},
  cols: ${state.cols},
  disabled: ${state.disabled},
  onChange: (v) => console.log(v)
});

document.body.appendChild(element);`;
  }
};
