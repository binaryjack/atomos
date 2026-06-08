import type { SchemaBuilder } from './schema-builder.js';

export interface Extension {
  readonly id: string;
  readonly mount: (builder: SchemaBuilder) => void;
  readonly unmount?: () => void;
}

export const createExtensionLifecycleManager = function() {
  const activeExtensions = new Map<string, Extension>();

  return {
    registerExtension(extension: Extension, builder: SchemaBuilder): void {
      if (activeExtensions.has(extension.id)) {
        console.warn(`Extension ${extension.id} is already registered.`);
        return;
      }
      try {
        extension.mount(builder);
        activeExtensions.set(extension.id, extension);
      } catch (error) {
        console.error(`Failed to mount extension ${extension.id}:`, error);
      }
    },

    unregisterExtension(extensionId: string): void {
      const extension = activeExtensions.get(extensionId);
      if (!extension) return;
      
      try {
        if (extension.unmount) {
          extension.unmount();
        }
      } catch (error) {
        console.error(`Failed to unmount extension ${extensionId}:`, error);
      } finally {
        activeExtensions.delete(extensionId);
      }
    },

    getActiveExtensions(): string[] {
      return Array.from(activeExtensions.keys());
    },

    cleanup(): void {
      for (const [id, extension] of activeExtensions.entries()) {
        try {
          if (extension.unmount) extension.unmount();
        } catch (error) {
          console.error(`Failed to unmount extension ${id} during cleanup:`, error);
        }
      }
      activeExtensions.clear();
    }
  };
};
