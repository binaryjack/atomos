import type { ExportPlugin, CustomExportPlugin } from './export-plugin.types.js';
import type { SchemaGraphState } from '../../core/create-schema-graph-kernel.js';

let CUSTOM_PLUGINS_KEY = 'vbe2:export-custom-plugins';

const builtins = new Map<string, ExportPlugin>();

/**
 * Initialize the export registry with an instanceId for multi-instance isolation.
 * Call this once during initialization before any other registry functions.
 */
export const initExportRegistry = (instanceId?: string): void => {
  CUSTOM_PLUGINS_KEY = `${instanceId ? `${instanceId}:` : ''}vbe2:export-custom-plugins`;
};

export const registerExportPlugin = (plugin: ExportPlugin): void => {
  builtins.set(plugin.id, plugin);
};

export const getExportPlugins = (): ExportPlugin[] => Array.from(builtins.values());

export const getExportPlugin = (id: string): ExportPlugin | undefined => builtins.get(id);

// ─── Custom (user-authored) plugins stored in localStorage ─────────────────

const loadCustomPlugins = (): CustomExportPlugin[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_PLUGINS_KEY);
    return raw ? (JSON.parse(raw) as CustomExportPlugin[]) : [];
  } catch {
    return [];
  }
};

const saveCustomPlugins = (plugins: CustomExportPlugin[]): void => {
  localStorage.setItem(CUSTOM_PLUGINS_KEY, JSON.stringify(plugins));
};

export const getCustomExportPlugins = (): CustomExportPlugin[] => loadCustomPlugins();

export const saveCustomExportPlugin = (plugin: CustomExportPlugin): void => {
  const existing = loadCustomPlugins().filter(p => p.id !== plugin.id);
  saveCustomPlugins([...existing, plugin]);
};

export const deleteCustomExportPlugin = (id: string): void => {
  saveCustomPlugins(loadCustomPlugins().filter(p => p.id !== id));
};

/**
 * Compile and run a custom plugin from its stored fnBody.
 * The function body receives `snapshot` and must return a string.
 * Returns null if the function throws or returns a non-string.
 */
export const runCustomExportPlugin = (plugin: CustomExportPlugin, snapshot: SchemaGraphState): string | null => {
  try {
    // new Function is the only way to execute user code — this is an intentional
    // developer tool feature, not unvalidated user input from a network source.
    // eslint-disable-next-line no-new-func
    const fn = new Function('snapshot', plugin.fnBody) as (s: SchemaGraphState) => unknown;
    const result = fn(snapshot);
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    return `// Plugin error: ${String(err)}`;
  }
};
