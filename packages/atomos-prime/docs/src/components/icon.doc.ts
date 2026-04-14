import { createIcon } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface IconState {
  name: string;
  size: number;
  color: string;
}

export const iconDoc: DocDefinition<IconState> = {
  id: 'icon',
  category: 'Asset / Visual',
  title: 'SVG Icon (createIcon)',
  description: 'A deeply reactive SVG icon component that supports various sizes, colors, and predefined paths.',
  defaultState: {
    name: 'settings',
    size: 48,
    color: '#a855f7' // Purple 500
  },
  controls: [
    {
      key: 'name',
      label: 'Icon Name',
      type: 'select',
      options: ['settings', 'check', 'close', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'plus', 'minus', 'edit', 'delete', 'search', 'menu', 'user', 'database', 'code', 'download', 'upload', 'link', 'image', 'play', 'stop', 'refresh']
    },
    {
      key: 'size',
      label: 'Size (px)',
      type: 'number'
    },
    {
      key: 'color',
      label: 'Color (Hex)',
      type: 'string'
    }
  ],
  renderPreview: (state: IconState) => {
    return createIcon({
      name: state.name,
      size: state.size,
      color: state.color
    });
  },
  renderCode: (state: IconState) => {
    return `import { createIcon } from '@atomos-web/prime';

const { element, cleanup } = createIcon({
  name: '${state.name}',
  size: ${state.size},
  color: '${state.color}'
});

document.body.appendChild(element);`;
  }
};