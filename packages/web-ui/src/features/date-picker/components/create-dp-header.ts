import type { DpContext }    from '../dp-context.js';
import { createDpSwitch }    from './create-dp-switch.js';
import type { DpSwitchResult } from './create-dp-switch.js';

export interface DpHeaderResult {
  element: HTMLDivElement;
  destroy: () => void;
}

const ICON_PREV = '‹';
const ICON_NEXT = '›';

const navBtn = function(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.textContent = icon;
  btn.className = [
    'dp-nav', 'w-7', 'h-7', 'flex', 'items-center', 'justify-center',
    'rounded', 'hover:bg-gray-100', 'text-lg', 'font-bold',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-400', 'transition-colors',
  ].join(' ');
  btn.addEventListener('click', onClick);
  return btn;
};

export const createDpHeader = function(ctx: DpContext): DpHeaderResult {
  const el = document.createElement('div');
  el.className = 'dp-header flex items-center justify-between px-2 py-1 select-none';

  const prevBtn = navBtn(ICON_PREV, 'Previous', () => ctx.navigatePrev());
  const nextBtn = navBtn(ICON_NEXT, 'Next',     () => ctx.navigateNext());

  let sw: DpSwitchResult | null = createDpSwitch(ctx);

  el.appendChild(prevBtn);
  el.appendChild(sw.element);
  el.appendChild(nextBtn);

  const destroy = (): void => {
    sw?.destroy();
    sw = null;
    prevBtn.replaceWith(prevBtn.cloneNode(true));
    nextBtn.replaceWith(nextBtn.cloneNode(true));
  };

  return { element: el, destroy };
};
