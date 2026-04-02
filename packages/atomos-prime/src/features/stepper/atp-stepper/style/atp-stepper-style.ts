export const atpStepperStyle = `
:host {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

.stepper-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-gray-50, #f9fafb);
    padding: 1rem;
}

.stepper-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    position: relative;
    padding: 2rem;
    flex: 1;
}

.stepper-footer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--bg-white, #ffffff);
    border-top: 1px solid var(--border-color, #e5e7eb);
}

.btn {
    padding: 0.5rem 1rem;
    border-radius: var(--vbs-radius, 2px);
    cursor: pointer;
    font-weight: 500;
    border: 1px solid transparent;
}

.btn-back {
    background-color: var(--bg-gray-200, #e5e7eb);
    color: var(--text-gray-800, #1f2937);
}

.btn-back:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-next {
    background-color: var(--bg-primary, #3b82f6);
    color: white;
    border-color: var(--border-primary, #2563eb);
}
`;
