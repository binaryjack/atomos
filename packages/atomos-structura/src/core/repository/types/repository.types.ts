export interface IRepository<T> {
  readonly findById: (id: string) => Promise<T | undefined>;
  readonly findAll: () => Promise<readonly T[]>;
  readonly create: (data: Partial<T>) => Promise<T>;
  readonly update: (id: string, data: Partial<T>) => Promise<T>;
  readonly delete: (id: string) => Promise<void>;
}
