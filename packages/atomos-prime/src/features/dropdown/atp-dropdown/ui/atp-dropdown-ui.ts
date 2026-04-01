import { atpDropdownStyle } from '../style/atp-dropdown-style.js';

export const createAtpDropdownTemplate = (): HTMLTemplateElement => {
    const template = document.createElement('template');
    template.innerHTML = `
        <style>${atpDropdownStyle}</style>
        <div class="dropdown-wrapper">
            <select id="inner-select" part="select">
                <slot></slot>
            </select>
        </div>
    `;
    return template;
};

export interface AtpDropdownDOM {
    select: HTMLSelectElement;
}

export const attachAtpDropdownUI = (shadow: ShadowRoot, template: HTMLTemplateElement): AtpDropdownDOM => {
    shadow.appendChild(template.content.cloneNode(true));
    return {
        select: shadow.getElementById('inner-select') as HTMLSelectElement
    };
};
