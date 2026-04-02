export const atpDropdownStyle = `
:host {
    display: block;
    width: 100%;
    position: relative;
    box-sizing: border-box;
    font-family: inherit;
}

select {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: var(--dropdown-padding, 0 20px 0 6px);
    color: var(--dropdown-text-color, var(--vbs-text-secondary, #a1a1aa));
    background-color: var(--dropdown-bg-color, var(--vbs-bg-input, #09090b));
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%2371717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>');
    background-repeat: no-repeat;
    background-position: right 4px center;
    background-size: 12px;
    border: 1px solid var(--dropdown-border-color, var(--vbs-border, #27272a));
    border-radius: var(--dropdown-border-radius, var(--vbs-radius, 2px));
    font-size: var(--dropdown-font-size, 12px);
    line-height: var(--dropdown-line-height, 1.4);
    outline: none;
    transition: border-color 0.15s ease-in-out;
    appearance: none;
    cursor: pointer;
}

select:focus {
    border-color: var(--dropdown-focus-border-color, var(--vbs-primary, #3b82f6));
    box-shadow: 0 0 0 1px var(--dropdown-focus-border-color, var(--vbs-primary, #3b82f6));
}

select:disabled {
    background-color: var(--dropdown-disabled-bg, #18181b);
    color: var(--dropdown-disabled-text, #52525b);
    cursor: not-allowed;
}
`;
