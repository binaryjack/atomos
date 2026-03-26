export interface IStorageProvider<T = unknown> {
  readonly get: (key: string) => Promise<T | null>;
  readonly set: (key: string, value: T) => Promise<void>;
  readonly delete: (key: string) => Promise<void>;
  readonly list: () => Promise<readonly string[]>;
  readonly clear: () => Promise<void>;
}
