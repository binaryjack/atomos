import { createEditableLabel, createSignal } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface EditableLabelState {
  placeholder: string;
}

export const editableLabelDoc: DocDefinition<EditableLabelState> = {
  id: 'editable-label',
  category: 'Atomic / Form',
  title: 'Editable Label (createEditableLabel)',
  description: 'A text element that transforms into an input field when clicked or focused, perfect for inline spreadsheet edits or file renames.',
  defaultState: {
    placeholder: 'Click to edit...'
  },
  controls: [
    { key: 'placeholder', label: 'Placeholder text', type: 'string' }
  ],
  renderPreview: (state) => {
    // Because inline edits mutate the value continuously, we should let the component 
    // run purely isolated from the playground state so the user can interact.
    const innerSignal = createSignal('Live File Name.txt');
    
    return createEditableLabel({
      value: innerSignal,
      placeholder: state.placeholder,
      onChange: (v) => console.log('Saved edit:', v)
    });
  },
  renderCode: (state) => {
    return `import { createEditableLabel, createSignal } from '@atomos-web/prime';

// Reactive local state
const valueSignal = createSignal('Live File Name.txt');

const { element, cleanup } = createEditableLabel({
  value: valueSignal,
  placeholder: '${state.placeholder}',
  onChange: (v) => console.log('Saved:', v)
});

document.body.appendChild(element);`;
  }
};
