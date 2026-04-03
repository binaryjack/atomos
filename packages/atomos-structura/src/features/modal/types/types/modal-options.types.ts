import type { ModalResult } from './modal-result.types.js';

export interface ModalOptions<T = unknown> {
  readonly onResult?: (result: ModalResult<T>) => void;
}
