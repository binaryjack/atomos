import type { Signal } from './types/signal.types.js';
import type { AppState } from './types/app-state.types.js';
import type { SchemaModel } from './types/schema-model.types.js';
import type { GlobalConfig } from './types/global-config.types.js';
import { registry } from './create-signal-registry.js';
import { APP_KEY, SCHEMAS_KEY } from './registry-keys.js';
import { DEFAULT_GLOBAL_CONFIG } from './types/global-config.types.js';
import { createLocalStoragePersistence, readLocalStorage } from './create-local-storage-persistence.js';
import { createSchemaStore } from './create-schema-store.js';
import { createGlobalStore } from './create-global-store.js';

const LS_SCHEMAS = 'vbe2-schemas';
const LS_APP     = 'vbe2-app';

export interface AppStore {
  readonly appSignal: Signal<AppState>;
  readonly schemasSignal: Signal<SchemaModel[]>;
  readonly globalStore: ReturnType<typeof createGlobalStore>;
  readonly setActiveSchema: (schemaId: string) => void;
  readonly addSchema: (schema: SchemaModel) => void;
  readonly getSchemaStore: (schemaId: string) => ReturnType<typeof createSchemaStore> | undefined;
  readonly cleanup: { destroy: () => void };
}

const makeDefaultSchema = (): SchemaModel => ({
  id: 'schema-default',
  name: 'Default Schema',
  entities: [],
  links: [],
  canvasStates: [],
});

export const createAppStore = function(): AppStore {
  const globalStore = createGlobalStore();

  const savedSchemas = readLocalStorage<SchemaModel[]>(LS_SCHEMAS) ?? [makeDefaultSchema()];
  const savedApp     = readLocalStorage<{ activeSchemaId?: string }>(LS_APP);

  const schemasSignal = registry.getOrCreate<SchemaModel[]>(SCHEMAS_KEY, savedSchemas);

  const initial: AppState = {
    activeSchemaId: savedApp?.activeSchemaId ?? savedSchemas[0]?.id,
    schemas: schemasSignal.value,
    global: globalStore.signal.value,
  };

  const appSignal = registry.getOrCreate<AppState>(APP_KEY, initial);

  // Hydrate schema stores
  savedSchemas.forEach(s => createSchemaStore(s));

  const sync = (): void => {
    appSignal.set({
      ...appSignal.value,
      schemas: schemasSignal.value,
      global: globalStore.signal.value,
    });
  };

  const unsubSchemas = schemasSignal.subscribe(sync);
  const unsubGlobal  = globalStore.signal.subscribe(sync);

  const schemasPersist = createLocalStoragePersistence(LS_SCHEMAS, schemasSignal);
  const appPersist     = createLocalStoragePersistence(LS_APP, appSignal);

  const setActiveSchema = (schemaId: string): void => {
    appSignal.set({ ...appSignal.value, activeSchemaId: schemaId });
  };

  const addSchema = (schema: SchemaModel): void => {
    createSchemaStore(schema);
    schemasSignal.set([...schemasSignal.value, schema]);
  };

  const getSchemaStore = (schemaId: string): ReturnType<typeof createSchemaStore> | undefined => {
    const schema = schemasSignal.value.find(s => s.id === schemaId);
    return schema ? createSchemaStore(schema) : undefined;
  };

  return {
    appSignal,
    schemasSignal,
    globalStore,
    setActiveSchema,
    addSchema,
    getSchemaStore,
    cleanup: {
      destroy: () => {
        unsubSchemas();
        unsubGlobal();
        schemasPersist.destroy();
        appPersist.destroy();
        globalStore.cleanup.destroy();
      }
    }
  };
};
