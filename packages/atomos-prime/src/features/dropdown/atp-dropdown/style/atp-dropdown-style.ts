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
    padding: var(--dropdown-padding, 0.5rem 1.5rem 0.5rem 0.75rem);
    color: var(--dropdown-text-color, inherit);
    background-color: var(--dropdown-bg-color, transparent);
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>');
    background-repeat: no-repeat;
    background-position: right 0.25rem center;
    background-size: 12px;
    border: 1px solid var(--dropdown-border-color, #d1d5db);
    border-radius: var(--dropdown-border-radius, 0.375rem);
    font-size: var(--dropdown-font-size, 1rem);
    line-height: var(--dropdown-line-height, 1.5);
    outline: none;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    appearance: none;
}

select:focus {
    border-color: var(--dropdown-focus-border-color, #3b82f6);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

select:disabled {
    background-color: var(--dropdown-disabled-bg, #f3f4f6);
    color: var(--dropdown-disabled-text, #9ca3af);
    cursor: not-allowed;
}
`;
