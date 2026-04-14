import { createDatePicker, DateFormatsEnum } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface DatePickerState {
  placeholder: string;
  format: DateFormatsEnum;
  selectionMode: 'single' | 'range';
  disabled: boolean;
}

export const datePickerDoc: DocDefinition<DatePickerState> = {
  id: 'date-picker',
  category: 'Atomic / Form',
  title: 'Date Picker (createDatePicker)',
  description: 'A completely reactive date-picker offering single and range selection modes, with custom date formatting.',
  defaultState: {
    placeholder: 'Select a Date...',
    format: DateFormatsEnum.DD_MM_YYYY,
    selectionMode: 'single',
    disabled: false
  },
  controls: [
    { key: 'placeholder', label: 'Placeholder text', type: 'string' },
    { 
      key: 'format', 
      label: 'Date Format', 
      type: 'select', 
      options: [
        DateFormatsEnum.DD_MM_YYYY, 
        DateFormatsEnum.MM_DD_YYYY, 
        DateFormatsEnum.YYYY_MM_DD,
        DateFormatsEnum.DD_MM_YY,
        DateFormatsEnum.MM_DD_YY
      ] 
    },
    { key: 'selectionMode', label: 'Selection Mode', type: 'select', options: ['single', 'range'] },
    { key: 'disabled', label: 'Disabled', type: 'boolean' }
  ],
  renderPreview: (state) => {
    // Add some wrapper to ensure the dropdown popup is visible in the container
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'min-height: 400px; display: flex; align-items: start; padding-top: 2rem; width: 100%; justify-content: center;';

    const { element, cleanup } = createDatePicker({
      placeholder: state.placeholder,
      format: state.format,
      selectionMode: state.selectionMode,
      disabled: state.disabled,
      onChange: (val, date) => console.log('Single Select:', val, date),
      onRangeChange: (from, to, start, end) => console.log('Range Select:', from, to, start, end)
    });

    // Provide a small width constraint for the input
    element.style.width = '300px';
    wrapper.appendChild(element);

    return {
      element: wrapper,
      cleanup
    };
  },
  renderCode: (state) => {
    return `import { createDatePicker, DateFormatsEnum } from '@atomos-web/prime';

const { element, cleanup } = createDatePicker({
  placeholder: '${state.placeholder}',
  format: DateFormatsEnum.${Object.keys(DateFormatsEnum).find(k => (DateFormatsEnum as any)[k] === state.format) || 'DD_MM_YYYY'},
  selectionMode: '${state.selectionMode}',
  disabled: ${state.disabled},
  onChange: (val, date) => console.log('Selected:', val),
  onRangeChange: (from, to, start, end) => console.log('Range:', from, 'to', to)
});

// Append the root date picker element to the DOM
document.body.appendChild(element);`;
  }
};