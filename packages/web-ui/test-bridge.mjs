import { getCanvasAdapter } from './dist/core/adapters/canvas-adapter.js';
import { createLegacyEntityStoreBridge } from './dist/core/adapters/legacy-property-bridge.js';
import { getGlobalReduxStore } from './dist/core/create-redux-store.js';

async function run() {
  const adapter = getCanvasAdapter();
  adapter.createEntity('E1', 'My Entity', 0, 0, 100, 100);
  
  // Bridge
  const bridgeStore = createLegacyEntityStoreBridge('E1');
  
  // Track Signal
  bridgeStore.signal.subscribe(e => console.log('Signal updated! Name:', e.name, 'Props:', e.properties));
  
  console.log('--- Setting properties ---');
  adapter.updateEntityProperties('E1', [{ key: 'p1', label: 'My Initial Prop', dataType: 'string', componentType: 'input' }]);

  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('--- Modifying properties (like modal does) ---');
  const entity = adapter.getEntity('E1');
  const newProps = entity.properties.map(p => p.key === 'p1' ? { ...p, label: 'UPDATED LABEL' } : p);
  adapter.updateEntityProperties('E1', newProps);
  
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Redux store state entities:', getGlobalReduxStore().get_state().schemas['schema-default'].entities);
}

run();
