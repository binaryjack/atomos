import { createForm, f, newEvent, EventsEnum } from '@binaryjack/formular.dev';
import type { IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { createFormularInput } from '../features/formular/index.js';
import { createFormularDropdown } from '../features/formular/index.js';
import { createFormularCheckbox } from '../features/formular/index.js';
import { createFormularTextarea } from '../features/formular/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const section = function(title: string): HTMLElement {
  const el = document.createElement('section');
  el.style.cssText = 'margin-bottom:48px;';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  h2.style.cssText = [
    'font-size:16px',
    'font-weight:600',
    'color:#94a3b8',
    'text-transform:uppercase',
    'letter-spacing:0.08em',
    'margin:0 0 20px',
    'padding-bottom:10px',
    'border-bottom:1px solid #1e293b',
  ].join(';');
  el.appendChild(h2);
  return el;
};

const btn = function(label: string, variant: 'primary' | 'ghost' = 'primary'): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = [
    'padding:8px 18px',
    'border-radius:6px',
    'font-size:14px',
    'font-weight:500',
    'cursor:pointer',
    'border:1px solid',
    'transition:opacity 0.15s',
    variant === 'primary'
      ? 'background:#3b82f6;color:#fff;border-color:#3b82f6;'
      : 'background:transparent;color:#94a3b8;border-color:#334155;',
  ].join(';');
  b.addEventListener('mouseenter', () => { b.style.opacity = '0.8'; });
  b.addEventListener('mouseleave', () => { b.style.opacity = '1'; });
  return b;
};

const codeBlock = function(text: string): HTMLElement {
  const pre = document.createElement('pre');
  pre.style.cssText = [
    'background:#1e293b',
    'border:1px solid #334155',
    'border-radius:8px',
    'padding:16px 20px',
    'font-size:13px',
    'font-family:JetBrains Mono,Monaco,monospace',
    'color:#e2e8f0',
    'overflow-x:auto',
    'line-height:1.7',
    'margin:0',
  ].join(';');
  pre.textContent = text;
  return pre;
};

// ── Section A: Contact form ───────────────────────────────────────────────────

const buildContactForm = async function(parent: HTMLElement): Promise<() => void> {
  const cleanups: Array<() => void> = [];

  const form = await createForm({
    schema: f.object({
      name:      f.string().min(1, 'Full name is required'),
      email:     f.string().email('Invalid email').min(1, 'Email is required'),
      subject:   f.string().min(1, 'Subject is required'),
      subscribe: f.boolean(),
      message:   f.string().min(1, 'Message is required'),
    }),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      subscribe: false,
      message: '',
    },
  }) as unknown as IFormular<IObjectShape>;

  const formEl = document.createElement('div');
  formEl.style.cssText = [
    'background:#0f172a',
    'border:1px solid #1e293b',
    'border-radius:10px',
    'padding:24px',
    'display:flex',
    'flex-direction:column',
    'gap:16px',
  ].join(';');

  const nameField = createFormularInput({ fieldName: 'name', form, label: 'Full name', placeholder: 'Jane Smith', type: 'text', guide: 'Enter your first and last name.' });
  const emailField = createFormularInput({ fieldName: 'email', form, label: 'Email', placeholder: 'jane@example.com', type: 'email', guide: 'We\'ll use this to reply to you.' });
  const subjectField = createFormularDropdown({
    fieldName: 'subject',
    form,
    label: 'Subject',
    placeholder: 'Select a topic…',
    guide: 'Choose the topic that best fits your message.',
    options: [
      { value: 'support', label: 'Technical support' },
      { value: 'billing', label: 'Billing question' },
      { value: 'feedback', label: 'Product feedback' },
      { value: 'other', label: 'Other' },
    ],
  });
  const subscribeField = createFormularCheckbox({ fieldName: 'subscribe', form, checkLabel: 'Subscribe to updates' });
  const messageField = createFormularTextarea({ fieldName: 'message', form, label: 'Message', placeholder: 'Tell us more…', rows: 4, guide: 'Describe your issue or question in detail.' });

  cleanups.push(
    () => nameField.cleanup.destroy(),
    () => emailField.cleanup.destroy(),
    () => subjectField.cleanup.destroy(),
    () => subscribeField.cleanup.destroy(),
    () => messageField.cleanup.destroy(),
  );

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:10px;margin-top:8px;';

  const submitBtn = btn('Submit');
  const resetBtn = btn('Reset', 'ghost');

  submitBtn.addEventListener('click', async () => {
    const required = ['name', 'email', 'subject', 'message'];
    for (const fn of required) {
      const fld = form.getField(fn);
      if (fld) {
        await (fld.input as unknown as { handleValidationAsync: (e: unknown) => Promise<unknown[]> })
          .handleValidationAsync(newEvent(fn, 'vbs', EventsEnum.onSubmit, 'submit', fn, fld));
      }
    }
    nameField.refresh();
    emailField.refresh();
    subjectField.refresh();
    subscribeField.refresh();
    messageField.refresh();
    const hasErrors = required.some(fn => {
      const fld = form.getField(fn);
      if (!fld) return false;
      const results = (fld.input as unknown as { validationResults?: { state: boolean }[] }).validationResults ?? [];
      return results.some(r => !r.state);
    });
    if (hasErrors) {
      resultBox.style.display = 'block';
      resultBox.textContent = '✗ Fix validation errors above.';
      resultBox.style.color = '#f87171';
    } else {
      const data = {
        name:      String(form.getField('name')?.input?.value ?? ''),
        email:     String(form.getField('email')?.input?.value ?? ''),
        subject:   String(form.getField('subject')?.input?.value ?? ''),
        subscribe: Boolean(form.getField('subscribe')?.input?.value),
        message:   String(form.getField('message')?.input?.value ?? ''),
      };
      resultBox.style.display = 'block';
      resultBox.textContent = `✓ Submitted: ${JSON.stringify(data, null, 2)}`;
      resultBox.style.color = '#4ade80';
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    resultBox.style.display = 'none';
  });

  actions.appendChild(submitBtn);
  actions.appendChild(resetBtn);

  const resultBox = document.createElement('pre');
  resultBox.style.cssText = [
    'display:none',
    'background:#1e293b',
    'border-radius:6px',
    'padding:12px',
    'font-size:12px',
    'font-family:monospace',
    'white-space:pre-wrap',
    'margin:0',
  ].join(';');

  formEl.appendChild(nameField.element);
  formEl.appendChild(emailField.element);
  formEl.appendChild(subjectField.element);
  formEl.appendChild(subscribeField.element);
  formEl.appendChild(messageField.element);
  formEl.appendChild(actions);
  formEl.appendChild(resultBox);

  cleanups.push(() => form.dispose?.());

  parent.appendChild(formEl);
  return () => cleanups.forEach(fn => fn());
};

// ── Section B: Schema snippet ─────────────────────────────────────────────────

const buildSchemaSection = function(parent: HTMLElement): void {
  parent.appendChild(codeBlock(
`import { createForm, f } from '@binaryjack/formular.dev';

const form = await createForm({
  schema: f.object({
    name:      f.string(),
    email:     f.string(),
    subject:   f.string(),
    subscribe: f.boolean(),
    message:   f.string(),
  }),
  defaultValues: { name: '', email: '', subject: '', subscribe: false, message: '' },
});

// Field atoms wrap formular field state + web-ui input atoms
createFormularInput({ fieldName: 'name', form, label: 'Full name' });
createFormularDropdown({ fieldName: 'subject', form, options: [...] });
createFormularCheckbox({ fieldName: 'subscribe', form, checkLabel: 'Subscribe' });
createFormularTextarea({ fieldName: 'message', form, label: 'Message', rows: 4 });

// Guide component: focused + errors → blue hints  |  blur + errors → red errors
// Attaches automatically below every atom — no extra wiring needed.

await form.validateForm();   // boolean — validates all fields
form.reset();                // restore defaultValues
form.getData();              // Record<string, InputDataTypes>
form.getErrors();            // Record<string, IFieldError[]>
form.observe(fieldName, cb); // low-level change subscription → () => void`
  ));
};

// ── Section C: API card grid ──────────────────────────────────────────────────

const apiCard = function(name: string, desc: string): HTMLDivElement {
  const card = document.createElement('div');
  card.style.cssText = [
    'background:#0f172a',
    'border:1px solid #1e293b',
    'border-radius:8px',
    'padding:16px',
  ].join(';');
  card.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#a5b4fc;font-family:monospace;margin-bottom:6px;">${name}</div>
    <div style="font-size:13px;color:#94a3b8;line-height:1.5;">${desc}</div>
  `;
  return card;
};

const buildApiGrid = function(parent: HTMLElement): void {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;';

  grid.appendChild(apiCard('createFormularInput', 'Text / email / number / password input wired to a form field. Appends field-guide below.'));
  grid.appendChild(apiCard('createFormularDropdown', 'Select element with options array. Validates on blur. Field-guide included.'));
  grid.appendChild(apiCard('createFormularCheckbox', 'Checkbox bound to a boolean field. Pair with a checkLabel.'));
  grid.appendChild(apiCard('createFormularTextarea', 'Multi-line text area. Uses onInput for live sync.'));
  grid.appendChild(apiCard('createFieldGuide', 'Agnostic guide/error renderer. focused + errors → blue guide text. blur + errors → red errors.'));
  grid.appendChild(apiCard('form.observe(name, cb)', 'Low-level subscription fired on any state change for a field. Returns unsubscriber.'));

  parent.appendChild(grid);
};

// ── Page factory ──────────────────────────────────────────────────────────────

export const createFormularPage = function(): { element: HTMLDivElement; cleanup: { destroy: () => void } } {
  const cleanups: Array<() => void> = [];

  const root = document.createElement('div');
  root.style.cssText = [
    'min-height:100vh',
    'background:#0f172a',
    'color:#f1f5f9',
    'font-family:system-ui,sans-serif',
    'padding-top:40px',
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:860px;margin:0 auto;padding:48px 24px;';

  // Heading
  const heading = document.createElement('div');
  heading.style.cssText = 'margin-bottom:40px;';
  heading.innerHTML = `
    <h1 style="font-size:28px;font-weight:700;color:#f1f5f9;margin:0 0 8px;">Formular</h1>
    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6;">
      <a href="https://formular.dev" target="_blank" style="color:#38bdf8;text-decoration:none;">@binaryjack/formular.dev</a>
      integration — schema-driven forms with live validation, field guides, and error display.
      No framework. No virtual DOM.
    </p>
  `;
  inner.appendChild(heading);

  // Section A — Live demo
  const demoSec = section('Live demo');
  inner.appendChild(demoSec);

  // Async — mount form after createForm resolves
  buildContactForm(demoSec).then(cleanup => cleanups.push(cleanup)).catch(console.error);

  // Section B — Schema / usage
  const schemaSec = section('Schema & usage');
  buildSchemaSection(schemaSec);
  inner.appendChild(schemaSec);

  // Section C — API reference
  const apiSec = section('Atom API');
  buildApiGrid(apiSec);
  inner.appendChild(apiSec);

  root.appendChild(inner);

  return {
    element: root,
    cleanup: {
      destroy: () => cleanups.forEach(fn => fn()),
    },
  };
};
