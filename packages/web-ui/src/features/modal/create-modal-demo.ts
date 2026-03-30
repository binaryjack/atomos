import type { IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { createForm, EventsEnum, f, newEvent } from '@binaryjack/formular.dev';
import { createButton } from '../button/create-button.js';
import { createFormularInput } from '../formular/atoms/create-formular-input.js';
import { createFormularTextarea } from '../formular/atoms/create-formular-textarea.js';
import '../formular/index.js';
import './index.js';
import type { ModalResult } from './types/modal-result.types.js';
import type { VbsModal } from './vbs-modal.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const btn = (
  label: string,
  variant: 'primary' | 'secondary' | 'danger' | 'ghost',
  onClick: () => void,
): HTMLButtonElement => {
  const result = createButton({
    variant,
    size: 'md',
    children: label,
    onClick
  });
  return result.element;
};

const appendModal = (modal: HTMLElement): void => {
  document.body.appendChild(modal);
};

const triggerBtn = (label: string, onClick: () => void): HTMLButtonElement =>
  btn(label, 'primary', onClick);

// ─── Alert modal ─────────────────────────────────────────────────────────────

const buildAlertModal = (): VbsModal => {
  const modal = document.createElement('vbs-modal') as VbsModal;

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Information';
  header.setAttribute('slot', 'header');

  const body = document.createElement('p');
  body.textContent = 'This is an agnostic alert modal. Click outside, press ESC, or click OK to close.';
  body.style.cssText = 'margin:0;color:#cbd5e1;';

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  footer.appendChild(btn('OK', 'primary', () => modal.close('ok')));

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  appendModal(modal);
  return modal;
};

// ─── Confirm modal ───────────────────────────────────────────────────────────

const buildConfirmModal = (): VbsModal => {
  const modal = document.createElement('vbs-modal') as VbsModal;

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Confirm Action';
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.innerHTML = `
    <p style="margin:0 0 12px;color:#f1f5f9;font-weight:500;">Delete this entity?</p>
    <p style="margin:0;color:#94a3b8;font-size:13px;">This action cannot be undone. All associated links will also be removed.</p>
  `;

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  footer.appendChild(btn('Cancel',  'ghost',  () => modal.close()));
  footer.appendChild(btn('Delete',  'danger',  () => modal.close('confirmed')));

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  appendModal(modal);
  return modal;
};

// ─── Form modal ──────────────────────────────────────────────────────────────

const buildFormModal = (): VbsModal => {
  const modal = document.createElement('vbs-modal') as VbsModal;
  modal.style.setProperty('--vbs-modal-width', '520px');

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Edit Entity';
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

  // Save action ref — wired once form resolves
  let doSave: (() => void) | null = null;
  let doReset: (() => void) | null = null;

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  footer.appendChild(btn('Cancel', 'ghost', () => { doReset?.(); modal.close(); }));
  footer.appendChild(btn('Save', 'primary', () => { doSave?.(); }));

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  appendModal(modal);

  // ── Async form setup ────────────────────────────────────────────────────────
  (async () => {
    const form = await createForm({
      schema: f.object({
        name:        f.string().min(1, 'Name is required'),
        code:        f.string().min(1, 'Code is required'),
        description: f.string(),
      }),
      defaultValues: { name: '', code: '', description: '' },
    }) as unknown as IFormular<IObjectShape>;

    const nameField = createFormularInput({
      fieldName: 'name', form, label: 'Entity name', placeholder: 'e.g. User', type: 'text',
      guide: 'Enter a unique display name for this entity.',
    });
    const codeField = createFormularInput({
      fieldName: 'code', form, label: 'Code', placeholder: 'e.g. USR', type: 'text',
      guide: 'Short uppercase identifier, e.g. USR or PROD.',
    });
    const descField = createFormularTextarea({
      fieldName: 'description', form, label: 'Description', placeholder: 'Optional description…', rows: 3,
      guide: 'Optional — brief description of what this entity represents.',
    });

    body.appendChild(nameField.element);
    body.appendChild(codeField.element);
    body.appendChild(descField.element);

    doReset = () => form.reset();

    doSave = async () => {
      const fieldNames = ['name', 'code', 'description'] as const;
      for (const fn of fieldNames) {
        const fld = form.getField(fn);
        if (fld) {
          await (fld.input as unknown as { handleValidationAsync: (e: unknown) => Promise<unknown[]> })
            .handleValidationAsync(newEvent(fn, 'vbs', EventsEnum.onSubmit, 'submit', fn, fld));
        }
      }
      nameField.refresh();
      codeField.refresh();
      descField.refresh();
      const hasErrors = (['name', 'code', 'description'] as const).some(fn => {
        const fld = form.getField(fn);
        if (!fld) return false;
        const results = (fld.input as unknown as { validationResults?: { state: boolean }[] }).validationResults ?? [];
        return results.some(r => !r.state);
      });
      if (hasErrors) return;
      modal.close({
        name:        String(form.getField('name')?.input?.value  ?? ''),
        code:        String(form.getField('code')?.input?.value  ?? ''),
        description: String(form.getField('description')?.input?.value ?? ''),
      });
      form.reset();
    };
  })().catch(console.error);

  return modal;
};

// ─── Stacked second modal ─────────────────────────────────────────────────────

const buildStackedModal = (): VbsModal => {
  const inner = document.createElement('vbs-modal') as VbsModal;

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Inner Modal (stacked)';
  header.setAttribute('slot', 'header');

  const body = document.createElement('p');
  body.textContent = 'I am a second modal stacked on top. Press ESC or click outside — only I close.';
  body.style.cssText = 'margin:0;color:#cbd5e1;';

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  footer.appendChild(btn('Close inner', 'secondary', () => inner.close('inner-closed')));

  inner.appendChild(header);
  inner.appendChild(body);
  inner.appendChild(footer);
  appendModal(inner);
  return inner;
};

const buildStackingModal = (innerModal: VbsModal): VbsModal => {
  const outer = document.createElement('vbs-modal') as VbsModal;

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Outer Modal';
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const info = document.createElement('p');
  info.textContent = 'I am the outer modal. Click the button below to open a second modal on top of me.';
  info.style.cssText = 'margin:0;color:#cbd5e1;';

  const openInnerBtn = btn('Open inner modal', 'secondary', async () => {
    const result = await innerModal.open<string>();
    const msg = document.getElementById('stacked-result');
    if (msg) msg.textContent = `Inner closed → ${JSON.stringify(result)}`;
  });

  const resultMsg = document.createElement('p');
  resultMsg.id = 'stacked-result';
  resultMsg.style.cssText = 'margin:0;font-size:12px;color:#94a3b8;min-height:18px;';

  body.appendChild(info);
  body.appendChild(openInnerBtn);
  body.appendChild(resultMsg);

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  footer.appendChild(btn('Close outer', 'ghost', () => outer.close()));

  outer.appendChild(header);
  outer.appendChild(body);
  outer.appendChild(footer);
  appendModal(outer);
  return outer;
};

// ─── Public factory ───────────────────────────────────────────────────────────

export interface ModalDemoResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}

export const createModalDemo = function(): ModalDemoResult {
  const alertModal   = buildAlertModal();
  const confirmModal = buildConfirmModal();
  const formModal    = buildFormModal();
  const innerModal   = buildStackedModal();
  const outerModal   = buildStackingModal(innerModal);

  const resultLog = document.createElement('p');
  resultLog.style.cssText = 'margin:12px 0 0;font-size:12px;color:#94a3b8;min-height:18px;font-family:system-ui,sans-serif;';

  const logResult = (label: string, r: ModalResult<unknown>): void => {
    resultLog.textContent = `${label} → ${JSON.stringify(r)}`;
  };

  const container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

  row.appendChild(
    triggerBtn('Alert modal', async () => {
      logResult('alert', await alertModal.open());
    })
  );
  row.appendChild(
    triggerBtn('Confirm modal', async () => {
      logResult('confirm', await confirmModal.open());
    })
  );
  row.appendChild(
    triggerBtn('Form modal', async () => {
      logResult('form', await formModal.open());
    })
  );
  row.appendChild(
    triggerBtn('Stacked modals', async () => {
      logResult('outer', await outerModal.open());
    })
  );

  container.appendChild(row);
  container.appendChild(resultLog);

  return {
    element: container,
    cleanup: {
      destroy: () => {
        [alertModal, confirmModal, formModal, innerModal, outerModal].forEach(m => {
          if (m.parentNode) m.parentNode.removeChild(m);
        });
      },
    },
  };
};
