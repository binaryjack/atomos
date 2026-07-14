import type { EntityManager } from '../../presentation/entity-manager.js';

export interface LayoutOptions {
  orientation?: 'horizontal' | 'vertical';
  spacing?: { horizontal: number; vertical: number };
  [key: string]: any;
}

export interface LayoutStrategy {
  readonly name: string;
  execute(entityManager: EntityManager, options?: LayoutOptions): void;
}

class LayoutRegistryImpl {
  private strategies = new Map<string, LayoutStrategy>();

  register(strategy: LayoutStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): LayoutStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllNames(): string[] {
    return Array.from(this.strategies.keys());
  }
}

export const LayoutRegistry = new LayoutRegistryImpl();
