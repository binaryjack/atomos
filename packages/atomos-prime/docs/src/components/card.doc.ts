import { createCard, createTypography } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface CardState {
  title: string;
  subtitle: string;
  shadow: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  padding: 'sm' | 'md' | 'lg';
}

export const cardDoc: DocDefinition<CardState> = {
  id: 'card',
  category: 'Layout / Structure',
  title: 'Card Container (createCard)',
  description: 'Flexible block container applying standard background colors, borders, drop shadows, and padding.',
  defaultState: {
    title: 'Dashboard Overview',
    subtitle: 'Here is what happened today.',
    shadow: 'md',
    padding: 'md'
  },
  controls: [
    { key: 'title', label: 'Card Title', type: 'string' },
    { key: 'subtitle', label: 'Card Subtitle', type: 'string' },
    { key: 'padding', label: 'Internal Padding', type: 'select', options: ['sm', 'md', 'lg'] },
    { key: 'shadow', label: 'Drop Shadow', type: 'select', options: ['sm', 'md', 'lg', 'xl', '2xl'] }
  ],
  renderPreview: (state) => {
    // Generate dummy content
    const textNode = createTypography({ 
      variant: 'p', 
      children: 'This is the internal content area of the card! Cards natively handle headers automatically when title/subtitle props are provided.' 
    });

    const card = createCard({
      title: state.title,
      subtitle: state.subtitle,
      shadow: state.shadow,
      padding: state.padding,
      children: [textNode.element]
    });

    return { 
      element: card.element, 
      cleanup: { 
        destroy: () => { 
          textNode.cleanup.destroy();
          card.cleanup.destroy(); 
        } 
      } 
    };
  },
  renderCode: (state) => {
    return `import { createCard, createTypography } from '@atomos-web/prime';

const textNode = createTypography({ 
  variant: 'p', 
  children: 'Internal card content!' 
});

const { element, cleanup } = createCard({
  title: '${state.title}',
  subtitle: '${state.subtitle}',
  padding: '${state.padding}',
  shadow: '${state.shadow}',
  children: [textNode.element]
});

document.body.appendChild(element);`;
  }
};