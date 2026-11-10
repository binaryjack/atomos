// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ApplicationEvent, EventBus } from '../application/entity-service.js';

/** Synchronous pub/sub bus decoupling the application layer from UI components. */
export const createEventBus = function(): EventBus {
  const handlers = new Set<(event: ApplicationEvent) => void>();

  const publish = function(event: ApplicationEvent): void {
    // Snapshot handlers so re-entrant publishes (entity spawn → another event) cannot corrupt iteration.
    Array.from(handlers).forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler failed for ${event.type}:`, error);
      }
    });
  };

  const subscribe = function(handler: (event: ApplicationEvent) => void): () => void {
    handlers.add(handler);
    return function unsubscribe() {
      handlers.delete(handler);
    };
  };

  return { publish, subscribe };
};
