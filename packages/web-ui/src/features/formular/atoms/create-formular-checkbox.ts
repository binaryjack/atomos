import type { InputDataTypes } from '@binaryjack/formular.dev';
import { createCheckbox } from '../../checkbox/create-checkbox.js';
import '../vbs-field-set.js';
import '../vbs-validation-result.js';
import type { VbsValidationResult } from '../vbs-validation-result.js';
import type { FormularAtomProps, FormularAtomResult } from '../types/formular-atom.types.js';

export interface FormularCheckboxProps extends FormularAtomProps {
  readonly checkLabel?: string;
}

export const createFormularCheckbox = function(props: FormularCheckboxProps): FormularAtomResult {
  const { fieldName, form, label, guide, checkLabel } = props;
  const cleanups: Array<() => void> = [];

  let validation!: VbsValidationResult;

  const cbResult = createCheckbox({
    id: fieldName,
    onChange: (checked) => form.updateField(fieldName, checked as InputDataTypes),
  });
  cbResult.element.slot = 'input';
  cleanups.push(() => cbResult.cleanup.destroy());

  const focusHandler = () => validation.setFocused(true);
  const blurHandler  = () => validation.setFocused(false);
  cbResult.input.addEventListener('focus', focusHandler);
  cbResult.input.addEventListener('blur', blurHandler);
  cleanups.push(() => {
    cbResult.input.removeEventListener('focus', focusHandler);
    cbResult.input.removeEventListener('blur', blurHandler);
  });

  if (checkLabel) {
    const span = document.createElement('span');
    span.textContent = checkLabel;
    span.style.cssText = 'font-size:14px;color:#e2e8f0;margin-left:6px;';
    cbResult.element.appendChild(span);
  }

  const fieldObj = form.getField(fieldName);
  if (fieldObj) {
    const val = (fieldObj.input as unknown as { value: InputDataTypes }).value;
    if (val != null) cbResult.input.checked = Boolean(val);
  }

  validation = document.createElement('vbs-validation-result') as VbsValidationResult;
  validation.slot = 'validation';
  validation.form = form;
  validation.fieldName = fieldName;
  if (guide) validation.guideText = guide;

  const fieldSet = document.createElement('vbs-field-set');
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.slot = 'label';
    labelEl.textContent = label;
    fieldSet.appendChild(labelEl);
  }
  fieldSet.appendChild(cbResult.element);
  fieldSet.appendChild(validation);

  return {
    element: fieldSet,
    refresh: () => validation.refresh(),
    cleanup: { destroy: () => cleanups.forEach(fn => fn()) },
  };
};
