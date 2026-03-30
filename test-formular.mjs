import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.CustomEvent = dom.window.CustomEvent;

// We need @binaryjack/formular.dev
import { f } from '@binaryjack/formular.dev';
import { createFormularManager } from './packages/web-ui/dist/core/create-formular-manager.js';

async function run() {
  const modal = document.createElement('div');
  document.body.appendChild(modal);

  const formManager = createFormularManager();
  const schema = f.object({
    label: f.string().optional(),
    dataType: f.string().optional(),
    componentType: f.string().optional(),
  });

  const form = await formManager.createFormForModal(modal, {
    schema,
    defaultValues: { label: 'Old Label', dataType: 'string', componentType: 'input' }
  });

  // Now emulate user typing
  form.updateField('label', 'New Label!!');

  console.log('--- validate ---');
  const isValid = await form.validateForm();
  console.log('isValid:', isValid);

  console.log('--- data ---');
  console.log(form.getData());
}
run();
