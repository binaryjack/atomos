import { createModalDemo } from '../features/modal/create-modal-demo.js';

export const createModalPage = function() {
  const cleanups: Array<() => void> = [];

  const root = document.createElement('div');
  root.style.cssText = [
    'min-height:100vh',
    'background:var(--vbs-bg-input, #09090b)',
    'color:#f1f5f9',
    'font-family:system-ui,sans-serif',
    'padding-top:40px',
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:900px;margin:0 auto;padding:48px 24px;';

  // ── Page heading ────────────────────────────────────────────────────────────
  const heading = document.createElement('div');
  heading.style.cssText = 'margin-bottom:40px;';
  heading.innerHTML = `
    <h1 style="font-size:28px;font-weight:700;color:#f1f5f9;margin:0 0 8px;">Modal</h1>
    <p style="margin:0;color:var(--vbs-text-secondary, #a1a1aa);font-size:15px;line-height:1.6;">
      Agnostic &lt;atp-modal&gt; web component — Shadow DOM, stacking, animations,
      Promise-based <code style="background:var(--vbs-bg-panel, #111111);padding:1px 5px;border-radius: var(--vbs-radius, 2px);font-size:13px;">open()</code>
      + <code style="background:var(--vbs-bg-panel, #111111);padding:1px 5px;border-radius: var(--vbs-radius, 2px);font-size:13px;">atp-modal-closed</code> event.
    </p>
  `;
  inner.appendChild(heading);

  // ── Demos ───────────────────────────────────────────────────────────────────
  const demos: Array<{ label: string; desc: string; id: string }> = [
    { label: 'Alert',   id: 'demo-alert',   desc: 'Simple informational modal — OK button or ESC / click-outside to dismiss.' },
    { label: 'Confirm', id: 'demo-confirm', desc: 'Destructive action confirmation with Cancel + Delete buttons. Returns the chosen value.' },
    { label: 'Form',    id: 'demo-form',    desc: 'Wider modal containing input fields. Uses --atp-modal-width CSS custom property.' },
    { label: 'Stacked', id: 'demo-stacked', desc: 'Two modals open simultaneously. ESC and click-outside only affect the top-most one.' },
  ];

  // ── Usage block ─────────────────────────────────────────────────────────────
  const usageSection = section('Usage');
  const code = document.createElement('pre');
  code.style.cssText = [
    'background:var(--vbs-bg-panel, #111111)',
    'border:1px solid var(--vbs-border, #27272a)',
    'border-radius: var(--vbs-radius, 2px)',
    'padding:20px',
    'font-size:13px',
    'font-family:JetBrains Mono,Monaco,monospace',
    'color:var(--vbs-text-primary, #f4f4f5)',
    'overflow-x:auto',
    'line-height:1.7',
    'margin:0',
  ].join(';');
  code.textContent = `<!-- Declarative -->
<atp-modal id="my-modal">
  <atp-modal-header slot="header">Settings</atp-modal-header>
  <p>Any content here — no framework needed.</p>
  <atp-modal-footer slot="footer">
    <button onclick="document.getElementById('my-modal').close()">Cancel</button>
    <button onclick="document.getElementById('my-modal').close({ saved: true })">Save</button>
  </atp-modal-footer>
</atp-modal>

<!-- Programmatic (returns Promise) -->
const result = await modal.open<{ saved: boolean }>();
// result: { value: { saved: true }, cancelled: false }

<!-- CSS custom property -->
<atp-modal style="--atp-modal-width: 640px"> … </atp-modal>`;
  usageSection.appendChild(code);
  inner.appendChild(usageSection);

  // ── Events / API block ───────────────────────────────────────────────────────
  const apiSection = section('API');
  const apiGrid = document.createElement('div');
  apiGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;';

  apiGrid.appendChild(apiCard('open<T>(options?)', 'Returns Promise<ModalResult<T>>. Opens the modal, adds it to the z-index stack.'));
  apiGrid.appendChild(apiCard('close(value?)', 'Closes the modal. With a value → { value, cancelled:false }. Without → { value:undefined, cancelled:true }.'));
  apiGrid.appendChild(apiCard('atp-modal-opened', 'CustomEvent fired after the open animation completes.'));
  apiGrid.appendChild(apiCard('atp-modal-closed', 'CustomEvent fired after close animation. detail: ModalResult<unknown>.'));
  apiGrid.appendChild(apiCard('atp-modal-close-request', 'Bubbles up from <atp-modal-header> close button. AtpModal catches it and calls close().'));
  apiGrid.appendChild(apiCard('--atp-modal-width', 'CSS custom property. Default: 480px.'));

  apiSection.appendChild(apiGrid);
  inner.appendChild(apiSection);

  // ── Live demo section ────────────────────────────────────────────────────────
  const liveSection = section('Live demos');
  const liveDesc = document.createElement('p');
  liveDesc.style.cssText = 'color:var(--vbs-text-secondary, #a1a1aa);font-size:14px;margin:0 0 20px;';
  liveDesc.textContent = 'The result of each open() call is logged below the buttons.';
  liveSection.appendChild(liveDesc);

  const modalDemo = createModalDemo();
  cleanups.push(modalDemo.cleanup.destroy);
  liveSection.appendChild(modalDemo.element);
  inner.appendChild(liveSection);

  // ── Variant cards ────────────────────────────────────────────────────────────
  const variantsSection = section('Variants');
  const variantsGrid = document.createElement('div');
  variantsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;';
  demos.forEach(d => {
    const card = document.createElement('div');
    card.style.cssText = [
      'background:var(--vbs-bg-panel, #111111)',
      'border:1px solid var(--vbs-border, #27272a)',
      'border-radius: var(--vbs-radius, 2px)',
      'padding:16px',
    ].join(';');
    card.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:4px;">${d.label}</div>
      <div style="font-size:12px;color:var(--vbs-text-secondary, #a1a1aa);line-height:1.5;">${d.desc}</div>
    `;
    variantsGrid.appendChild(card);
  });
  variantsSection.appendChild(variantsGrid);
  inner.appendChild(variantsSection);

  root.appendChild(inner);

  return {
    element: root,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};

// ── Local helpers ─────────────────────────────────────────────────────────────

const section = (title: string): HTMLElement => {
  const el = document.createElement('div');
  el.style.cssText = 'margin-bottom:40px;';

  const h = document.createElement('h2');
  h.textContent = title;
  h.style.cssText = [
    'font-size:18px',
    'font-weight:600',
    'color:#f1f5f9',
    'margin:0 0 16px',
    'padding-bottom:8px',
    'border-bottom:1px solid var(--vbs-bg-panel, #111111)',
  ].join(';');
  el.appendChild(h);
  return el;
};

const apiCard = (label: string, desc: string): HTMLElement => {
  const el = document.createElement('div');
  el.style.cssText = [
    'background:var(--vbs-bg-panel, #111111)',
    'border:1px solid var(--vbs-border, #27272a)',
    'border-radius: var(--vbs-radius, 2px)',
    'padding:14px 16px',
  ].join(';');
  el.innerHTML = `
    <code style="display:block;font-size:12px;font-weight:600;color:var(--vbs-primary, #3b82f6);font-family:JetBrains Mono,Monaco,monospace;margin-bottom:6px;">${label}</code>
    <p style="margin:0;font-size:12px;color:var(--vbs-text-secondary, #a1a1aa);line-height:1.5;">${desc}</p>
  `;
  return el;
};
