import type { Signal } from '@atomos/prime';

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
  ring.classList.add('vbs-sel-ring', 'rig-selection-ring');
  ring.setAttribute('rx', '7');

  const syncRing = (width: number, height: number, isSelected: boolean): void => {
    ring.setAttribute('x', '-3');
    ring.setAttribute('y', '-3');
    ring.setAttribute('width', (width + 6).toString());
    ring.setAttribute('height', (height + 6).toString());
    
    if (isSelected) {
      ring.classList.add('rig-selection-ring--active');
    } else {
      ring.classList.remove('rig-selection-ring--active');
    }
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
