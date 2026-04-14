import { createSkeleton } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

export interface SkeletonState {
  variant: 'text' | 'circular' | 'rectangular' | 'rounded';
  width: number;
  height: number;
  animation: boolean;
}

export const skeletonDoc: DocDefinition<SkeletonState> = {
  id: 'skeleton',
  category: 'Feedback / Display',
  title: 'Skeleton Layout (createSkeleton)',
  description: 'A pulsing placeholder used for loading states before actual content fully loads.',
  defaultState: {
    variant: 'rectangular',
    width: 200,
    height: 100,
    animation: true
  },
  controls: [
    { key: 'variant', label: 'Skeleton Variant', type: 'select', options: ['text', 'circular', 'rectangular', 'rounded'] },
    { key: 'width', label: 'Width (px)', type: 'number' },
    { key: 'height', label: 'Height (px)', type: 'number' },
    { key: 'animation', label: 'Animate', type: 'boolean' }
  ],
  renderPreview: (state) => {
    return createSkeleton({
      variant: state.variant,
      width: state.width,
      height: state.height,
      animation: state.animation
    });
  },
  renderCode: (state) => {
    return `import { createSkeleton } from '@atomos-web/prime';

const { element, cleanup } = createSkeleton({
  variant: '${state.variant}',
  width: ${state.width},
  height: ${state.height},
  animation: ${state.animation}
});

document.body.appendChild(element);`;
  }
};