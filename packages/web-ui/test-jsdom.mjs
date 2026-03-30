import { JSDOM } from "jsdom";
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.Event = dom.window.Event;

import { webcrypto } from "crypto";
global.crypto = webcrypto;

// Set up localStorage mock
global.localStorage = {
  store: {},
  getItem: function(key) { return this.store[key] || null; },
  setItem: function(key, val) { this.store[key] = val; },
  removeItem: function(key) { delete this.store[key]; },
  clear: function() { this.store = {}; }
};

import { createLegacyEntityStoreBridge } from './dist/core/adapters/legacy-property-bridge.js';
import { getCanvasAdapter } from './dist/core/adapters/canvas-adapter.js';
import { createPropertySettingsModal } from './dist/features/modal/create-property-settings-modal.js';
import { getGlobalReduxStore } from './dist/core/create-redux-store.js';
import { VbsModal } from './dist/features/modal/vbs-modal.js';
customElements.define('vbs-modal', VbsModal);
customElements.define('vbs-validation-result', class VbsValidationResult extends HTMLElement { refresh(){} });

async function run() {
    console.log("Setting up env...");
    const adapter = getCanvasAdapter();
    adapter.createEntity('E1', 'My Entity', 0, 0, 100, 100);
    adapter.updateEntityProperties('E1', [
        { key: 'p1', label: 'Old Label', dataType: 'string', componentType: 'input' }
    ]);
    
    const reduxStore = getGlobalReduxStore();
    console.log("REDUX INITIAL:", reduxStore.get_state().schemas['schema-default'].entities[0].properties);

    const bridgeStore = createLegacyEntityStoreBridge('E1');
    console.log("BRIDGE SIGNAL INITIAL:", bridgeStore.signal.value.properties);
    
    console.log("Creating MODAL...");
    const modal = createPropertySettingsModal({ entityId: 'E1', propertyKey: 'p1' });
    document.body.appendChild(modal);
    await modal.open();
    
    // Simulate typing in the label field
    const inputs = modal.querySelectorAll('input');
    const labelInput = Array.from(inputs).find(i => i.id === 'label');
    if(labelInput) {
        console.log("Found label input! Setting value to 'New Awesome Label'");
        labelInput.value = 'New Awesome Label';
        labelInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger formular
    } else {
        console.log("NO LABEL INPUT FOUND?");
        console.log("Modal innerHTML:", modal.innerHTML);
    }
    
    const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Save');
    if(saveBtn) {
        console.log("Found Save button! Clicking it...");
        saveBtn.dispatchEvent(new Event('click'));
        
        await new Promise(r => setTimeout(r, 200)); // wait async
        
        console.log("BRIDGE SIGNAL AFTER SAVE:", bridgeStore.signal.value.properties);
        console.log("REDUX AFTER SAVE:", reduxStore.get_state().schemas['schema-default'].entities[0].properties);
    }
}
run().catch(console.error);
