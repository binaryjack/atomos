export interface ModalResult<T = unknown> {
  readonly value: T | undefined;
  readonly cancelled: boolean;
}
