import type { IFormular, IObjectShape } from '@binaryjack/formular.dev';

export interface FieldGuideProps {
  readonly fieldName: string;
  readonly form: IFormular<IObjectShape>;
  readonly getIsFocused: () => boolean;
}

export interface FieldGuideResult {
  readonly element: HTMLElement;
  readonly refresh: () => void;
  readonly cleanup: { destroy: () => void };
}
