export { AtpFieldGuide } from './atp-field-guide.js';
export { AtpValidationResult } from './atp-validation-result.js';
export { AtpFieldSet } from './atp-field-set.js';

export { AtpFormularInput } from './atoms/atp-formular-input.js';
export { AtpFormularDropdown } from './atoms/atp-formular-dropdown.js';
export type { FormularDropdownOption } from './atoms/atp-formular-dropdown.js';
export { AtpFormularCheckbox } from './atoms/atp-formular-checkbox.js';
export { AtpFormularTextarea } from './atoms/atp-formular-textarea.js';

import type { FieldGuideProps, FieldGuideResult } from './types/field-guide.types.js';
import type { FormularAtomProps, FormularAtomResult } from './types/formular-atom.types.js';

import { AtpFieldGuide } from './atp-field-guide.js';
import { AtpFormularInput } from './atoms/atp-formular-input.js';
import { AtpFormularDropdown } from './atoms/atp-formular-dropdown.js';
import { AtpFormularCheckbox } from './atoms/atp-formular-checkbox.js';
import { AtpFormularTextarea } from './atoms/atp-formular-textarea.js';

export type { FieldGuideProps, FieldGuideResult, FormularAtomProps, FormularAtomResult };

export const createFieldGuide = function(props: FieldGuideProps): FieldGuideResult {
  const el = document.createElement('atp-field-guide') as AtpFieldGuide;
  el.fieldName = props.fieldName;
  el.form = props.form;
  el.getIsFocused = props.getIsFocused;
  return {
    element: el,
    refresh: () => el.refresh(),
    cleanup: { destroy: () => { el.disconnectedCallback(); el.remove(); } }
  };
};

export const createFormularInput = function(props: FormularAtomProps & { placeholder?: string, type?: string }): FormularAtomResult {
  const el = document.createElement('atp-formular-input') as AtpFormularInput;
  el.fieldName = props.fieldName;
  el.form = props.form;
  if (props.label) el.label = props.label;
  if (props.guide) el.guide = props.guide;
  if (props.placeholder) el.placeholder = props.placeholder;
  if (props.type) el.type = props.type;
  return {
    element: el,
    refresh: () => {},
    cleanup: { destroy: () => { el.disconnectedCallback(); el.remove(); } }
  };
};

export const createFormularDropdown = function(props: FormularAtomProps & { options: any[], placeholder?: string }): FormularAtomResult {
  const el = document.createElement('atp-formular-dropdown') as AtpFormularDropdown;
  el.fieldName = props.fieldName;
  el.form = props.form;
  el.options = props.options;
  if (props.label) el.label = props.label;
  if (props.guide) el.guide = props.guide;
  if (props.placeholder) el.placeholder = props.placeholder;
  return {
    element: el,
    refresh: () => {},
    cleanup: { destroy: () => { el.disconnectedCallback(); el.remove(); } }
  };
};

export const createFormularCheckbox = function(props: FormularAtomProps & { checkLabel?: string }): FormularAtomResult {
  const el = document.createElement('atp-formular-checkbox') as AtpFormularCheckbox;
  el.fieldName = props.fieldName;
  el.form = props.form;
  if (props.label) el.label = props.label;
  if (props.guide) el.guide = props.guide;
  if (props.checkLabel) el.checkLabel = props.checkLabel;
  return {
    element: el,
    refresh: () => {},
    cleanup: { destroy: () => { el.disconnectedCallback(); el.remove(); } }
  };
};

export const createFormularTextarea = function(props: FormularAtomProps & { placeholder?: string, rows?: number }): FormularAtomResult {
  const el = document.createElement('atp-formular-textarea') as AtpFormularTextarea;
  el.fieldName = props.fieldName;
  el.form = props.form;
  if (props.label) el.label = props.label;
  if (props.guide) el.guide = props.guide;
  if (props.placeholder) el.placeholder = props.placeholder;
  if (props.rows) el.rows = props.rows;
  return {
    element: el,
    refresh: () => {},
    cleanup: { destroy: () => { el.disconnectedCallback(); el.remove(); } }
  };
};

export interface FormularInputProps extends FormularAtomProps { placeholder?: string; type?: string; }
export interface FormularDropdownProps extends FormularAtomProps { options: any[]; placeholder?: string; }
export interface FormularCheckboxProps extends FormularAtomProps { checkLabel?: string; }
export interface FormularTextareaProps extends FormularAtomProps { placeholder?: string; rows?: number; }
export { AtpValidationResult as VbsValidationResult, AtpFieldSet as VbsFieldSet };

import { AtpValidationResult } from './atp-validation-result.js'; import { AtpFieldSet } from './atp-field-set.js';
