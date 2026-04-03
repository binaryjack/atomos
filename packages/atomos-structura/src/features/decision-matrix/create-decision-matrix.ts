import type { DecisionMatrixProps, DecisionMatrixCriterion, DecisionMatrixOption } from './decision-matrix.types.js';
import { DecisionMatrix } from './decision-matrix.js';

export function createDecisionMatrix(props: DecisionMatrixProps) {
  const el = document.createElement('atp-decision-matrix') as DecisionMatrix;
  
  el.criteria = props.criteria || [];
  el.options = props.options || [];

  if (props.onChange) {
    el.addEventListener('change', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (props.onChange) {
        props.onChange(customEvent.detail.criteria, customEvent.detail.options);
      }
    });
  }

  return {
    element: el,
    updateState: (newCriteria: DecisionMatrixCriterion[], newOptions: DecisionMatrixOption[]) => {
      el.criteria = newCriteria;
      el.options = newOptions;
    }
  };
}
