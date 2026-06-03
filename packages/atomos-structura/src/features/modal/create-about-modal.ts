import { APP_VERSION } from '../../version.js';

/**
 * Mounts a lightweight About modal into `container` and returns a cleanup
 * function that removes it.  Uses inline styles to avoid any dependency on
 * the design-system token set — it must render correctly even when run
 * inside a plain HTML page or a VS Code webview that has no CSS loaded.
 */
export const createAboutModal = (container: HTMLElement): (() => void) => {
  const version = APP_VERSION;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = [
    'position:fixed;inset:0;z-index:9999;',
    'display:flex;align-items:center;justify-content:center;',
    'background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);',
  ].join('');

  const dialog = document.createElement('div');
  dialog.style.cssText = [
    'background:var(--vbs-bg-panel,#111111);',
    'border:1px solid var(--vbs-border,#27272a);',
    'border-radius:var(--vbs-radius,8px);',
    'box-shadow:0 25px 60px rgba(0,0,0,0.65);',
    'padding:28px 32px;min-width:320px;max-width:440px;',
    'color:var(--vbs-text-primary,#f4f4f5);',
    'font-family:system-ui,sans-serif;',
  ].join('');

  const title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 4px;font-size:18px;font-weight:600;letter-spacing:-0.01em;';
  title.textContent = '@atomos/structura';

  const versionBadge = document.createElement('p');
  versionBadge.style.cssText = 'margin:0 0 16px;font-size:12px;font-family:monospace;color:var(--vbs-text-secondary,#a1a1aa);';
  versionBadge.textContent = `v${version}`;

  const license = document.createElement('p');
  license.style.cssText = 'margin:0 0 20px;font-size:13px;line-height:1.6;color:var(--vbs-text-secondary,#a1a1aa);';
  license.textContent = 'Released under the MIT License.';

  const links = document.createElement('div');
  links.style.cssText = 'display:flex;gap:12px;margin-bottom:24px;';

  const makeLink = (label: string, href: string): HTMLAnchorElement => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.style.cssText = [
      'font-size:13px;color:var(--vbs-primary,#3b82f6);',
      'text-decoration:none;',
    ].join('');
    a.onmouseover = () => { a.style.textDecoration = 'underline'; };
    a.onmouseout  = () => { a.style.textDecoration = 'none'; };
    return a;
  };

  links.appendChild(makeLink('Documentation', 'https://www.npmjs.com/package/@atomos/structura'));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = [
    'width:100%;padding:8px 0;border:none;border-radius:var(--vbs-radius,4px);',
    'background:var(--vbs-primary,#3b82f6);color:#fff;font-size:14px;font-weight:500;',
    'cursor:pointer;transition:opacity 0.15s;',
  ].join('');
  closeBtn.onmouseover = () => { closeBtn.style.opacity = '0.85'; };
  closeBtn.onmouseout  = () => { closeBtn.style.opacity = '1'; };

  const destroy = (): void => { container.removeChild(backdrop); };

  closeBtn.onclick = destroy;
  backdrop.onclick = (e) => { if (e.target === backdrop) destroy(); };

  dialog.appendChild(title);
  dialog.appendChild(versionBadge);
  dialog.appendChild(license);
  dialog.appendChild(links);
  dialog.appendChild(closeBtn);
  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

  return destroy;
};
