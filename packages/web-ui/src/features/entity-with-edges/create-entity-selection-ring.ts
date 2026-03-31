import type { Signal } from '../../core/types/signal.types.js';

export interface EntitySelectionRingResult {
  readonly ring: SVGRectElement;
  readonly syncRing: (width: number, height: number, isSelected: boolean) => void;
  readonly cleanup: () => void;
}

export const createEntitySelectionRing = function(
  selected: Signal<boolean>,
  dimensions: Signal<{ width: number; height: number }>
): EntitySelectionRingResult {
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  ring.classList.add('vbs-sel-ring');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', '#3b82f6');
  ring.setAttribute('stroke-width', '2');
  ring.setAttribute('rx', '7');
  ring.setAttribute('stroke-dasharray', '4,3');
  ring.setAttribute('opacity', '0');
  ring.style.pointerEvents = 'none';

  const syncRing = (width: number, height: number, isSelected: boolean): void => {
    ring.setAttribute('x', '-3');
    ring.setAttribute('y', '-3');
    ring.setAttribute('width', (width + 6).toString());
    ring.setAttribute('height', (height + 6).toString());
    ring.setAttribute('opacity', isSelected ? '1' : '0');
  };

  const unsubSelected    = selected.subscribe(() => {
    const { width, height } = dimensions.value;
    syncRing(width, height, selected.value);
  });

  return {
    ring,
    syncRing,
    cleanup: () => { unsubSelected(); }
  };
};
