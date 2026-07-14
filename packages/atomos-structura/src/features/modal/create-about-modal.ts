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
  backdrop.classList.add('vbs-modal-backdrop');
  // Need to force opacity to 1 because transition needs a tick? No, let's just make it visible immediately or let CSS handle it.
  // Actually the CSS has opacity:0. Let's just set opacity=1 inline, or rely on a setTimeout if we want it to fade in.
  // For simplicity, let's set opacity to 1 so it's visible.
  backdrop.style.opacity = '1';

  const dialog = document.createElement('div');
  dialog.classList.add('vbs-modal-dialog');
  dialog.style.opacity = '1';
  dialog.style.transform = 'scale(1)';

  const title = document.createElement('h2');
  title.classList.add('vbs-modal-title');
  title.textContent = '@atomos-web/structura';

  const versionBadge = document.createElement('p');
  versionBadge.classList.add('vbs-modal-version');
  versionBadge.textContent = `v${version}`;

  const license = document.createElement('p');
  license.classList.add('vbs-modal-license');
  license.textContent = 'Released under the AGPLv3 License.';

  const links = document.createElement('div');
  links.classList.add('vbs-modal-links');

  const makeLink = (label: string, href: string): HTMLAnchorElement => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.classList.add('vbs-modal-link');
    return a;
  };

  links.appendChild(makeLink('Documentation', 'https://www.npmjs.com/package/@atomos-web/structura'));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.classList.add('vbs-modal-close-btn');

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
