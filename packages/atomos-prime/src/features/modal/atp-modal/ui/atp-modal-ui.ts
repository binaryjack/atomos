import { atpModalStyle } from '../style/atp-modal.style.js';

export const createAtpModalTemplate = (): HTMLTemplateElement => {
    const template = document.createElement('template');
    template.innerHTML = `
        <style>${atpModalStyle}</style>
        <div class="backdrop" part="backdrop"></div>
        <div class="wrapper" part="wrapper">
          <div class="dialog spotlight-border" role="dialog" aria-modal="true" part="dialog">
            <slot name="header"></slot>
            <div class="body" part="body"><slot></slot></div>
            <slot name="footer"></slot>
          </div>
        </div>
    `;
    return template;
};

export interface AtpModalDOM {
    backdrop: HTMLElement;
    wrapper: HTMLElement;
    dialog: HTMLElement;
}

export const attachAtpModalUI = (shadow: ShadowRoot, template: HTMLTemplateElement): AtpModalDOM => {
    shadow.appendChild(template.content.cloneNode(true));
    
    const dialog = shadow.querySelector('.dialog') as HTMLElement;
    
    // Spotlight effect logic
    dialog.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = dialog.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        dialog.style.setProperty('--mouse-x', `${x}px`);
        dialog.style.setProperty('--mouse-y', `${y}px`);
    });

    return {
        backdrop: shadow.querySelector('.backdrop') as HTMLElement,
        wrapper: shadow.querySelector('.wrapper') as HTMLElement,
        dialog
    };
};
