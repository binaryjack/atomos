import type { EntityManager } from '../../presentation/entity-manager.js';
import { getInstanceReduxStore } from '../../create-redux-store.js';

export interface LayoutOptions {
  orientation?: 'horizontal' | 'vertical';
  spacing?: { horizontal: number; vertical: number };
  [key: string]: any;
}

/**
 * Layout strategy. Synchronous strategies are wrapped in one undo transaction by the registry;
 * asynchronous ones (returning a Promise) must apply their result in their own transaction.
 */
export interface LayoutStrategy {
  readonly name: string;
  execute(entityManager: EntityManager, options?: LayoutOptions): void | Promise<void>;
}

class LayoutRegistryImpl {
  private strategies = new Map<string, LayoutStrategy>();

  /** Registers a strategy; its synchronous part is wrapped so a whole layout pass is ONE undo step. */
  register(strategy: LayoutStrategy): void {
    this.strategies.set(strategy.name, {
      name: strategy.name,
      execute: (entityManager, options) => getInstanceReduxStore(entityManager.instanceId)
        .transaction(`Layout: ${strategy.name}`, () => strategy.execute(entityManager, options)),
    });
  }

  get(name: string): LayoutStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllNames(): string[] {
    return Array.from(this.strategies.keys());
  }
}

export const LayoutRegistry = new LayoutRegistryImpl();
