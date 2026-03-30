import { getCanvasAdapter } from './core/adapters/canvas-adapter.js';
import { getGlobalReduxStore } from './core/create-redux-store.js';
import { selectEntityById } from './core/selectors.js';

if (typeof window === 'undefined') {
  (global as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, length: 0, key: () => null };
  (global as any).window = global;
}

const adapter = getCanvasAdapter();
adapter.createEntity('test-1', 'Test Entity', 0, 0, 100, 100);
adapter.updateEntityProperties('test-1', [{ key: 'p1', label: 'Prop 1', dataType: 'string', componentType: 'input' }]);

const updated = selectEntityById('test-1');
console.log('SELECTOR:', updated?.properties);

const newProperties = updated!.properties.map((p: any) =>
  p.key === 'p1' ? { ...p, label: 'NEW LABEL' } : p
);

adapter.updateEntityProperties('test-1', newProperties);
const finalState = selectEntityById('test-1');
console.log('FINAL PROPS:', finalState?.properties);
