import './dom-setup.mjs';
import { getCanvasAdapter } from './dist/core/adapters/canvas-adapter.js';
import { createPropertySettingsModal } from './dist/features/modal/create-property-settings-modal.js';

if (!customElements.get('vbs-modal')) customElements.define('vbs-modal', (await import('./dist/features/modal/vbs-modal.js')).VbsModal);
if (!customElements.get('vbs-validation-result')) customElements.define('vbs-validation-result', class VbsValidationResult extends HTMLElement { refresh(){} });

async function run() {
    const adapter = getCanvasAdapter();
    adapter.createEntity('E1', 'My Entity', 0, 0, 100, 100);
    adapter.updateEntityProperties('E1', [{ key: 'p1', label: 'Old Label', dataType: 'string', componentType: 'input' }]);

    const modal = createPropertySettingsModal({ entityId: 'E1', propertyKey: 'p1' });
    document.body.appendChild(modal);
    modal.open();
    await new Promise(r => setTimeout(r, 100));

    const labelInput = modal.querySelector('#label');
    labelInput.value = 'New Awesome Label';
    labelInput.dispatchEvent(new Event('input', { bubbles: true }));
    labelInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    
    // Check validation states inside actual VbsValidationResult elements
    const origWarn = console.warn;
    console.warn = (...args) => {
        if(args[0]?.includes('Form validation failed')) {
            console.log("VALIDATION FAILED!");
            const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Save');
        }
        origWarn(...args);
    };
    const origLog = console.log;
    console.log = (...args) => {
        origLog(...args);
        if(args[0]?.includes('Form data retrieved:')) {
            origLog("==== Form Data ===", args[1]);
        }
    };

    const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Save');
    // I can monkey patch the schema so it doesn't fail!
    
    saveBtn.dispatchEvent(new Event('click'));
}
run().catch(console.error);
