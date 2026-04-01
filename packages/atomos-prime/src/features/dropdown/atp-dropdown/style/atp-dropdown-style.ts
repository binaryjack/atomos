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
    box-sizing: border-box;
    padding: var(--dropdown-padding, 0.5rem 0.75rem);
    color: var(--dropdown-text-color, inherit);
    background-color: var(--dropdown-bg-color, transparent);
    border: 1px solid var(--dropdown-border-color, #d1d5db);
    border-radius: var(--dropdown-border-radius, 0.375rem);
    font-size: var(--dropdown-font-size, 1rem);
    line-height: var(--dropdown-line-height, 1.5);
    outline: none;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    appearance: none; /* Can be stylized via variables */
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
