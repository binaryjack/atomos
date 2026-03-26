import type { IStorageProvider } from '../../storage/types/storage-provider.types.js';
import type { Signal } from '../../types/signal.types.js';

export interface RepositoryConfig<T> {
  readonly storageProvider: IStorageProvider<T>;
  readonly signal: Signal<T>;
  readonly schema?: { readonly cast: (data: unknown) => T };
}
