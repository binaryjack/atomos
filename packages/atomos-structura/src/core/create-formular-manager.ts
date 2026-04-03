/**
 * FormularManager - Centralized Form Lifecycle Management
 * 
 * Provides safe, isolated form creation and cleanup for modal components.
 * Prevents DI container collisions and ensures proper resource cleanup.
 */

import type { IFormConfig, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { createForm } from '@binaryjack/formular.dev';

export interface FormularManager {
  readonly createFormForModal: <T extends IObjectShape>(
    modalElement: Element, 
    config: IFormConfig<T>
  ) => Promise<IFormular<IFormConfig<T>['schema']>>;
  readonly cleanupModal: (modalElement: Element) => void;
  readonly getAllActiveForms: () => readonly Element[];
}

/**
 * Creates a FormularManager for centralized form lifecycle management.
 * 
 * Key Features:
 * - Automatic cleanup of previous forms when creating new ones for same modal
 * - WeakMap-based tracking (automatic GC when modal elements are removed)
 * - Explicit cleanup methods for programmatic control
 * - Enhanced logging for debugging form lifecycle issues
 * 
 * @example
 * ```typescript
 * const formManager = createFormularManager();
 * 
 * // In modal component
 * const form = await formManager.createFormForModal(modalElement, {
 *   schema: f.object({ name: f.string().min(1) }),
 *   onSubmit: (data) => console.log(data)
 * });
 * 
 * // Automatic cleanup when modal closes
 * formManager.cleanupModal(modalElement);
 * ```
 */
export const createFormularManager = function(): FormularManager {
  // WeakMap ensures automatic cleanup when modal elements are garbage collected
  const activeFormSessions = new WeakMap<Element, {
    form: IFormular<any>;
    formId: string;
    createdAt: number;
  }>();
  
  let formCounter = 0;

  const createFormForModal = async function<T extends IObjectShape>(
    modalElement: Element,
    config: IFormConfig<T>
  ): Promise<IFormular<IFormConfig<T>['schema']>> {
    const formId = `modal-form-${++formCounter}-${Date.now()}`;
    console.log(`[FORMULAR-MANAGER] Creating form ${formId} for modal:`, modalElement.tagName);
    
    // Clean up any existing form for this modal first
    const existingSession = activeFormSessions.get(modalElement);
    if (existingSession) {
      console.log(`[FORMULAR-MANAGER] Cleaning up existing form ${existingSession.formId} before creating new one`);
      try {
        // Call enhanced destroy method from formular.dev
        (existingSession.form as any).destroy?.();
      } catch (error) {
        console.warn(`[FORMULAR-MANAGER] Error cleaning up existing form:`, error);
      }
    }
    
    // Create new isolated form with enhanced config
    const enhancedConfig: IFormConfig<T> = {
      ...config,
      id: formId, // Ensure unique ID
    };
    
    const form = await createForm(enhancedConfig);
    
    // Track the new form session
    activeFormSessions.set(modalElement, {
      form,
      formId,
      createdAt: Date.now()
    });
    
    console.log(`[FORMULAR-MANAGER] Successfully created and registered form ${formId}`);
    return form as IFormular<IFormConfig<T>['schema']>;
  };
  
  const cleanupModal = function(modalElement: Element): void {
    const session = activeFormSessions.get(modalElement);
    if (session) {
      console.log(`[FORMULAR-MANAGER] Explicitly cleaning up form ${session.formId}`);
      try {
        // Omitting form.destroy() to prevent circular IServiceManager call stack exceptions.
        activeFormSessions.delete(modalElement);
        console.log(`[FORMULAR-MANAGER] Successfully cleaned up form ${session.formId}`);
      } catch (error) {
        console.error('[FORMULAR] Error during form cleanup:', error);
        // Still remove from session even if cleanup failed
        activeFormSessions.delete(modalElement);
      }
    } else {
      console.log(`[FORMULAR-MANAGER] No active form to cleanup for modal:`, modalElement.tagName);
    }
  };
  
  const getAllActiveForms = function(): readonly Element[] {
    // WeakMap doesn't support iteration, but we can provide debugging info
    console.log(`[FORMULAR-MANAGER] Active forms are tracked via WeakMap (automatic GC)`);
    return [];
  };
  
  return {
    createFormForModal,
    cleanupModal,
    getAllActiveForms
  };
};

// Export singleton instance for convenience (optional)
export const globalFormularManager = createFormularManager();
