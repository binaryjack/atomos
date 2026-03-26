export interface StorageConfig {
  readonly prefix?: string;
  readonly serializer?: {
    readonly serialize: (value: unknown) => string;
    readonly deserialize: (raw: string) => unknown;
  };
}
