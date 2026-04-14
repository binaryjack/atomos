import { createAccordion, createTypography } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface AccordionState {
  title: string;
  defaultOpen: boolean;
  disabled: boolean;
}

export const accordionDoc: DocDefinition<AccordionState> = {
  id: 'accordion',
  category: 'Layout / Structure',
  title: 'Accordion Section (createAccordion)',
  description: 'Expanding and collapsing panel layout for hiding optional content.',
  defaultState: {
    title: 'Advanced Settings',
    defaultOpen: false,
    disabled: false
  },
  controls: [
    { key: 'title', label: 'Header Text', type: 'string' },
    { key: 'defaultOpen', label: 'Default Open', type: 'boolean' },
    { key: 'disabled', label: 'Disabled', type: 'boolean' }
  ],
  renderPreview: (state) => {
    // Generate dummy content inside the accordion
    const textNode = createTypography({ 
      variant: 'p', 
      children: 'Here are the advanced settings that were hidden under the accordion panel.' 
    });

    const accordion = createAccordion({
      title: state.title,
      defaultOpen: state.defaultOpen,
      disabled: state.disabled,
      children: [textNode.element],
      onToggle: (isOpen) => console.log('Accordion state:', isOpen)
    });

    return { 
      element: accordion.element, 
      cleanup: { 
        destroy: () => { 
          textNode.cleanup.destroy();
          accordion.cleanup.destroy(); 
        } 
      } 
    };
  },
  renderCode: (state) => {
    return `import { createAccordion, createTypography } from '@atomos-web/prime';

const textNode = createTypography({ 
  variant: 'p', 
  children: 'Hidden internal content' 
});

const { element, cleanup } = createAccordion({
  title: '${state.title}',
  defaultOpen: ${state.defaultOpen},
  disabled: ${state.disabled},
  children: [textNode.element],
  onToggle: (isOpen) => console.log('Accordion stat:', isOpen)
});

document.body.appendChild(element);`;
  }
};