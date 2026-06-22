export * from './core/neura-store';
export * from './renderer/webgl-engine';
export * from './renderer/culling-system';
export * from './create-neura-instance';

// Worker would typically be instantiated differently depending on the bundler (Vite, Webpack),
// but we export the path or a factory function here for convenience.
export function createNeuraPhysicsWorker(): Worker {
  return new Worker(new URL('./physics/worker.ts', import.meta.url), { type: 'module' });
}
